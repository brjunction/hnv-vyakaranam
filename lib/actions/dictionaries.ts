"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { put, del } from "@vercel/blob";
import { and, asc, desc, eq, gt, lt, max } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { DICT_SCHEMES, dictionaries, revisions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { fail, ok, type ActionState } from "@/lib/actions/types";
import { prepareIndex } from "@/lib/dict/prepare";
import { DICT_TAG } from "@/lib/dict/engine";
import { slugifyTitle } from "@/lib/hnv/slug";

// Admin › Dictionaries. Files are uploaded by the browser straight to Blob
// (app/api/admin/dict-upload); these actions register them, build the search
// index, and manage the list. Only metadata goes into the database.

const BlobUrl = z.string().url().refine((u) => /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(u), "Not a storage URL.");
const Scheme = z.enum(DICT_SCHEMES);

function refresh() {
  revalidateTag(DICT_TAG);
  revalidatePath("/tools/dictionary/search");
}

export type AddResult = { ok: boolean; message: string; preview?: { raw: string; iast: string }[]; wordCount?: number } | null;

const AddInput = z.object({
  name: z.string().trim().min(1).max(160),
  scheme: Scheme,
  files: z.object({ ifo: BlobUrl, idx: BlobUrl, dict: BlobUrl, syn: BlobUrl.optional() }),
  totalBytes: z.number().int().nonnegative(),
});

export async function addDictionary(input: z.input<typeof AddInput>): Promise<AddResult> {
  const user = await requireUser("editor");
  const p = AddInput.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Invalid upload." };
  const { name, scheme, files, totalBytes } = p.data;
  const db = getDb();
  try {
    const prepared = await prepareIndex(files, scheme);
    const taken = new Set((await db.select({ s: dictionaries.slug }).from(dictionaries)).map((r) => r.s));
    let slug = slugifyTitle(name).slice(0, 40) || "dictionary";
    for (let i = 2; taken.has(slug); i++) slug = `${slugifyTitle(name).slice(0, 36)}-${i}`;
    const blob = await put(`dict/${slug}/index.json.gz`, prepared.gz, { access: "public", addRandomSuffix: true, contentType: "application/gzip" });
    const [{ top }] = await db.select({ top: max(dictionaries.sort) }).from(dictionaries);
    const [row] = await db
      .insert(dictionaries)
      .values({
        slug,
        name,
        shortName: name.length > 18 ? name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 6) : name,
        headwordScheme: scheme,
        files,
        indexUrl: blob.url,
        info: prepared.info,
        wordCount: prepared.wordCount,
        totalBytes,
        sort: (top ?? 0) + 10,
        updatedBy: user.id,
      })
      .returning();
    await db.insert(revisions).values({ entityTable: "dictionaries", entityId: row.id, action: "create", after: row, userId: user.id });
    refresh();
    return {
      ok: true,
      message: `Added “${name}” — ${prepared.wordCount.toLocaleString()} headwords${prepared.synCount ? ` and ${prepared.synCount.toLocaleString()} synonyms` : ""}.`,
      preview: prepared.preview,
      wordCount: prepared.wordCount,
    };
  } catch (err) {
    console.error("[addDictionary]", err);
    return { ok: false, message: `Could not read the dictionary: ${(err as Error).message}` };
  }
}

export async function reprocessDictionary(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Number(form.get("id"));
  const scheme = Scheme.safeParse(form.get("scheme"));
  if (!scheme.success) return fail("Pick how the headwords are written.");
  const db = getDb();
  const [d] = await db.select().from(dictionaries).where(eq(dictionaries.id, id)).limit(1);
  if (!d) return fail("That dictionary no longer exists.");
  try {
    const prepared = await prepareIndex(d.files, scheme.data);
    const blob = await put(`dict/${d.slug}/index.json.gz`, prepared.gz, { access: "public", addRandomSuffix: true, contentType: "application/gzip" });
    await db
      .update(dictionaries)
      .set({ headwordScheme: scheme.data, indexUrl: blob.url, info: prepared.info, wordCount: prepared.wordCount, updatedBy: user.id })
      .where(eq(dictionaries.id, id));
    if (d.indexUrl) await del(d.indexUrl).catch(() => {});
    refresh();
    const sample = prepared.preview.slice(0, 5).map((x) => `${x.raw} → ${x.iast}`).join(" · ");
    return ok(`Prepared again: ${prepared.wordCount.toLocaleString()} headwords. Sample: ${sample}`);
  } catch (err) {
    return fail(`Could not prepare it: ${(err as Error).message}`);
  }
}

const MetaInput = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(160),
  shortName: z.string().trim().max(24),
  description: z.string().trim().max(1000),
  source: z.string().trim().max(500),
  isEnabled: z.boolean(),
});

export async function updateDictionary(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const p = MetaInput.safeParse({
    id: form.get("id"),
    name: form.get("name"),
    shortName: form.get("shortName") ?? "",
    description: form.get("description") ?? "",
    source: form.get("source") ?? "",
    isEnabled: form.get("isEnabled") === "on",
  });
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the form.");
  const { id, ...fields } = p.data;
  await getDb().update(dictionaries).set({ ...fields, updatedBy: user.id }).where(eq(dictionaries.id, id));
  refresh();
  return ok(fields.isEnabled ? "Saved." : "Saved. It is switched off, so it won't be searched.");
}

export async function moveDictionary(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = Number(form.get("id"));
  const up = form.get("dir") === "up";
  const db = getDb();
  const [d] = await db.select().from(dictionaries).where(eq(dictionaries.id, id)).limit(1);
  if (!d) return fail("Not found.");
  const [o] = await db
    .select()
    .from(dictionaries)
    .where(up ? lt(dictionaries.sort, d.sort) : gt(dictionaries.sort, d.sort))
    .orderBy(up ? desc(dictionaries.sort) : asc(dictionaries.sort))
    .limit(1);
  if (!o) return ok("Already there.");
  await db.batch([
    db.update(dictionaries).set({ sort: o.sort }).where(eq(dictionaries.id, d.id)),
    db.update(dictionaries).set({ sort: d.sort }).where(and(eq(dictionaries.id, o.id))),
  ]);
  refresh();
  return ok("Moved.");
}

export async function deleteDictionary(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Number(form.get("id"));
  const db = getDb();
  const [d] = await db.select().from(dictionaries).where(eq(dictionaries.id, id)).limit(1);
  if (!d) return fail("Not found.");
  await db.delete(dictionaries).where(eq(dictionaries.id, id));
  await db.insert(revisions).values({ entityTable: "dictionaries", entityId: id, action: "delete", before: d, userId: user.id });
  const urls = [d.files.ifo, d.files.idx, d.files.dict, d.files.syn, d.indexUrl].filter((u): u is string => Boolean(u));
  await del(urls).catch(() => {});
  refresh();
  return ok(`“${d.name}” and its files were deleted.`);
}
