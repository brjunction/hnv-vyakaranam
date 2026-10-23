"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { and, asc, desc, eq, gt, lt, max } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { DICT_SCHEMES, dictSections, dictionaries, revisions } from "@/lib/db/schema";
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
  getObject,
  isStorageConfigured,
  listKeys,
  presignPart,
  presignPut,
  putObject,
  toRef,
} from "@/lib/storage/neon";
import { DICT_TAG, categoryFromRef } from "@/lib/dict/engine";
import { slugifyTitle } from "@/lib/hnv/slug";
import { cleanStoragePath, guessScheme, isJunkPath, sampleIdxBytes } from "@/lib/dict/guess";
import { parseIfo } from "@/lib/dict/stardict";

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
    const key = `dict/${batch}/${cleanStoragePath(f.path)}`;
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
  for (let i = 0; i < entries.length; i += 4) {
    await Promise.all(entries.slice(i, i + 4).map(([c, buf]) => putObject(`${prefix}${c}.json.gz`, buf, "application/gzip")));
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
  try {
    const prepared = await prepareIndex(files, scheme);
    // Same dictionary already installed? (same title and word count)
    const existing = await db.select().from(dictionaries);
    const dup = existing.find(
      (d) => (d.info as Record<string, string>).bookname === prepared.info.bookname && d.wordCount === prepared.wordCount
    );
    if (dup) {
      // Delete only the new copies — never files an installed dictionary uses.
      const inUse = new Set(existing.flatMap((d) => [d.files.ifo, d.files.idx, d.files.dict, d.files.syn]).filter(Boolean));
      await Promise.all(Object.values(files).filter((r) => r && !inUse.has(r)).map((r) => deleteObject(fromRef(r!)!).catch(() => {})));
      return { ok: true, duplicate: true, message: `Already installed as “${dup.name}” — skipped.` };
    }
    const taken = new Set(existing.map((r) => r.slug));
    let slug = slugifyTitle(name).slice(0, 40) || "dictionary";
    for (let i = 2; taken.has(slug); i++) slug = `${slugifyTitle(name).slice(0, 36)}-${i}`;
    const prefix = indexPrefixFor(files.ifo);
    await writeShards(prefix, prepared.shards);
    const [{ top }] = await db.select({ top: max(dictionaries.sort) }).from(dictionaries);
    // The upload folder ("Sanskrit-Hindi", "sa-hi" …) picks the section when it matches one.
    const loose = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
    const folders = files.ifo.replace(/^s3:dict\/[^/]+\//, "").split("/").slice(0, -1).map(loose);
    const secs = await db.select().from(dictSections);
    const section = secs.find((x) => folders.includes(loose(x.name)) || folders.includes(loose(x.key))) ?? null;
    const [row] = await db
      .insert(dictionaries)
      .values({
        slug,
        name,
        shortName: name.length <= 22 ? name : /\s/.test(name) && name.split(/\s+/).length >= 3 ? name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 8) : `${name.slice(0, 20)}…`,
        headwordScheme: scheme,
        // each new file is its own WORK (merge copies later in the admin by giving them the same Work)
        category: name,
        sectionId: section?.id ?? null,
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
  category: z.string().trim().max(80),
  sectionId: z.coerce.number().int().positive().nullable(),
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
    category: form.get("category") ?? "",
    sectionId: form.get("sectionId") ? form.get("sectionId") : null,
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

// ------------------------------------------------- recovery & clean-up ---
const DICT_FILE = /\.(ifo|idx|idx\.gz|idx\.dz|dict|dict\.dz|syn|syn\.dz)$/i;
type Part = "ifo" | "idx" | "dict" | "syn";
export type PendingGroup = { key: string; dir: string; base: string; refs: Partial<Record<Part, string>>; bytes: number };
export type StorageScan = {
  pending: PendingGroup[];
  incomplete: PendingGroup[];
  junk: { count: number; bytes: number };
  usedBytes: number;
};

/** Uploaded files that are not (yet) part of an installed dictionary. */
export async function scanStorage(): Promise<StorageScan> {
  await requireUser("editor");
  const db = getDb();
  const [objects, rows] = await Promise.all([listKeys("dict/"), db.select().from(dictionaries)]);
  const used = new Set<string>();
  const indexPrefixes = new Set<string>();
  for (const d of rows) {
    for (const r of [d.files.ifo, d.files.idx, d.files.dict, d.files.syn]) if (r) used.add(fromRef(r) ?? r);
    const ip = fromRef(d.indexUrl);
    if (ip) indexPrefixes.add(ip);
  }
  const groups = new Map<string, PendingGroup>();
  const junk = { count: 0, bytes: 0 };
  for (const o of objects) {
    if (used.has(o.key)) continue;
    if ([...indexPrefixes].some((p) => o.key.startsWith(p))) continue;
    const m = o.key.match(DICT_FILE);
    if (isJunkPath(o.key) || /\/index-[a-z0-9]+\//.test(o.key) || !m) {
      junk.count++;
      junk.bytes += o.size;
      continue;
    }
    const slash = o.key.lastIndexOf("/");
    const dir = o.key.slice(0, slash);
    const base = o.key.slice(slash + 1, -m[0].length);
    const ext = m[1].toLowerCase();
    const part: Part = ext === "ifo" ? "ifo" : ext.startsWith("idx") ? "idx" : ext.startsWith("dict") ? "dict" : "syn";
    const gk = `${dir}/${base}`;
    const g = groups.get(gk) ?? { key: gk, dir: dir.replace(/^dict\/[^/]+\/?/, ""), base, refs: {}, bytes: 0 };
    g.refs[part] = toRef(o.key);
    g.bytes += o.size;
    groups.set(gk, g);
  }
  const all = [...groups.values()];
  return {
    pending: all.filter((g) => g.refs.ifo && g.refs.idx && g.refs.dict),
    incomplete: all.filter((g) => !(g.refs.ifo && g.refs.idx && g.refs.dict)),
    junk,
    usedBytes: objects.reduce((n, o) => n + o.size, 0),
  };
}

/** Add one dictionary whose files are already in storage (no re-upload). */
export async function addUploaded(group: PendingGroup): Promise<AddResult> {
  await requireUser("editor");
  const refs = group.refs;
  if (!refs.ifo || !refs.idx || !refs.dict) return { ok: false, message: "Incomplete dictionary." };
  try {
    const info = parseIfo((await getObject(fromRef(refs.ifo)!)).buf.toString("utf8"));
    const head = (await getObject(fromRef(refs.idx)!, 0, 16383)).buf;
    const scheme = guessScheme(`${group.dir} ${group.base} ${info.bookname ?? ""}`, sampleIdxBytes(new Uint8Array(head)));
    return await addDictionary({
      name: info.bookname || group.base,
      scheme,
      files: { ifo: refs.ifo, idx: refs.idx, dict: refs.dict, ...(refs.syn ? { syn: refs.syn } : {}) },
      totalBytes: group.bytes,
    });
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/** Delete leftovers: macOS metadata, incomplete sets, unused index pieces. */
export async function cleanStorage(): Promise<{ ok: boolean; message: string }> {
  await requireUser("editor");
  const scan = await scanStorage();
  const db = getDb();
  const rows = await db.select().from(dictionaries);
  const keep = new Set<string>();
  const keepPrefixes: string[] = [];
  for (const d of rows) {
    for (const r of [d.files.ifo, d.files.idx, d.files.dict, d.files.syn]) if (r) keep.add(fromRef(r) ?? r);
    const ip = fromRef(d.indexUrl);
    if (ip) keepPrefixes.push(ip);
  }
  const pendingKeys = new Set(scan.pending.flatMap((g) => Object.values(g.refs).map((r) => fromRef(r!)!)));
  const objects = await listKeys("dict/");
  const doomed = objects.filter((o) => !keep.has(o.key) && !pendingKeys.has(o.key) && !keepPrefixes.some((p) => o.key.startsWith(p)));
  for (let i = 0; i < doomed.length; i += 20) await Promise.all(doomed.slice(i, i + 20).map((o) => deleteObject(o.key).catch(() => {})));
  const mb = doomed.reduce((n, o) => n + o.size, 0) / 1048576;
  return { ok: true, message: `Removed ${doomed.length} leftover files (${mb.toFixed(1)} MB).` };
}

export type ExistingUploads = {
  /** cleaned relative path → stored file */
  files: Record<string, { ref: string; size: number }>;
  /** .ifo refs of installed dictionaries */
  installed: string[];
};

/** Files already in storage, so a re-run of the same folder doesn't upload them again. */
export async function existingUploads(): Promise<ExistingUploads> {
  await requireUser("editor");
  const [objects, rows] = await Promise.all([listKeys("dict/"), getDb().select().from(dictionaries)]);
  const inUse = new Set(rows.flatMap((d) => [d.files.ifo, d.files.idx, d.files.dict, d.files.syn]).filter(Boolean) as string[]);
  const files: ExistingUploads["files"] = {};
  for (const o of objects) {
    if (isJunkPath(o.key) || /\/index-[a-z0-9]+\//.test(o.key) || !DICT_FILE.test(o.key)) continue;
    const rel = o.key.replace(/^dict\/[^/]+\//, "");
    const ref = toRef(o.key);
    const prev = files[rel];
    // prefer the copy an installed dictionary already uses
    if (!prev || (inUse.has(ref) && !inUse.has(prev.ref))) files[rel] = { ref, size: o.size };
  }
  return { files, installed: rows.map((d) => d.files.ifo) };
}

// ------------------------------------------------------------ sections ---
const SectionIn = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1, "Give the section a name.").max(80),
  description: z.string().trim().max(300),
});

export async function saveDictSection(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const p = SectionIn.safeParse({ id: form.get("id") || undefined, name: form.get("name"), description: form.get("description") ?? "" });
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the form.");
  const db = getDb();
  if (p.data.id) {
    await db.update(dictSections).set({ name: p.data.name, description: p.data.description }).where(eq(dictSections.id, p.data.id));
  } else {
    const all = await db.select({ key: dictSections.key, sort: dictSections.sort }).from(dictSections);
    const base = slugifyTitle(p.data.name) || "section";
    let key = base;
    for (let i = 2; all.some((x) => x.key === key); i++) key = `${base}-${i}`;
    await db.insert(dictSections).values({ key, name: p.data.name, description: p.data.description, sort: Math.max(0, ...all.map((x) => x.sort)) + 10 });
  }
  refresh();
  revalidatePath("/admin/dictionaries");
  return ok(p.data.id ? "Section saved." : "Section added.");
}

export async function deleteDictSection(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = z.coerce.number().int().positive().parse(form.get("id"));
  await getDb().delete(dictSections).where(eq(dictSections.id, id)); // its dictionaries become “not in a section”
  refresh();
  revalidatePath("/admin/dictionaries");
  return ok("Section deleted — its dictionaries are now unsorted.");
}

const LayoutIn = z.object({
  sections: z.array(z.coerce.number().int().positive()).max(100),
  /** section id (0 = not in a section) → dictionary ids in order */
  dicts: z.array(z.object({ sectionId: z.number().int().min(0), ids: z.array(z.number().int().positive()).max(1000) })).max(101),
});

/** Saves the order of sections and of dictionaries within them, after a drag in the admin. */
export async function saveDictLayout(input: z.input<typeof LayoutIn>): Promise<{ ok: boolean; message: string }> {
  await requireUser("editor");
  const p = LayoutIn.safeParse(input);
  if (!p.success) return { ok: false, message: "Could not save the order." };
  const db = getDb();
  const ops = [
    ...p.data.sections.map((id, i) => db.update(dictSections).set({ sort: (i + 1) * 10 }).where(eq(dictSections.id, id))),
    ...p.data.dicts.flatMap((g) =>
      g.ids.map((id, i) => db.update(dictionaries).set({ sectionId: g.sectionId || null, sort: (i + 1) * 10 }).where(eq(dictionaries.id, id)))
    ),
  ];
  for (let i = 0; i < ops.length; i += 80) await db.batch(ops.slice(i, i + 80) as never);
  refresh();
  return { ok: true, message: "Order saved." };
}

/** Quick on/off from the board. */
export async function setDictionaryEnabled(id: number, on: boolean): Promise<{ ok: boolean }> {
  const user = await requireUser("editor");
  await getDb().update(dictionaries).set({ isEnabled: on, updatedBy: user.id }).where(eq(dictionaries.id, z.number().int().positive().parse(id)));
  refresh();
  return { ok: true };
}
