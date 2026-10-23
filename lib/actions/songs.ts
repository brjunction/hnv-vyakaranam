"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { revisions, songs } from "@/lib/db/schema";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { revalidateSongs } from "@/lib/actions/revalidate";
import { fail, ok, type ActionState } from "@/lib/actions/types";
import { sanitizeRich } from "@/lib/html/sanitize";
import { plainToHtml } from "@/lib/scriptures/sheet";

// Admin writes for the Vaiṣṇava songs (editor and above), logged in `revisions`.

const Id = z.coerce.number().int().positive();
const Plain = (n: number) => z.string().trim().max(n);
const Lang = z.enum(["bengali", "sanskrit", "brajabuli", "hindi", "odia", "other"]);
const Status = z.enum(["draft", "published", "archived"]);
const Url = z
  .string()
  .trim()
  .max(2000)
  .refine((s) => /^https?:\/\//.test(s), "Links must start with https://");

function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "song"
  );
}
function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}
const rich = (h: string | undefined) => {
  const t = (h ?? "").trim();
  if (!t || t === "<p></p>") return "";
  return sanitizeRich(/^\s*</.test(t) ? t : plainToHtml(t));
};
const err = (e: z.ZodError) => fail(e.issues[0]?.message ?? "Check the form.");
async function log(user: SessionUser, id: number, action: "create" | "update" | "delete" | "import", before: unknown, after: unknown, note = "") {
  await getDb().insert(revisions).values({ entityTable: "songs", entityId: id, action, before, after, userId: user.id, note });
}

const VerseIn = z.object({
  text: z.string().max(8000),
  printed: z.string().max(8000).optional(),
  translation: z.string().max(60000).optional(),
  synonyms: z.string().max(60000).optional(),
});
const SongIn = z.object({
  id: Id.optional(),
  title: Plain(200).min(1, "Give the song a title."),
  slug: Plain(80),
  altTitles: Plain(500),
  author: Plain(200),
  book: Plain(200),
  bookPlace: Plain(40),
  kind: Plain(60),
  language: Lang,
  translator: Plain(200),
  introHtml: z.string().max(200000),
  purportHtml: z.string().max(400000),
  verses: z.array(VerseIn).max(300),
  links: z.array(z.object({ label: Plain(80), url: Url })).max(20),
  status: Status,
});

const cleanVerses = (vs: z.infer<typeof VerseIn>[]) =>
  vs
    .map((v) => ({
      text: v.text.replace(/\r/g, "").trim(),
      ...(v.printed?.trim() && { printed: v.printed.replace(/\r/g, "").trim() }),
      ...(rich(v.translation) && { translation: rich(v.translation) }),
      ...(rich(v.synonyms) && { synonyms: rich(v.synonyms) }),
    }))
    .filter((v) => v.text || v.printed || v.translation);

async function uniqueSlug(base: string, selfId?: number) {
  const rows = await getDb().select({ id: songs.id, slug: songs.slug }).from(songs);
  const taken = new Set(rows.filter((r) => r.id !== selfId).map((r) => r.slug));
  if (base === "book") base = "book-song"; // /songs/book/… lists a book
  let s = base;
  for (let n = 2; taken.has(s); n++) s = `${base}-${n}`;
  return s;
}

export async function saveSong(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  let verses: unknown = [];
  let links: unknown = [];
  try {
    verses = JSON.parse(str(form, "verses") || "[]");
    links = JSON.parse(str(form, "links") || "[]");
  } catch {
    return fail("The verses could not be read — please try again.");
  }
  const p = SongIn.safeParse({
    id: str(form, "id") || undefined,
    title: str(form, "title"),
    slug: str(form, "slug"),
    altTitles: str(form, "altTitles"),
    author: str(form, "author"),
    book: str(form, "book"),
    bookPlace: str(form, "bookPlace"),
    kind: str(form, "kind") || "Song",
    language: str(form, "language") || "bengali",
    translator: str(form, "translator"),
    introHtml: str(form, "introHtml"),
    purportHtml: str(form, "purportHtml"),
    verses,
    links: (Array.isArray(links) ? links : []).filter((l: { url?: string }) => l?.url?.trim()),
    status: str(form, "status") || "published",
  });
  if (!p.success) return err(p.error);
  const { id, slug: wanted, ...f } = p.data;
  const values = { ...f, verses: cleanVerses(f.verses), introHtml: rich(f.introHtml), purportHtml: rich(f.purportHtml) };
  const slug = await uniqueSlug(slugify(wanted || f.title), id);
  const db = getDb();
  if (id) {
    const [before] = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
    if (!before) return fail("Not found.");
    await db.update(songs).set({ ...values, slug, updatedBy: user.id }).where(eq(songs.id, id));
    await log(user, id, "update", before, { ...values, slug });
    revalidateSongs();
    return ok("Saved.");
  }
  const [created] = await db.insert(songs).values({ ...values, slug, updatedBy: user.id }).returning();
  await log(user, created.id, "create", null, created);
  revalidateSongs();
  redirect(`/admin/songs/${created.id}?created=1`);
}

export async function deleteSong(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const db = getDb();
  const [s] = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
  if (!s) return fail("Not found.");
  await db.delete(songs).where(eq(songs.id, id));
  await log(user, id, "delete", s, null);
  revalidateSongs();
  redirect("/admin/songs");
}

// ------------------------------------------------- spreadsheet import ---
// One row per verse. Rows with the same Slug (or, when Slug is empty, the
// same Title) make one song; the song's details come from its first row
// that has them. Existing songs (same slug) are updated: details that are
// given replace the old ones, and if any verse text is given the verses
// are replaced as a whole. Empty cells never erase anything.

