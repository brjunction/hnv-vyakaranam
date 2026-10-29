"use server";

import { z } from "zod";
import { and, eq, inArray, like } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { commentaryTypes, editions, revisions, sutraCommentaries, sutras } from "@/lib/db/schema";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { revalidateHnv } from "@/lib/actions/revalidate";
import { sanitizeRich } from "@/lib/html/sanitize";
import { exactKey, similarity } from "@/lib/hnv/pdf-sutras";

// Admin › Chapters & sūtras › Import from PDF. The browser reads the PDF and
// sends the parsed sūtras here in small batches. A batch is first run as a
// dry run (nothing is written; the result says what would change), then for
// real. Every write is logged in `revisions`, so any change can be undone
// from the sūtra's history.

const COMMENTARY = {
  intro: { name: "Introduction", sort: 1 },
  amrta: { name: "Amṛta", sort: 5 },
  samsodhini: { name: "Saṁśodhinī", sort: 10 },
  bala: { name: "Bāla", sort: 15 },
} as const;
type CKey = keyof typeof COMMENTARY;

const Html = z.string().max(600_000);
const Item = z.object({
  number: z.string().trim().min(1).max(20).regex(/^[0-9.]+$/),
  sutra: z.string().max(4000),
  synonyms: Html,
  translation: Html,
  vrtti: Html,
  commentaries: z.array(z.object({ key: z.enum(["intro", "amrta", "samsodhini", "bala"]), html: Html })).max(8),
  pages: z.tuple([z.number().int(), z.number().int()]),
});
const Batch = z.object({
  edition: z.string().trim().min(1).max(40),
  dryRun: z.boolean(),
  /** also replace text that is already in the database (otherwise only empty fields are filled) */
  replace: z.boolean(),
  fields: z.object({ sutra: z.boolean(), synonyms: z.boolean(), translation: z.boolean(), vrtti: z.boolean(), commentaries: z.boolean() }),
  items: z.array(Item).min(1).max(25),
});
export type PdfImportBatch = z.input<typeof Batch>;

export type FieldChange = "fill" | "replace" | "same" | "keep";
export type ItemResult = {
  number: string;
  /** the sūtra it was matched to (verses are matched by their text) */
  dbNumber: string | null;
  error?: string;
  sutra?: { from: string; to: string; change: FieldChange };
  fields: Partial<Record<"synonyms" | "translation" | "vrtti", FieldChange>>;
  commentaries: Partial<Record<CKey, FieldChange>>;
};
export type BatchResult = { ok: boolean; message?: string; results: ItemResult[] };

async function log(user: SessionUser, entityTable: string, entityId: number, action: "create" | "update", before: unknown, after: unknown) {
  await getDb().insert(revisions).values({ entityTable, entityId, action, before, after, userId: user.id, note: "Imported from the PDF" });
}

/** What would happen to a field: the PDF value vs. the stored one. */
function decide(pdf: string, db: string, replace: boolean): FieldChange {
  if (!pdf.trim()) return "keep";
  if (!db.trim()) return "fill";
  if (pdf.trim() === db.trim()) return "same";
  return replace ? "replace" : "keep";
}

