"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { and, asc, desc, eq, gt, lt, max } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { DICT_SCHEMES, dictionaries, revisions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { fail, ok, type ActionState } from "@/lib/actions/types";
import { prepareIndex } from "@/lib/dict/prepare";
import {
  completeMultipart,
  createMultipart,
  deleteObject,
  deletePrefix,
  ensureCors,
  fromRef,
  isStorageConfigured,
  presignPart,
  presignPut,
  putObject,
  toRef,
} from "@/lib/storage/neon";
import { DICT_TAG } from "@/lib/dict/engine";
import { slugifyTitle } from "@/lib/hnv/slug";

// Admin › Dictionaries. The browser uploads dictionary files straight to
// Neon Object Storage with presigned URLs (startUploads / finishMultipart);
// addDictionary then builds the search index. Only metadata goes into the
// database.

const Ref = z.string().regex(/^s3:dict\//, "Not a dictionary storage reference.");
const PART = 32 * 1024 * 1024;
const SINGLE_MAX = 64 * 1024 * 1024;

export type UploadPlan =
  | { path: string; key: string; mode: "single"; url: string }
  | { path: string; key: string; mode: "multi"; uploadId: string; partSize: number; urls: string[] };

/** Presigned upload URLs for a batch of files (paths relative to the chosen folder/zip). */
export async function startUploads(batch: string, files: { path: string; size: number }[]): Promise<{ ok: boolean; message?: string; plans?: UploadPlan[] }> {
  await requireUser("editor");
  if (!isStorageConfigured()) return { ok: false, message: "Object storage is not configured on this deployment." };
  if (!/^[a-z0-9-]{4,40}$/.test(batch) || files.length > 40) return { ok: false, message: "Invalid upload batch." };
  const origin = (await headers()).get("origin");
  await ensureCors(
    [...new Set(["https://www.harinamamrta-vyakaranam.com", "https://harinamamrta-vyakaranam.com", "https://harinamamrta-vyakaranam.vercel.app", "http://localhost:3000", ...(origin ? [origin] : [])])]
  );
  const plans: UploadPlan[] = [];
  for (const f of files) {
    const clean = f.path
      .split("/")
      .map((seg) => seg.normalize("NFC").replace(/[^\p{L}\p{N}._ -]+/gu, "_").slice(0, 120))
      .filter(Boolean)
      .join("/");
    const key = `dict/${batch}/${clean}`;
    if (f.size <= SINGLE_MAX) plans.push({ path: f.path, key, mode: "single", url: await presignPut(key) });
    else {
      const uploadId = await createMultipart(key);
      const n = Math.ceil(f.size / PART);
      const urls = await Promise.all(Array.from({ length: n }, (_, i) => presignPart(key, uploadId, i + 1)));
      plans.push({ path: f.path, key, mode: "multi", uploadId, partSize: PART, urls });
    }
  }
  return { ok: true, plans };
}

export async function finishMultipart(key: string, uploadId: string, parts: { n: number; etag: string }[]): Promise<{ ok: boolean; message?: string }> {
  await requireUser("editor");
  if (!key.startsWith("dict/")) return { ok: false, message: "Bad key." };
  try {
    await completeMultipart(key, uploadId, parts);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

const indexPrefixFor = (ifoRef: string) => {
  const key = fromRef(ifoRef)!;
  return `${key.slice(0, key.lastIndexOf("/"))}/index-${Date.now().toString(36)}/`;
};

async function writeShards(prefix: string, shards: Record<string, Buffer>) {
  const entries = Object.entries(shards);
  for (let i = 0; i < entries.length; i += 10) {
    await Promise.all(entries.slice(i, i + 10).map(([c, buf]) => putObject(`${prefix}${c}.json.gz`, buf, "application/gzip")));
  }
}
const Scheme = z.enum(DICT_SCHEMES);

function refresh() {
  revalidateTag(DICT_TAG);
  revalidatePath("/tools/dictionary/search");
}

export type AddResult = { ok: boolean; message: string; duplicate?: boolean; preview?: { raw: string; iast: string }[]; wordCount?: number } | null;

const AddInput = z.object({
  name: z.string().trim().min(1).max(160),
  scheme: Scheme,
  files: z.object({ ifo: Ref, idx: Ref, dict: Ref, syn: Ref.optional() }),
  totalBytes: z.number().int().nonnegative(),
});

export async function addDictionary(input: z.input<typeof AddInput>): Promise<AddResult> {
  const user = await requireUser("editor");
  const p = AddInput.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Invalid upload." };
  const { name, scheme, files, totalBytes } = p.data;
  const db = getDb();
  const dropFiles = () => Promise.all(Object.values(files).map((r) => r && deleteObject(fromRef(r)!).catch(() => {})));
  try {
    const prepared = await prepareIndex(files, scheme);
    // Same dictionary already installed? (same title and word count)
    const existing = await db.select().from(dictionaries);
    const dup = existing.find(
      (d) => (d.info as Record<string, string>).bookname === prepared.info.bookname && d.wordCount === prepared.wordCount
    );
    if (dup) {
      await dropFiles();
      return { ok: true, duplicate: true, message: `Already installed as “${dup.name}” — skipped.` };
    }
    const taken = new Set(existing.map((r) => r.slug));
    let slug = slugifyTitle(name).slice(0, 40) || "dictionary";
    for (let i = 2; taken.has(slug); i++) slug = `${slugifyTitle(name).slice(0, 36)}-${i}`;
    const prefix = indexPrefixFor(files.ifo);
    await writeShards(prefix, prepared.shards);
    const [{ top }] = await db.select({ top: max(dictionaries.sort) }).from(dictionaries);
    const [row] = await db
      .insert(dictionaries)
      .values({
        slug,
        name,
        shortName: name.length > 18 ? name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 6) : name,
        headwordScheme: scheme,
        files,
        indexUrl: toRef(prefix),
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
    const prefix = indexPrefixFor(d.files.ifo);
    await writeShards(prefix, prepared.shards);
    await db
      .update(dictionaries)
      .set({ headwordScheme: scheme.data, indexUrl: toRef(prefix), info: prepared.info, wordCount: prepared.wordCount, updatedBy: user.id })
      .where(eq(dictionaries.id, id));
    const old = fromRef(d.indexUrl);
    if (old) await deletePrefix(old).catch(() => {});
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
  const keys = [d.files.ifo, d.files.idx, d.files.dict, d.files.syn].map((r) => (r ? fromRef(r) : null)).filter((k): k is string => Boolean(k));
  await Promise.all(keys.map((k) => deleteObject(k).catch(() => {})));
  const idx = fromRef(d.indexUrl);
  if (idx) await deletePrefix(idx).catch(() => {});
  refresh();
  return ok(`“${d.name}” and its files were deleted.`);
}

/** Remove uploaded files that didn't form a complete dictionary. */
export async function discardUploads(refs: string[]): Promise<void> {
  await requireUser("editor");
  await Promise.all(
    refs
      .map(fromRef)
      .filter((k): k is string => Boolean(k && k.startsWith("dict/")))
      .map((k) => deleteObject(k).catch(() => {}))
  );
}