const RowIn = z.record(z.string(), z.unknown());
export type SongImportReport = { ok: boolean; message: string; created: string[]; updated: string[]; unchanged: number; errors: string[]; dryRun: boolean };

export async function importSongRows(input: { rows: unknown[]; dryRun: boolean }): Promise<SongImportReport> {
  const user = await requireUser("editor");
  const report: SongImportReport = { ok: true, message: "", created: [], updated: [], unchanged: 0, errors: [], dryRun: input.dryRun };
  const parsed = z.array(RowIn).max(20000).safeParse(input.rows);
  if (!parsed.success) return { ...report, ok: false, message: "The sheet is not in the expected shape." };
  const cell = (r: Record<string, unknown>, k: string) => {
    const hit = Object.keys(r).find((x) => x.trim().toLowerCase() === k.toLowerCase());
    const v = hit ? r[hit] : "";
    return v === null || v === undefined ? "" : String(v).trim();
  };
  type G = { slug: string; title: string; meta: Record<string, string>; verses: { n: number; row: number; text: string; printed: string; translation: string; synonyms: string }[] };
  const groups = new Map<string, G>();
  parsed.data.forEach((r, i) => {
    const row = i + 2;
    const title = cell(r, "Title");
    const slugCell = cell(r, "Slug");
    if (!title && !slugCell && !cell(r, "Text")) return;
    const key = slugCell ? slugify(slugCell) : title ? slugify(title) : "";
    if (!key) return void report.errors.push(`Row ${row}: give a Title (or Slug) so the verse knows its song.`);
    const g = groups.get(key) ?? { slug: key, title: "", meta: {}, verses: [] };
    if (title && !g.title) g.title = title;
    for (const [col, k] of [
      ["Other names", "altTitles"],
      ["Author", "author"],
      ["Book", "book"],
      ["Place in book", "bookPlace"],
      ["Type", "kind"],
      ["Language", "language"],
      ["Translator", "translator"],
      ["Status", "status"],
    ] as const) {
      const v = cell(r, col);
      if (v && !g.meta[k]) g.meta[k] = v;
    }
    const text = cell(r, "Text");
    const printed = cell(r, "IAST as printed");
    const translation = cell(r, "Translation");
    const synonyms = cell(r, "Synonyms");
    if (text || printed || translation || synonyms) {
      const n = Number(cell(r, "Verse")) || g.verses.length + 1;
      g.verses.push({ n, row, text, printed, translation, synonyms });
    }
    groups.set(key, g);
  });

  const db = getDb();
  const existing = groups.size ? await db.select().from(songs).where(inArray(songs.slug, [...groups.keys()])) : [];
  const bySlug = new Map(existing.map((s) => [s.slug, s]));
  const langs = new Set(Lang.options);
  const ops: (() => Promise<unknown>)[] = [];
  for (const g of groups.values()) {
    const lang = (g.meta.language ?? "").toLowerCase();
    if (lang && !langs.has(lang as never)) {
      report.errors.push(`Song “${g.title || g.slug}”: Language must be one of ${Lang.options.join(", ")}.`);
      continue;
    }
    const status = (g.meta.status ?? "").toLowerCase();
    if (status && !["published", "draft", "archived"].includes(status)) {
      report.errors.push(`Song “${g.title || g.slug}”: Status must be published, draft or archived.`);
      continue;
    }
    const verses = cleanVerses(g.verses.sort((a, b) => a.n - b.n).map((v) => ({ text: v.text, printed: v.printed, translation: v.translation, synonyms: v.synonyms })));
    const meta = {
      ...(g.title && { title: g.title }),
      ...(g.meta.altTitles && { altTitles: g.meta.altTitles }),
      ...(g.meta.author && { author: g.meta.author }),
      ...(g.meta.book && { book: g.meta.book }),
      ...(g.meta.bookPlace && { bookPlace: g.meta.bookPlace }),
      ...(g.meta.kind && { kind: g.meta.kind }),
      ...(lang && { language: lang as "bengali" }),
      ...(g.meta.translator && { translator: g.meta.translator }),
      ...(status && { status: status as "published" }),
      ...(verses.length && { verses }),
    };
    const ex = bySlug.get(g.slug);
    if (ex) {
      const changed = Object.entries(meta).some(([k, v]) => JSON.stringify(ex[k as keyof typeof ex]) !== JSON.stringify(v));
      if (!changed) {
        report.unchanged++;
        continue;
      }
      report.updated.push(g.title || ex.title);
      ops.push(async () => {
        await db.update(songs).set({ ...meta, updatedBy: user.id }).where(eq(songs.id, ex.id));
        await log(user, ex.id, "import", ex, meta, "spreadsheet upload");
      });
    } else {
      if (!g.title) {
        report.errors.push(`Song “${g.slug}”: a new song needs a Title.`);
        continue;
      }
      report.created.push(g.title);
      ops.push(async () => {
        const [c] = await db
          .insert(songs)
          .values({ title: g.title, slug: g.slug, ...meta, updatedBy: user.id })
          .returning();
        await log(user, c.id, "import", null, c, "spreadsheet upload");
      });
    }
  }
  if (report.errors.length) {
    report.ok = false;
    report.dryRun = true;
    report.message = `Nothing was saved — fix ${report.errors.length} problem${report.errors.length === 1 ? "" : "s"} first.`;
    return report;
  }
  if (!input.dryRun) {
    for (const op of ops) await op();
    revalidateSongs();
  }
  report.message = `${input.dryRun ? "Dry run: would create" : "Created"} ${report.created.length}, ${input.dryRun ? "update" : "updated"} ${report.updated.length}; ${report.unchanged} unchanged.`;
  return report;
}