export async function importPdfBatch(input: PdfImportBatch): Promise<BatchResult> {
  const user = await requireUser("editor");
  const parsed = Batch.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid data.", results: [] };
  const { edition, dryRun, replace, fields, items } = parsed.data;
  const db = getDb();
  const [ed] = await db.select().from(editions).where(eq(editions.slug, edition)).limit(1);
  if (!ed) return { ok: false, message: `There is no edition “${edition}”.`, results: [] };

  // the sūtras of this batch (verses "0.x.y" are matched by text among 0.x.*)
  const plain = items.filter((i) => !i.number.startsWith("0."));
  const rows = plain.length
    ? await db.select().from(sutras).where(and(eq(sutras.editionId, ed.id), inArray(sutras.number, plain.map((i) => i.number))))
    : [];
  const versePrefixes = [...new Set(items.filter((i) => i.number.startsWith("0.")).map((i) => i.number.split(".").slice(0, 2).join(".")))];
  const verseRows = versePrefixes.length
    ? (await Promise.all(versePrefixes.map((p) => db.select().from(sutras).where(and(eq(sutras.editionId, ed.id), like(sutras.number, `${p}.%`)))))).flat()
    : [];

  // commentary types (created on the first real import)
  let types = await db.select().from(commentaryTypes).where(eq(commentaryTypes.editionId, ed.id));
  const wanted = new Set(items.flatMap((i) => i.commentaries.map((c) => c.key)));
  if (!dryRun && fields.commentaries) {
    for (const key of wanted) {
      if (types.some((t) => t.key === key)) continue;
      const [t] = await db
        .insert(commentaryTypes)
        .values({ editionId: ed.id, key, name: COMMENTARY[key].name, sort: COMMENTARY[key].sort, updatedBy: user.id })
        .returning();
      await log(user, "commentary_types", t.id, "create", null, t);
      types = [...types, t];
    }
  }
  const typeIds = types.filter((t) => t.key in COMMENTARY).map((t) => t.id);

  const usedVerse = new Set<number>();
  const results: ItemResult[] = [];
  for (const it of items) {
    let row = rows.find((r) => r.number === it.number);
    if (it.number.startsWith("0.")) {
      const prefix = it.number.split(".").slice(0, 2).join(".");
      const best = verseRows
        .filter((r) => r.number.startsWith(`${prefix}.`) && !usedVerse.has(r.id))
        .map((r) => ({ r, s: similarity(r.transliteration || r.sanskrit, it.sutra) }))
        .sort((a, b) => b.s - a.s)[0];
      row = best && best.s >= 0.55 ? best.r : undefined;
      if (row) usedVerse.add(row.id);
    }
    const res: ItemResult = { number: it.number, dbNumber: row?.number ?? null, fields: {}, commentaries: {} };
    results.push(res);
    if (!row) {
      res.error = it.number.startsWith("0.") ? "No verse with this text in the database." : "This sūtra number is not in the database.";
      continue;
    }

    // what changes
    const patch: Partial<typeof sutras.$inferInsert> = {};
    if (fields.sutra && it.sutra.trim()) {
      const same = exactKey(row.transliteration) === exactKey(it.sutra);
      const change: FieldChange = same ? "same" : row.transliteration.trim() ? "replace" : "fill";
      res.sutra = { from: row.transliteration, to: it.sutra, change };
      if (!same) {
        patch.transliteration = it.sutra;
        // the Devanagari line is shown from the corrected IAST (one script per column)
        if (row.sanskrit.trim()) patch.sanskrit = "";
      }
    }
    const html = { synonyms: sanitizeRich(it.synonyms), translation: sanitizeRich(it.translation), vrtti: sanitizeRich(it.vrtti) };
    for (const f of ["synonyms", "translation", "vrtti"] as const) {
      if (!fields[f]) continue;
      const d = decide(html[f], row[f], replace);
      res.fields[f] = d;
      if (d === "fill" || d === "replace") patch[f] = html[f];
    }

    const existing = fields.commentaries && typeIds.length
      ? await db.select().from(sutraCommentaries).where(and(eq(sutraCommentaries.sutraId, row.id), inArray(sutraCommentaries.commentaryTypeId, typeIds)))
      : [];
    const comWrites: { key: CKey; html: string; prev?: (typeof existing)[number] }[] = [];
    if (fields.commentaries) {
      for (const c of it.commentaries) {
        const h = sanitizeRich(c.html);
        const type = types.find((t) => t.key === c.key);
        const prev = type ? existing.find((e) => e.commentaryTypeId === type.id) : undefined;
        const d = decide(h, prev?.html ?? "", replace);
        res.commentaries[c.key] = d;
        if (d === "fill" || d === "replace") comWrites.push({ key: c.key, html: h, prev });
      }
    }

    if (dryRun) continue;
    if (Object.keys(patch).length) {
      await db.update(sutras).set({ ...patch, updatedBy: user.id }).where(eq(sutras.id, row.id));
      await log(user, "sutras", row.id, "update", row, { ...row, ...patch });
    }
    for (const w of comWrites) {
      const type = types.find((t) => t.key === w.key);
      if (!type) continue;
      if (w.prev) {
        await db.update(sutraCommentaries).set({ html: w.html, status: "published", updatedBy: user.id }).where(eq(sutraCommentaries.id, w.prev.id));
        await log(user, "sutra_commentaries", w.prev.id, "update", w.prev, { ...w.prev, html: w.html });
      } else {
        const [c] = await db
          .insert(sutraCommentaries)
          .values({ sutraId: row.id, commentaryTypeId: type.id, html: w.html, status: "published", updatedBy: user.id })
          .returning();
        await log(user, "sutra_commentaries", c.id, "create", null, c);
      }
    }
  }
  return { ok: true, results };
}

/** After the last batch: refresh the public pages once. */
export async function finishPdfImport(): Promise<{ ok: boolean }> {
  await requireUser("editor");
  revalidateHnv();
  return { ok: true };
}

/** The sūtras of an edition, for the preview (number → stored IAST text). */
export async function storedSutraTexts(edition: string): Promise<{ ok: boolean; message?: string; sutras: { number: string; text: string }[] }> {
  await requireUser("viewer");
  const db = getDb();
  const [ed] = await db.select().from(editions).where(eq(editions.slug, edition)).limit(1);
  if (!ed) return { ok: false, message: `There is no edition “${edition}”.`, sutras: [] };
  const rows = await db.select({ number: sutras.number, t: sutras.transliteration, s: sutras.sanskrit }).from(sutras).where(eq(sutras.editionId, ed.id));
  return { ok: true, sutras: rows.map((r) => ({ number: r.number, text: r.t || r.s })) };
}
