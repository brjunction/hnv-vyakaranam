"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray, max, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  audioLinks,
  books,
  dailyItems,
  revisions,
  scriptureCategories,
  scriptureCommentaries,
  scriptureCommentaryTypes,
  scriptureDivisions,
  scriptureVerses,
} from "@/lib/db/schema";
import { hasRole, requireUser, type SessionUser } from "@/lib/auth/session";
import { revalidateDaily, revalidateScriptures } from "@/lib/actions/revalidate";
import { fail, ok, type ActionState } from "@/lib/actions/types";
import { sanitizeRich } from "@/lib/html/sanitize";
import { buildTree } from "@/lib/data/scriptures";
import { findByReference } from "@/lib/data/scripturesAdmin";
import { RESERVED_CODES, composeVerseNo, parseVerseKey } from "@/lib/scriptures/core";
import { plainToHtml } from "@/lib/scriptures/sheet";

// Admin writes for the Scriptures module. Roles (docs/04-admin.md §3):
//   editor/owner — everything (books, structure, verses, commentaries)
//   contributor  — commentary text only, saved as draft
//   viewer       — read only
// Every change is logged in `revisions` and revalidates the public pages.

const Id = z.coerce.number().int().positive();
const Status = z.enum(["draft", "published", "archived"]);
const Plain = (n: number) => z.string().trim().max(n);
const Key = z
  .string()
  .trim()
  .min(1, "Give it a number.")
  .max(20)
  .regex(/^[0-9A-Za-z-]+$/, "Use digits, letters or a hyphen only (e.g. 12 or 16-18).")
  .transform((s) => s.toLowerCase());

function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}
const err = (e: z.ZodError) => fail(e.issues[0]?.message ?? "Check the form.");

async function log(user: SessionUser, entityTable: string, entityId: number, action: "create" | "update" | "delete" | "import", before: unknown, after: unknown, note = "") {
  await getDb().insert(revisions).values({ entityTable, entityId, action, before, after, userId: user.id, note });
}

function range(key: string, fallback: number) {
  const r = parseVerseKey(key);
  if (r) return r;
  const d = key.match(/\d+/);
  const n = d ? parseInt(d[0], 10) : fallback;
  return { from: n, to: n };
}

/** The DISPLAYED numbers of a division and its ancestors (["Ādi", "1"], ["1", "12"]) — used to compose verse numbers. */
async function divisionPath(divisionId: number): Promise<{ path: string[]; bookId: number }> {
  const db = getDb();
  const out: string[] = [];
  let cur: number | null = divisionId;
  let bookId = 0;
  for (let i = 0; cur != null && i < 20; i++) {
    const [d]: { key: string; number: string; parentId: number | null; bookId: number }[] = await db
      .select({ key: scriptureDivisions.key, number: scriptureDivisions.number, parentId: scriptureDivisions.parentId, bookId: scriptureDivisions.bookId })
      .from(scriptureDivisions)
      .where(eq(scriptureDivisions.id, cur))
      .limit(1);
    if (!d) break;
    out.unshift(d.number || d.key);
    bookId = d.bookId;
    cur = d.parentId;
  }
  return { path: out, bookId };
}

// ================================================================ books ===
const LevelList = z
  .string()
  .transform((s) =>
    s
      .split(/[,>→/\n]+/)
      .map((x) => x.trim())
      .filter(Boolean)
  )
  .pipe(z.array(z.string().max(40)).min(1, "Name at least one level (e.g. Chapter).").max(6, "At most 6 levels."));

const BookInput = z.object({
  id: Id.optional(),
  code: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Give the book a short code (used in its web address).")
    .max(16)
    .regex(/^[a-z0-9-]+$/, "The code may use a–z, 0–9 and hyphens only (e.g. sb, bg, cc).")
    .refine((c) => !RESERVED_CODES.includes(c), "That code is reserved — choose another."),
  title: Plain(200).min(1, "The book needs a title."),
  titleDeva: Plain(200),
  tagline: Plain(300),
  description: Plain(3000),
  author: Plain(200),
  abbrev: Plain(12),
  levels: LevelList,
  verseLabel: Plain(30).min(1),
  verseLabelPlural: Plain(30).min(1),
  verseLanguage: z.enum(["sanskrit", "english", "hindi", "bengali", "nepali", "odia", "other"]),
  coverUrl: z.union([z.literal(""), z.string().trim().url().max(1000)]),
  categoryId: z.union([z.literal("").transform(() => null), z.coerce.number().int().positive()]),
  introHtml: z.string().max(400_000).transform(sanitizeRich),
  status: Status,
});

export async function saveBook(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const p = BookInput.safeParse({
    id: str(form, "id") || undefined,
    code: str(form, "code"),
    title: str(form, "title"),
    titleDeva: str(form, "titleDeva"),
    tagline: str(form, "tagline"),
    description: str(form, "description"),
    author: str(form, "author"),
    abbrev: str(form, "abbrev"),
    levels: str(form, "levels") || "Chapter",
    verseLabel: str(form, "verseLabel") || "Verse",
    verseLabelPlural: str(form, "verseLabelPlural") || "Verses",
    verseLanguage: str(form, "verseLanguage") || "sanskrit",
    coverUrl: str(form, "coverUrl"),
    categoryId: str(form, "categoryId"),
    introHtml: str(form, "introHtml"),
    status: str(form, "status") || "published",
  });
  if (!p.success) return err(p.error);
  const { id, ...fields } = p.data;
  const db = getDb();
  const [clash] = await db.select({ id: books.id }).from(books).where(eq(books.code, fields.code)).limit(1);
  if (clash && clash.id !== id) return fail(`Another book already uses the code “${fields.code}”.`);
  const structure = fields.levels.length > 1 ? ("canto_chapter_verse" as const) : ("chapter_verse" as const);

  if (id) {
    const [before] = await db.select().from(books).where(eq(books.id, id)).limit(1);
    if (!before) return fail("That book no longer exists.");
    const [deepest] = await db.select({ d: max(scriptureDivisions.depth) }).from(scriptureDivisions).where(eq(scriptureDivisions.bookId, id));
    if ((deepest?.d ?? -1) >= fields.levels.length)
      return fail(`This book already has divisions ${(deepest?.d ?? 0) + 1} levels deep — keep at least that many level names.`);
    await db.update(books).set({ ...fields, structure }).where(eq(books.id, id));
    await log(user, "books", id, "update", before, { ...before, ...fields });
    revalidateScriptures();
    if (before.code !== fields.code) redirect(`/admin/scriptures/${fields.code}/settings`);
    return ok("Book saved.");
  }
  const [{ top }] = await db.select({ top: max(books.sort) }).from(books);
  const [created] = await db
    .insert(books)
    .values({ ...fields, structure, sort: (top ?? 0) + 10 })
    .returning();
  // Two commentary kinds most books start with; rename or delete them freely.
  await db.insert(scriptureCommentaryTypes).values([
    { bookId: created.id, key: "translation", name: "Translation", language: "english", sort: 10, updatedBy: user.id },
  ]);
  await log(user, "books", created.id, "create", null, created);
  const count = Math.min(Math.max(parseInt(str(form, "generate") || "0", 10) || 0, 0), 500);
  if (count > 0) {
    await db.insert(scriptureDivisions).values(
      Array.from({ length: count }, (_, i) => ({
        bookId: created.id,
        depth: 0,
        key: String(i + 1),
        number: String(i + 1),
        position: (i + 1) * 10,
        updatedBy: user.id,
      }))
    );
  }
  revalidateScriptures();
  redirect(`/admin/scriptures/${created.code}`);
}

export async function moveBook(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const up = str(form, "dir") === "up";
  const db = getDb();
  const list = await db.select({ id: books.id }).from(books).orderBy(asc(books.sort), asc(books.id));
  const i = list.findIndex((b) => b.id === id);
  const j = up ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return ok("");
  [list[i], list[j]] = [list[j], list[i]];
  await db.batch(list.map((b, k) => db.update(books).set({ sort: (k + 1) * 10 }).where(eq(books.id, b.id))) as never);
  revalidateScriptures();
  return ok("Order saved.");
}

export async function deleteBook(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("owner");
  const id = Id.parse(str(form, "id"));
  const db = getDb();
  const [b] = await db.select().from(books).where(eq(books.id, id)).limit(1);
  if (!b) return fail("That book no longer exists.");
  if (str(form, "confirmCode").trim().toLowerCase() !== b.code) return fail(`Type the code “${b.code}” to confirm.`);
  const verseIds = (await db.select({ id: scriptureVerses.id }).from(scriptureVerses).where(eq(scriptureVerses.bookId, id))).map((v) => v.id);
  const divIds = (await db.select({ id: scriptureDivisions.id }).from(scriptureDivisions).where(eq(scriptureDivisions.bookId, id))).map((d) => d.id);
  if (verseIds.length) await db.delete(audioLinks).where(and(eq(audioLinks.entityType, "scripture_verse"), inArray(audioLinks.entityId, verseIds)));
  if (divIds.length) await db.delete(audioLinks).where(and(eq(audioLinks.entityType, "scripture_division"), inArray(audioLinks.entityId, divIds)));
  await db.delete(books).where(eq(books.id, id)); // cascades to divisions, verses, commentaries, types
  await log(user, "books", id, "delete", b, null, `${verseIds.length} verses, ${divIds.length} divisions`);
  revalidateScriptures();
  redirect("/admin/scriptures");
}

// ========================================================== categories ===
const CategoryInput = z.object({
  id: Id.optional(),
  name: Plain(120).min(1, "Give the category a name."),
  section: Plain(120),
  description: Plain(500),
});

export async function saveCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const p = CategoryInput.safeParse({ id: str(form, "id") || undefined, name: str(form, "name"), section: str(form, "section"), description: str(form, "description") });
  if (!p.success) return err(p.error);
  const { id, ...fields } = p.data;
  const db = getDb();
  if (id) {
    const [before] = await db.select().from(scriptureCategories).where(eq(scriptureCategories.id, id)).limit(1);
    if (!before) return fail("Not found.");
    await db.update(scriptureCategories).set(fields).where(eq(scriptureCategories.id, id));
    await log(user, "scripture_categories", id, "update", before, { ...before, ...fields });
    revalidateScriptures();
    return ok("Category saved.");
  }
  const all = await db.select({ key: scriptureCategories.key, sort: scriptureCategories.sort }).from(scriptureCategories);
  let key = slugKey(fields.name).replace(/_/g, "-");
  for (let i = 2; all.some((c) => c.key === key); i++) key = `${slugKey(fields.name).replace(/_/g, "-")}-${i}`;
  const [created] = await db
    .insert(scriptureCategories)
    .values({ ...fields, key, sort: Math.max(0, ...all.map((c) => c.sort)) + 10 })
    .returning();
  await log(user, "scripture_categories", created.id, "create", null, created);
  revalidateScriptures();
  return ok(`“${fields.name}” added.`);
}

export async function moveCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const up = str(form, "dir") === "up";
  const db = getDb();
  const list = await db.select({ id: scriptureCategories.id }).from(scriptureCategories).orderBy(asc(scriptureCategories.sort), asc(scriptureCategories.id));
  const i = list.findIndex((x) => x.id === id);
  const j = up ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return ok("");
  [list[i], list[j]] = [list[j], list[i]];
  await db.batch(list.map((x, k) => db.update(scriptureCategories).set({ sort: (k + 1) * 10 }).where(eq(scriptureCategories.id, x.id))) as never);
  revalidateScriptures();
  return ok("Order saved.");
}

export async function deleteCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const db = getDb();
  const [c] = await db.select().from(scriptureCategories).where(eq(scriptureCategories.id, id)).limit(1);
  if (!c) return fail("Not found.");
  await db.delete(scriptureCategories).where(eq(scriptureCategories.id, id)); // books keep existing (category set to none)
  await log(user, "scripture_categories", id, "delete", c, null);
  revalidateScriptures();
  return ok(`“${c.name}” deleted — its books are now uncategorised.`);
}

// ===================================================== commentary kinds ===
const TypeInput = z.object({
  id: Id.optional(),
  bookId: Id,
  name: Plain(120).min(1, "Give the commentary a name."),
  nameDeva: Plain(120),
  author: Plain(200),
  description: Plain(1000),
  language: z.enum(["sanskrit", "english", "hindi", "bengali", "nepali", "odia", "other"]),
  appliesTo: z.enum(["verse", "division", "both"]),
  pane: z.enum(["commentary", "verse", "anvaya", "translation"]),
  isVisible: z.boolean(),
});

function slugKey(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || "commentary"
  );
}

export async function saveCommentaryType(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const p = TypeInput.safeParse({
    id: str(form, "id") || undefined,
    bookId: str(form, "bookId"),
    name: str(form, "name"),
    nameDeva: str(form, "nameDeva"),
    author: str(form, "author"),
    description: str(form, "description"),
    language: str(form, "language") || "english",
    appliesTo: str(form, "appliesTo") || "verse",
    pane: str(form, "pane") || "commentary",
    isVisible: form.get("isVisible") === "on" || !form.has("visibleField"),
  });
  if (!p.success) return err(p.error);
  const { id, ...fields } = p.data;
  const db = getDb();
  if (id) {
    const [before] = await db.select().from(scriptureCommentaryTypes).where(eq(scriptureCommentaryTypes.id, id)).limit(1);
    if (!before) return fail("That commentary no longer exists.");
    await db.update(scriptureCommentaryTypes).set({ ...fields, updatedBy: user.id }).where(eq(scriptureCommentaryTypes.id, id));
    await log(user, "scripture_commentary_types", id, "update", before, { ...before, ...fields });
    revalidateScriptures();
    return ok(`“${fields.name}” saved.`);
  }
  const existing = await db.select({ key: scriptureCommentaryTypes.key, sort: scriptureCommentaryTypes.sort }).from(scriptureCommentaryTypes).where(eq(scriptureCommentaryTypes.bookId, fields.bookId));
  let key = slugKey(fields.name);
  for (let i = 2; existing.some((e) => e.key === key); i++) key = `${slugKey(fields.name)}_${i}`;
  const sort = Math.max(0, ...existing.map((e) => e.sort)) + 10;
  const [created] = await db.insert(scriptureCommentaryTypes).values({ ...fields, key, sort, updatedBy: user.id }).returning();
  await log(user, "scripture_commentary_types", created.id, "create", null, created);
  revalidateScriptures();
  return ok(`“${fields.name}” added. It now appears on every ${fields.appliesTo === "division" ? "chapter" : "verse"} editor.`);
}

export async function moveCommentaryType(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const up = str(form, "dir") === "up";
  const db = getDb();
  const [t] = await db.select().from(scriptureCommentaryTypes).where(eq(scriptureCommentaryTypes.id, id)).limit(1);
  if (!t) return fail("Not found.");
  const list = await db.select({ id: scriptureCommentaryTypes.id }).from(scriptureCommentaryTypes).where(eq(scriptureCommentaryTypes.bookId, t.bookId)).orderBy(asc(scriptureCommentaryTypes.sort), asc(scriptureCommentaryTypes.id));
  const i = list.findIndex((x) => x.id === id);
  const j = up ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return ok("");
  [list[i], list[j]] = [list[j], list[i]];
  await db.batch(list.map((x, k) => db.update(scriptureCommentaryTypes).set({ sort: (k + 1) * 10 }).where(eq(scriptureCommentaryTypes.id, x.id))) as never);
  revalidateScriptures();
  return ok("Order saved.");
}

export async function deleteCommentaryType(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const db = getDb();
  const [t] = await db.select().from(scriptureCommentaryTypes).where(eq(scriptureCommentaryTypes.id, id)).limit(1);
  if (!t) return fail("Not found.");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(scriptureCommentaries).where(eq(scriptureCommentaries.typeId, id));
  if (n > 0 && str(form, "confirm").trim() !== t.name) return fail(`It has ${n} entries. Type its name “${t.name}” to delete it with all of them.`);
  await db.delete(scriptureCommentaryTypes).where(eq(scriptureCommentaryTypes.id, id));
  await log(user, "scripture_commentary_types", id, "delete", t, null, `${n} entries`);
  revalidateScriptures();
  return ok(`“${t.name}” deleted.`);
}

// ============================================================ divisions ===
const DivisionInput = z.object({
  id: Id.optional(),
  bookId: Id,
  parentId: Id.nullable(),
  key: Key,
  number: Plain(30),
  title: Plain(300),
  titleDeva: Plain(300),
  subtitle: Plain(300),
  expected: z.union([z.literal(""), z.coerce.number().int().min(0).max(100000)]),
  status: Status,
  bodyHtml: z.string().max(800_000).transform(sanitizeRich),
});

async function saveEntries(user: SessionUser, target: { verseId?: number; divisionId?: number }, form: FormData, typeIds: number[], canPublish: boolean) {
  const db = getDb();
  const existing = await db
    .select()
    .from(scriptureCommentaries)
    .where(target.verseId ? eq(scriptureCommentaries.verseId, target.verseId) : eq(scriptureCommentaries.divisionId, target.divisionId!));
  let changed = 0;
  for (const typeId of typeIds) {
    if (!form.has(`c_${typeId}`)) continue;
    const html = sanitizeRich(str(form, `c_${typeId}`).slice(0, 800_000));
    const wanted = canPublish ? (str(form, `cs_${typeId}`) === "draft" ? "draft" : "published") : "draft";
    const cur = existing.find((e) => e.typeId === typeId);
    if (cur) {
      if (cur.html === html && cur.status === wanted) continue;
      if (!html && canPublish) {
        await db.delete(scriptureCommentaries).where(eq(scriptureCommentaries.id, cur.id));
      } else {
        await db.update(scriptureCommentaries).set({ html, status: wanted, updatedBy: user.id }).where(eq(scriptureCommentaries.id, cur.id));
      }
      await log(user, "scripture_commentaries", cur.id, "update", cur, { ...cur, html, status: wanted });
      changed++;
    } else if (html) {
      const [c] = await db
        .insert(scriptureCommentaries)
        .values({ typeId, verseId: target.verseId ?? null, divisionId: target.divisionId ?? null, html, status: wanted, updatedBy: user.id })
        .returning();
      await log(user, "scripture_commentaries", c.id, "create", null, c);
      changed++;
    }
  }
  return changed;
}

const AudioList = z
  .array(z.object({ title: Plain(200).min(1), speaker: Plain(200), url: z.string().trim().url().max(1000) }))
  .max(50);

async function saveAudio(user: SessionUser, entityType: "scripture_verse" | "scripture_division", entityId: number, raw: string) {
  if (!raw) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  const list = AudioList.safeParse(Array.isArray(parsed) ? parsed.filter((a) => a && (a.title || a.url)) : []);
  if (!list.success) throw new Error("Each audio link needs a title and a full https:// link.");
  const db = getDb();
  await db.delete(audioLinks).where(and(eq(audioLinks.entityType, entityType), eq(audioLinks.entityId, entityId)));
  if (list.data.length)
    await db.insert(audioLinks).values(list.data.map((a, i) => ({ ...a, entityType, entityId, sort: (i + 1) * 10, updatedBy: user.id })));
}

export async function saveDivision(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("contributor");
  const editor = hasRole(user, "editor");
  const db = getDb();
  const id = str(form, "id") ? Number(str(form, "id")) : undefined;

  if (!editor) {
    // contributors: division commentaries only (as drafts)
    if (!id) return fail("Only editors can add divisions.");
    const [d] = await db.select().from(scriptureDivisions).where(eq(scriptureDivisions.id, id)).limit(1);
    if (!d) return fail("Not found.");
    const types = await db.select({ id: scriptureCommentaryTypes.id }).from(scriptureCommentaryTypes).where(eq(scriptureCommentaryTypes.bookId, d.bookId));
    const n = await saveEntries(user, { divisionId: id }, form, types.map((t) => t.id), false);
    revalidateScriptures();
    return ok(n ? "Saved as draft — an editor will publish it." : "Nothing changed.");
  }

  const p = DivisionInput.safeParse({
    id,
    bookId: str(form, "bookId"),
    parentId: str(form, "parentId") ? str(form, "parentId") : null,
    key: str(form, "key"),
    number: str(form, "number"),
    title: str(form, "title"),
    titleDeva: str(form, "titleDeva"),
    subtitle: str(form, "subtitle"),
    expected: str(form, "expected"),
    status: str(form, "status") || "published",
    bodyHtml: str(form, "bodyHtml"),
  });
  if (!p.success) return err(p.error);
  const { id: _id, expected, parentId, ...rest } = p.data;
  void _id;
  const [book] = await db.select().from(books).where(eq(books.id, rest.bookId)).limit(1);
  if (!book) return fail("That book no longer exists.");
  let depth = 0;
  if (parentId) {
    const [par] = await db.select().from(scriptureDivisions).where(eq(scriptureDivisions.id, parentId)).limit(1);
    if (!par || par.bookId !== book.id) return fail("The parent division doesn't belong to this book.");
    depth = par.depth + 1;
  }
  if (depth >= (book.levels?.length ?? 1)) return fail(`This book has only ${book.levels.length} level(s): ${book.levels.join(" → ")}. Add a level in the book settings first.`);
  const [clash] = await db
    .select({ id: scriptureDivisions.id })
    .from(scriptureDivisions)
    .where(and(eq(scriptureDivisions.bookId, book.id), sql`coalesce(${scriptureDivisions.parentId}, 0) = ${parentId ?? 0}`, eq(scriptureDivisions.key, rest.key)))
    .limit(1);
  if (clash && clash.id !== id) return fail(`${book.levels[depth]} ${rest.key} already exists here.`);
  const values = { ...rest, parentId, depth, number: rest.number || rest.key, expectedChildren: expected === "" ? null : expected, updatedBy: user.id };

  if (id) {
    const [before] = await db.select().from(scriptureDivisions).where(eq(scriptureDivisions.id, id)).limit(1);
    if (!before) return fail("That division no longer exists.");
    await db.update(scriptureDivisions).set(values).where(eq(scriptureDivisions.id, id));
    await log(user, "scripture_divisions", id, "update", before, { ...before, ...values });
    // keys changed → refresh the displayed numbers of its verses (only those still auto-numbered)
    if (before.key !== values.key || before.number !== values.number) await refreshVerseNumbers(id, before.key, values.key);
    const types = await db.select({ id: scriptureCommentaryTypes.id }).from(scriptureCommentaryTypes).where(eq(scriptureCommentaryTypes.bookId, book.id));
    await saveEntries(user, { divisionId: id }, form, types.map((t) => t.id), true);
    try {
      await saveAudio(user, "scripture_division", id, str(form, "audio"));
    } catch (e) {
      return fail((e as Error).message);
    }
    revalidateScriptures();
    return ok("Saved.");
  }
  const [{ top }] = await db
    .select({ top: max(scriptureDivisions.position) })
    .from(scriptureDivisions)
    .where(and(eq(scriptureDivisions.bookId, book.id), parentId ? eq(scriptureDivisions.parentId, parentId) : sql`${scriptureDivisions.parentId} is null`));
  const [created] = await db
    .insert(scriptureDivisions)
    .values({ ...values, position: (top ?? 0) + 10 })
    .returning();
  await log(user, "scripture_divisions", created.id, "create", null, created);
  revalidateScriptures();
  redirect(`/admin/scriptures/d/${created.id}`);
}

/** After a division's key changes, rewrite verse numbers that followed the automatic pattern. */
async function refreshVerseNumbers(divisionId: number, _oldKey: string, _newKey: string) {
  void _oldKey;
  void _newKey;
  const db = getDb();
  const { path } = await divisionPath(divisionId);
  const affected: number[] = [divisionId];
  for (let i = 0; i < affected.length && i < 2000; i++) {
    const kids = await db.select({ id: scriptureDivisions.id }).from(scriptureDivisions).where(eq(scriptureDivisions.parentId, affected[i]));
    affected.push(...kids.map((k) => k.id));
  }
  for (const did of affected) {
    const p = did === divisionId ? path : (await divisionPath(did)).path;
    const vs = await db.select({ id: scriptureVerses.id, key: scriptureVerses.key }).from(scriptureVerses).where(eq(scriptureVerses.divisionId, did));
    if (vs.length)
      await db.batch(vs.map((v) => db.update(scriptureVerses).set({ verseNo: composeVerseNo(p, v.key) }).where(eq(scriptureVerses.id, v.id))) as never);
  }
}

/** Create many divisions at once: "1–90" under a parent (skips keys that exist). */
export async function generateDivisions(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const p = z
    .object({ bookId: Id, parentId: Id.nullable(), from: z.coerce.number().int().min(0).max(10000), to: z.coerce.number().int().min(0).max(10000) })
    .safeParse({ bookId: str(form, "bookId"), parentId: str(form, "parentId") || null, from: str(form, "from"), to: str(form, "to") });
  if (!p.success) return err(p.error);
  const { bookId, parentId, from, to } = p.data;
  if (to < from) return fail("“To” must be at least “From”.");
  if (to - from > 999) return fail("At most 1000 at a time.");
  const db = getDb();
  const [book] = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
  let depth = 0;
  if (parentId) {
    const [par] = await db.select().from(scriptureDivisions).where(eq(scriptureDivisions.id, parentId)).limit(1);
    if (!par) return fail("Parent not found.");
    depth = par.depth + 1;
  }
  if (depth >= book.levels.length) return fail(`This is already the last level (${book.levels[book.levels.length - 1]}).`);
  const where = and(eq(scriptureDivisions.bookId, bookId), parentId ? eq(scriptureDivisions.parentId, parentId) : sql`${scriptureDivisions.parentId} is null`);
  const existing = await db.select({ key: scriptureDivisions.key, position: scriptureDivisions.position }).from(scriptureDivisions).where(where);
  const have = new Set(existing.map((e) => e.key));
  const top = Math.max(0, ...existing.map((e) => e.position));
  const rows = [];
  for (let n = from, i = 1; n <= to; n++) {
    if (have.has(String(n))) continue;
    rows.push({ bookId, parentId, depth, key: String(n), number: String(n), position: top + i++ * 10, updatedBy: user.id });
  }
  if (rows.length) await db.insert(scriptureDivisions).values(rows);
  if (parentId && str(form, "setExpected") === "on") await db.update(scriptureDivisions).set({ expectedChildren: to - from + 1 }).where(eq(scriptureDivisions.id, parentId));
  // keep numeric order
  await resequenceDivisions(bookId, parentId);
  await log(user, "scripture_divisions", parentId ?? 0, "create", null, { generated: rows.length, from, to }, "generate");
  revalidateScriptures();
  return ok(rows.length ? `Added ${rows.length} ${book.levels[depth].toLowerCase()}${rows.length === 1 ? "" : "s"}.` : "They all exist already.");
}

async function resequenceDivisions(bookId: number, parentId: number | null) {
  const db = getDb();
  const list = await db
    .select({ id: scriptureDivisions.id, key: scriptureDivisions.key, position: scriptureDivisions.position })
    .from(scriptureDivisions)
    .where(and(eq(scriptureDivisions.bookId, bookId), parentId ? eq(scriptureDivisions.parentId, parentId) : sql`${scriptureDivisions.parentId} is null`))
    .orderBy(asc(scriptureDivisions.position), asc(scriptureDivisions.id));
  const numeric = list.every((d) => /^\d+$/.test(d.key));
  if (numeric) list.sort((a, b) => parseInt(a.key, 10) - parseInt(b.key, 10));
  const changes = list.map((d, i) => ({ id: d.id, pos: (i + 1) * 10 })).filter((c, i) => list[i].position !== c.pos);
  if (changes.length) await db.batch(changes.map((c) => db.update(scriptureDivisions).set({ position: c.pos }).where(eq(scriptureDivisions.id, c.id))) as never);
}

export async function moveDivision(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const up = str(form, "dir") === "up";
  const db = getDb();
  const [d] = await db.select().from(scriptureDivisions).where(eq(scriptureDivisions.id, id)).limit(1);
  if (!d) return fail("Not found.");
  const list = await db
    .select({ id: scriptureDivisions.id })
    .from(scriptureDivisions)
    .where(and(eq(scriptureDivisions.bookId, d.bookId), d.parentId ? eq(scriptureDivisions.parentId, d.parentId) : sql`${scriptureDivisions.parentId} is null`))
    .orderBy(asc(scriptureDivisions.position), asc(scriptureDivisions.id));
  const i = list.findIndex((x) => x.id === id);
  const j = up ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return ok("");
  [list[i], list[j]] = [list[j], list[i]];
  await db.batch(list.map((x, k) => db.update(scriptureDivisions).set({ position: (k + 1) * 10 }).where(eq(scriptureDivisions.id, x.id))) as never);
  revalidateScriptures();
  return ok("Order saved.");
}

export async function deleteDivision(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const db = getDb();
  const [d] = await db.select().from(scriptureDivisions).where(eq(scriptureDivisions.id, id)).limit(1);
  if (!d) return fail("Not found.");
  const ids: number[] = [id];
  for (let i = 0; i < ids.length && i < 5000; i++) {
    const kids = await db.select({ id: scriptureDivisions.id }).from(scriptureDivisions).where(eq(scriptureDivisions.parentId, ids[i]));
    ids.push(...kids.map((k) => k.id));
  }
  const verseIds = (await db.select({ id: scriptureVerses.id }).from(scriptureVerses).where(inArray(scriptureVerses.divisionId, ids))).map((v) => v.id);
  if ((verseIds.length || ids.length > 1) && str(form, "confirm") !== "on")
    return fail(`It contains ${ids.length - 1} sub-division(s) and ${verseIds.length} verse(s). Tick the box to delete everything inside.`);
  if (verseIds.length) await db.delete(audioLinks).where(and(eq(audioLinks.entityType, "scripture_verse"), inArray(audioLinks.entityId, verseIds)));
  await db.delete(audioLinks).where(and(eq(audioLinks.entityType, "scripture_division"), inArray(audioLinks.entityId, ids)));
  await db.delete(scriptureDivisions).where(eq(scriptureDivisions.id, id));
  await log(user, "scripture_divisions", id, "delete", d, null, `${verseIds.length} verses inside`);
  revalidateScriptures();
  const [b] = await db.select({ code: books.code }).from(books).where(eq(books.id, d.bookId));
  redirect(d.parentId ? `/admin/scriptures/d/${d.parentId}` : `/admin/scriptures/${b.code}`);
}

// =============================================================== verses ===
/** Shift integer verse keys ≥ `fromKey` by `delta` in one division (two-step to dodge the unique index). */
async function shiftVerses(divisionId: number, fromNumber: number, delta: number, path: string[]) {
  const db = getDb();
  const list = await db.select().from(scriptureVerses).where(eq(scriptureVerses.divisionId, divisionId));
  const moving = list.filter((v) => {
    const r = parseVerseKey(v.key);
    return r && r.from >= fromNumber;
  });
  if (!moving.length) return 0;
  const tmp = moving.map((v) => db.update(scriptureVerses).set({ key: `~${v.id}` }).where(eq(scriptureVerses.id, v.id)));
  const fin = moving.map((v) => {
    const r = parseVerseKey(v.key)!;
    const key = r.from === r.to ? `${r.from + delta}` : `${r.from + delta}-${r.to + delta}`;
    const autoNo = v.verseNo === composeVerseNo(path, v.key);
    return db
      .update(scriptureVerses)
      .set({ key, verseFrom: r.from + delta, verseTo: r.to + delta, ...(autoNo ? { verseNo: composeVerseNo(path, key) } : {}) })
      .where(eq(scriptureVerses.id, v.id));
  });
  await db.batch([...tmp, ...fin] as never);
  return moving.length;
}

async function resequenceVerses(divisionId: number) {
  const db = getDb();
  const list = await db
    .select({ id: scriptureVerses.id, position: scriptureVerses.position })
    .from(scriptureVerses)
    .where(eq(scriptureVerses.divisionId, divisionId))
    .orderBy(asc(scriptureVerses.position), asc(scriptureVerses.verseFrom), asc(scriptureVerses.id));
  const changes = list.map((v, i) => ({ id: v.id, pos: (i + 1) * 10, old: v.position })).filter((c) => c.pos !== c.old);
  if (changes.length) await db.batch(changes.map((c) => db.update(scriptureVerses).set({ position: c.pos }).where(eq(scriptureVerses.id, c.id))) as never);
}

/** Add a verse at the end, or right after another one (optionally renumbering the following). */
export async function createVerse(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const divisionId = Id.parse(str(form, "divisionId"));
  const afterId = str(form, "after") ? Number(str(form, "after")) : null;
  const renumber = str(form, "renumber") === "on";
  const db = getDb();
  const [div] = await db.select().from(scriptureDivisions).where(eq(scriptureDivisions.id, divisionId)).limit(1);
  if (!div) return fail("Division not found.");
  const { path } = await divisionPath(divisionId);
  const list = await db.select().from(scriptureVerses).where(eq(scriptureVerses.divisionId, divisionId)).orderBy(asc(scriptureVerses.position), asc(scriptureVerses.id));
  const after = afterId ? list.find((v) => v.id === afterId) : list[list.length - 1];
  const afterTo = after ? range(after.key, 0).to : 0;
  let key = str(form, "key").trim().toLowerCase();
  if (key && !/^[0-9a-z-]+$/.test(key)) return fail("Use digits (or a range like 16-18) for the verse number.");
  if (!key) {
    key = String(afterTo + 1);
    if (!renumber && list.some((v) => v.key === key)) {
      const top = Math.max(0, ...list.map((v) => range(v.key, 0).to));
      key = String(top + 1);
    }
  }
  if (renumber && afterId) await shiftVerses(divisionId, range(key, afterTo + 1).from, range(key, 0).to - range(key, 0).from + 1, path);
  else if (list.some((v) => v.key === key)) return fail(`Verse ${key} already exists here. Tick “renumber the following” to make room.`);
  const r = range(key, afterTo + 1);
  const position = after ? after.position + 5 : 10;
  const [created] = await db
    .insert(scriptureVerses)
    .values({
      bookId: div.bookId,
      divisionId,
      key,
      verseNo: composeVerseNo(path, key),
      verseFrom: r.from,
      verseTo: r.to,
      position,
      status: "published",
      updatedBy: user.id,
    })
    .returning();
  await resequenceVerses(divisionId);
  await log(user, "scripture_verses", created.id, "create", null, created);
  revalidateScriptures();
  redirect(`/admin/scriptures/v/${created.id}?created=1`);
}

const VerseInput = z.object({
  id: Id,
  key: Key,
  verseNo: Plain(40),
  devanagari: z.string().max(20000),
  iast: z.string().max(20000),
  speaker: Plain(300),
  language: z.enum(["", "sanskrit", "english", "hindi", "bengali", "nepali", "odia", "other"]),
  status: Status,
  dailyEligible: z.boolean(),
  divisionId: Id,
});

export async function saveVerse(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("contributor");
  const editor = hasRole(user, "editor");
  const db = getDb();
  const id = Id.parse(str(form, "id"));
  const [before] = await db.select().from(scriptureVerses).where(eq(scriptureVerses.id, id)).limit(1);
  if (!before) return fail("That verse no longer exists.");
  const types = await db.select({ id: scriptureCommentaryTypes.id }).from(scriptureCommentaryTypes).where(eq(scriptureCommentaryTypes.bookId, before.bookId));

  if (editor) {
    const p = VerseInput.safeParse({
      id,
      key: str(form, "key"),
      verseNo: str(form, "verseNo"),
      devanagari: str(form, "devanagari"),
      iast: str(form, "iast"),
      speaker: str(form, "speaker"),
      language: str(form, "language"),
      status: str(form, "status") || "published",
      dailyEligible: form.get("dailyEligible") === "on",
      divisionId: str(form, "divisionId") || before.divisionId,
    });
    if (!p.success) return err(p.error);
    const v = p.data;
    if (v.divisionId !== before.divisionId) {
      const [target] = await db.select().from(scriptureDivisions).where(eq(scriptureDivisions.id, v.divisionId)).limit(1);
      if (!target || target.bookId !== before.bookId) return fail("Choose a division of the same book.");
    }
    const [clash] = await db
      .select({ id: scriptureVerses.id })
      .from(scriptureVerses)
      .where(and(eq(scriptureVerses.divisionId, v.divisionId), eq(scriptureVerses.key, v.key)))
      .limit(1);
    if (clash && clash.id !== id) return fail(`Verse ${v.key} already exists in that division.`);
    const { path } = await divisionPath(v.divisionId);
    const oldAuto = composeVerseNo((await divisionPath(before.divisionId)).path, before.key);
    const verseNo = !v.verseNo || v.verseNo === oldAuto ? composeVerseNo(path, v.key) : v.verseNo;
    const r = range(v.key, before.verseFrom);
    const fields = {
      key: v.key,
      verseNo,
      verseFrom: r.from,
      verseTo: r.to,
      devanagari: v.devanagari.trim(),
      iast: v.iast.normalize("NFC").trim(),
      speaker: v.speaker,
      language: v.language,
      status: v.status,
      dailyEligible: v.dailyEligible,
      divisionId: v.divisionId,
      updatedBy: user.id,
    };
    await db.update(scriptureVerses).set(fields).where(eq(scriptureVerses.id, id));
    await log(user, "scripture_verses", id, "update", before, { ...before, ...fields });
    try {
      await saveAudio(user, "scripture_verse", id, str(form, "audio"));
    } catch (e) {
      return fail((e as Error).message);
    }
  }
  const n = await saveEntries(user, { verseId: id }, form, types.map((t) => t.id), editor);
  revalidateScriptures();
  if (str(form, "then") === "next") {
    const nextId = str(form, "nextId");
    if (nextId) redirect(`/admin/scriptures/v/${nextId}`);
  }
  return ok(editor ? "Saved — the site shows it now." : n ? "Saved as draft — an editor will publish it." : "Nothing changed.");
}

export async function deleteVerse(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const db = getDb();
  const [v] = await db.select().from(scriptureVerses).where(eq(scriptureVerses.id, id)).limit(1);
  if (!v) return fail("Not found.");
  await db.delete(audioLinks).where(and(eq(audioLinks.entityType, "scripture_verse"), eq(audioLinks.entityId, id)));
  await db.delete(scriptureVerses).where(eq(scriptureVerses.id, id));
  await log(user, "scripture_verses", id, "delete", v, null);
  if (str(form, "closeGap") === "on") {
    const r = parseVerseKey(v.key);
    if (r) await shiftVerses(v.divisionId, r.to + 1, -(r.to - r.from + 1), (await divisionPath(v.divisionId)).path);
  }
  revalidateScriptures();
  redirect(`/admin/scriptures/d/${v.divisionId}`);
}

export async function moveVerse(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const up = str(form, "dir") === "up";
  const db = getDb();
  const [v] = await db.select().from(scriptureVerses).where(eq(scriptureVerses.id, id)).limit(1);
  if (!v) return fail("Not found.");
  const list = await db.select({ id: scriptureVerses.id }).from(scriptureVerses).where(eq(scriptureVerses.divisionId, v.divisionId)).orderBy(asc(scriptureVerses.position), asc(scriptureVerses.id));
  const i = list.findIndex((x) => x.id === id);
  const j = up ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return ok("");
  [list[i], list[j]] = [list[j], list[i]];
  await db.batch(list.map((x, k) => db.update(scriptureVerses).set({ position: (k + 1) * 10 }).where(eq(scriptureVerses.id, x.id))) as never);
  revalidateScriptures();
  return ok("Order saved.");
}

/** Publish or hide many verses at once. */
export async function setVersesStatus(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const ids = form.getAll("ids").map(Number).filter((n) => n > 0);
  const status = Status.parse(str(form, "status"));
  if (!ids.length) return fail("Tick at least one verse.");
  const db = getDb();
  await db.update(scriptureVerses).set({ status, updatedBy: user.id }).where(inArray(scriptureVerses.id, ids));
  if (status === "published") await db.update(scriptureCommentaries).set({ status: "published" }).where(and(inArray(scriptureCommentaries.verseId, ids), eq(scriptureCommentaries.status, "draft")));
  await log(user, "scripture_verses", ids[0], "update", null, { ids, status }, "bulk status");
  revalidateScriptures();
  return ok(`${ids.length} verse${ids.length === 1 ? "" : "s"} set to ${status}${status === "published" ? " (with their draft commentaries)" : ""}.`);
}

export async function publishDrafts(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const db = getDb();
  const verseId = str(form, "verseId") ? Number(str(form, "verseId")) : null;
  const divisionId = str(form, "divisionId") ? Number(str(form, "divisionId")) : null;
  if (verseId) await db.update(scriptureCommentaries).set({ status: "published", updatedBy: user.id }).where(and(eq(scriptureCommentaries.verseId, verseId), eq(scriptureCommentaries.status, "draft")));
  else if (divisionId) {
    const vs = (await db.select({ id: scriptureVerses.id }).from(scriptureVerses).where(eq(scriptureVerses.divisionId, divisionId))).map((v) => v.id);
    if (vs.length) await db.update(scriptureCommentaries).set({ status: "published", updatedBy: user.id }).where(and(inArray(scriptureCommentaries.verseId, vs), eq(scriptureCommentaries.status, "draft")));
    await db.update(scriptureCommentaries).set({ status: "published", updatedBy: user.id }).where(and(eq(scriptureCommentaries.divisionId, divisionId), eq(scriptureCommentaries.status, "draft")));
  }
  revalidateScriptures();
  return ok("Drafts published.");
}

/**
 * Paste many verses at once. Verses are separated by a blank line, or end with
 * a ॥ n ॥ marker. Lines inside one verse are kept (stored with " / ").
 * Devanagari and IAST are told apart automatically.
 */
export async function bulkAddVerses(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const divisionId = Id.parse(str(form, "divisionId"));
  const text = str(form, "text").replace(/\r/g, "");
  if (!text.trim()) return fail("Paste some verses first.");
  if (text.length > 1_000_000) return fail("That is too much at once — paste one chapter at a time.");
  const db = getDb();
  const [div] = await db.select().from(scriptureDivisions).where(eq(scriptureDivisions.id, divisionId)).limit(1);
  if (!div) return fail("Division not found.");
  const { path } = await divisionPath(divisionId);
  const startAt = parseInt(str(form, "start") || "0", 10) || 0;
  const existing = await db.select().from(scriptureVerses).where(eq(scriptureVerses.divisionId, divisionId));
  const top = Math.max(0, ...existing.map((v) => range(v.key, 0).to));
  const maxPos = Math.max(0, ...existing.map((v) => v.position));

  // split into blocks
  let blocks = text.split(/\n\s*\n+/);
  if (blocks.length === 1) blocks = text.split(/(?<=॥\s*[०-९0-9]+(?:\s*[-–]\s*[०-९0-9]+)?\s*॥)\s*\n/);
  blocks = blocks.map((b) => b.trim()).filter(Boolean);
  if (!blocks.length) return fail("Couldn't find any verse.");
  if (blocks.length > 1000) return fail("At most 1000 verses at a time.");

  const devaDigits = (s: string) => s.replace(/[०-९]/g, (d) => String("०१२३४५६७८९".indexOf(d)));
  let n = startAt > 0 ? startAt - 1 : top;
  const rows: (typeof scriptureVerses.$inferInsert)[] = [];
  const keys = new Set(existing.map((v) => v.key));
  for (const [i, block] of blocks.entries()) {
    const m = devaDigits(block).match(/(?:॥|\|\|)\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:॥|\|\|)\s*$/);
    let key: string;
    if (m && str(form, "useMarkers") === "on") key = m[2] ? `${m[1]}-${m[2]}` : m[1];
    else key = String(++n);
    const r = range(key, n);
    n = Math.max(n, r.to);
    if (keys.has(key)) return fail(`Verse ${key} already exists in this division (block ${i + 1}). Nothing was added.`);
    keys.add(key);
    const body = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" / ");
    const isDeva = /[ऀ-ॿ]/.test(body);
    rows.push({
      bookId: div.bookId,
      divisionId,
      key,
      verseNo: composeVerseNo(path, key),
      verseFrom: r.from,
      verseTo: r.to,
      position: maxPos + (i + 1) * 10,
      devanagari: isDeva ? body : "",
      iast: isDeva ? "" : body.normalize("NFC"),
      status: str(form, "draft") === "on" ? "draft" : "published",
      updatedBy: user.id,
    });
  }
  for (let i = 0; i < rows.length; i += 200) await db.insert(scriptureVerses).values(rows.slice(i, i + 200));
  await resequenceVerses(divisionId);
  await log(user, "scripture_divisions", divisionId, "import", null, { added: rows.length }, "bulk paste");
  revalidateScriptures();
  return ok(`Added ${rows.length} verse${rows.length === 1 ? "" : "s"} (${rows[0].key}–${rows[rows.length - 1].key}).`);
}

/** Copy a verse into the Verse-of-the-Day pool. */
export async function addVerseToDaily(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const typeId = str(form, "typeId") ? Number(str(form, "typeId")) : null;
  const db = getDb();
  const [v] = await db.select().from(scriptureVerses).where(eq(scriptureVerses.id, id)).limit(1);
  if (!v) return fail("Not found.");
  const [b] = await db.select().from(books).where(eq(books.id, v.bookId)).limit(1);
  if (!v.devanagari.trim() && !v.iast.trim()) return fail("Add the verse text first.");
  let translation = "";
  if (typeId) {
    const [c] = await db.select().from(scriptureCommentaries).where(and(eq(scriptureCommentaries.verseId, id), eq(scriptureCommentaries.typeId, typeId))).limit(1);
    translation = (c?.html ?? "").replace(/<\/p>\s*<p>/g, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  }
  const source = `${b.abbrev || b.title} ${v.verseNo}`;
  const [dup] = await db.select({ id: dailyItems.id }).from(dailyItems).where(and(eq(dailyItems.pool, "verse_of_day"), eq(dailyItems.source, source))).limit(1);
  if (dup) return fail(`${source} is already in the Verse of the Day list.`);
  const [item] = await db
    .insert(dailyItems)
    .values({ pool: "verse_of_day", sanskrit: v.devanagari || v.iast, iast: v.iast, translation, source, status: "published", updatedBy: user.id })
    .returning();
  await log(user, "daily_items", item.id, "create", null, item, `from verse ${id}`);
  revalidateDaily();
  return ok(`${source} added to Verse of the Day.`);
}

// ================================================================ find ===
export async function goToReference(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("viewer");
  const bookId = Id.parse(str(form, "bookId"));
  const ref = str(form, "ref");
  const url = await findByReference(bookId, ref);
  if (!url) return fail(`Nothing found for “${ref}”.`);
  redirect(url);
}

// ============================================================== import ===
const ImportRow = z.object({
  location: z.string().max(100),
  verse: z.string().max(30),
  verseNo: z.string().max(40).optional(),
  devanagari: z.string().max(20000).optional(),
  iast: z.string().max(20000).optional(),
  speaker: z.string().max(300).optional(),
  status: z.string().max(20).optional(),
  c: z.record(z.string(), z.string().max(400_000)).optional(),
});
const DivisionRow = z.object({
  location: z.string().max(100),
  number: z.string().max(30).optional(),
  title: z.string().max(300).optional(),
  titleDeva: z.string().max(300).optional(),
  subtitle: z.string().max(300).optional(),
  expected: z.string().max(10).optional(),
  /** prose of the division itself (a chapter summary …), HTML */
  body: z.string().max(400_000).optional(),
});

export type ImportReport = {
  ok: boolean;
  message: string;
  created: number;
  updated: number;
  unchanged: number;
  divisionsCreated: number;
  errors: string[];
};

/**
 * Bulk import from the spreadsheet (rows parsed in the browser and sent in
 * chunks). Matches verses by location + verse number. Empty cells never
 * erase. Never deletes. With `dryRun`, nothing is written.
 */
export async function importScriptureRows(input: {
  bookId: number;
  rows: unknown[];
  divisions?: unknown[];
  dryRun: boolean;
  createDivisions: boolean;
}): Promise<ImportReport> {
  const user = await requireUser("editor");
  const db = getDb();
  const report: ImportReport = { ok: true, message: "", created: 0, updated: 0, unchanged: 0, divisionsCreated: 0, errors: [] };
  const [book] = await db.select().from(books).where(eq(books.id, Number(input.bookId))).limit(1);
  if (!book) return { ...report, ok: false, message: "Book not found." };
  const rows = z.array(ImportRow).max(2000).safeParse(input.rows);
  const divRows = z.array(DivisionRow).max(5000).safeParse(input.divisions ?? []);
  if (!rows.success || !divRows.success) return { ...report, ok: false, message: "The rows are not in the expected shape." };
  const types = await db.select().from(scriptureCommentaryTypes).where(eq(scriptureCommentaryTypes.bookId, book.id));
  const typeByCol = new Map<string, number>();
  for (const t of types) {
    typeByCol.set(t.key.toLowerCase(), t.id);
    typeByCol.set(t.name.toLowerCase(), t.id);
  }

  let tree = await buildTree(book.id, { all: true });
  const findPath = (parts: string[]) => {
    let parent: number | null = null;
    let node = null as (typeof tree)[number] | null;
    for (const p of parts) {
      node = tree.find((n) => n.parentId === parent && n.key === p) ?? null;
      if (!node) return null;
      parent = node.id;
    }
    return node;
  };
  const splitLoc = (s: string) =>
    s
      .trim()
      .split(/[\s.:/,]+/)
      .filter(Boolean)
      .map((x) => x.toLowerCase());

  // make sure a division path exists (creating it when allowed)
  const ensure = async (parts: string[]): Promise<number | null> => {
    const hit = findPath(parts);
    if (hit) return hit.id;
    if (!input.createDivisions || input.dryRun) {
      if (input.dryRun && input.createDivisions) {
        report.divisionsCreated++;
        // pretend it exists for the rest of the dry run
        const fakeId = -1 - tree.length;
        const parent = parts.length > 1 ? findPath(parts.slice(0, -1)) : null;
        tree = [...tree, { id: fakeId, parentId: parent?.id ?? null, depth: parts.length - 1, key: parts[parts.length - 1], number: parts[parts.length - 1], title: "", titleDeva: "", subtitle: "", expected: null, verses: 0, firstVerse: null, lastVerse: null, hasBody: false, path: parts }];
        return fakeId;
      }
      return null;
    }
    let parent: number | null = null;
    for (let i = 0; i < parts.length; i++) {
      const sub = findPath(parts.slice(0, i + 1));
      if (sub) {
        parent = sub.id;
        continue;
      }
      const [{ top }] = await db
        .select({ top: max(scriptureDivisions.position) })
        .from(scriptureDivisions)
        .where(and(eq(scriptureDivisions.bookId, book.id), parent ? eq(scriptureDivisions.parentId, parent) : sql`${scriptureDivisions.parentId} is null`));
      const [created]: { id: number }[] = await db
        .insert(scriptureDivisions)
        .values({ bookId: book.id, parentId: parent, depth: i, key: parts[i], number: parts[i], position: (top ?? 0) + 10, updatedBy: user.id })
        .returning();
      report.divisionsCreated++;
      await resequenceDivisions(book.id, parent);
      tree = [...tree, { id: created.id, parentId: parent, depth: i, key: parts[i], number: parts[i], title: "", titleDeva: "", subtitle: "", expected: null, verses: 0, firstVerse: null, lastVerse: null, hasBody: false, path: parts.slice(0, i + 1) }];
      parent = created.id;
    }
    return parent;
  };

  // divisions sheet
  for (const [i, d] of divRows.data.entries()) {
    const parts = splitLoc(d.location);
    if (!parts.length) continue;
    if (parts.length > book.levels.length) {
      report.errors.push(`Divisions row ${i + 2}: “${d.location}” is deeper than the book's levels (${book.levels.join(" → ")}).`);
      continue;
    }
    const id = await ensure(parts);
    if (id == null) {
      report.errors.push(`Divisions row ${i + 2}: ${d.location} doesn't exist (tick “create missing divisions”).`);
      continue;
    }
    const set: Partial<typeof scriptureDivisions.$inferInsert> = {};
    if (d.number?.trim()) set.number = d.number.trim();
    if (d.title?.trim()) set.title = d.title.trim();
    if (d.titleDeva?.trim()) set.titleDeva = d.titleDeva.trim();
    if (d.subtitle?.trim()) set.subtitle = d.subtitle.trim();
    if (d.expected?.trim() && /^\d+$/.test(d.expected.trim())) set.expectedChildren = parseInt(d.expected.trim(), 10);
    if (d.body?.trim()) set.bodyHtml = toHtml(d.body);
    if (Object.keys(set).length && id > 0 && !input.dryRun) await db.update(scriptureDivisions).set({ ...set, updatedBy: user.id }).where(eq(scriptureDivisions.id, id));
  }

  // verses
  const pending: { divisionId: number; path: string[]; row: z.infer<typeof ImportRow>; line: number }[] = [];
  for (const [i, r] of rows.data.entries()) {
    const line = i + 2;
    const parts = splitLoc(r.location);
    const key = r.verse.trim().toLowerCase();
    if (!parts.length && !key) continue;
    if (parts.length !== book.levels.length) {
      report.errors.push(`Row ${line}: location “${r.location}” should have ${book.levels.length} part(s) (${book.levels.join(".")}).`);
      continue;
    }
    if (!/^[0-9a-z-]+$/.test(key)) {
      report.errors.push(`Row ${line}: verse number “${r.verse}” is not valid (use 12 or 16-18).`);
      continue;
    }
    for (const col of Object.keys(r.c ?? {})) if (!typeByCol.has(col.toLowerCase())) report.errors.push(`Row ${line}: unknown commentary column “${col}”. Add it under Commentaries first.`);
    const divisionId = await ensure(parts);
    if (divisionId == null) {
      report.errors.push(`Row ${line}: ${book.levels.join(" ")} ${parts.join(".")} doesn't exist (tick “create missing divisions”).`);
      continue;
    }
    pending.push({ divisionId, path: parts, row: { ...r, verse: key }, line });
  }
  if (report.errors.length) {
    report.errors = [...new Set(report.errors)].slice(0, 50);
    return { ...report, ok: false, message: `${report.errors.length} problem(s) — nothing was saved.` };
  }

  const realDivIds = [...new Set(pending.map((p) => p.divisionId).filter((id) => id > 0))];
  const existing = realDivIds.length ? await db.select().from(scriptureVerses).where(inArray(scriptureVerses.divisionId, realDivIds)) : [];
  const existingComm = existing.length
    ? await db.select().from(scriptureCommentaries).where(inArray(scriptureCommentaries.verseId, existing.map((e) => e.id)))
    : [];

  for (const p of pending) {
    const r = p.row;
    const cur = existing.find((e) => e.divisionId === p.divisionId && e.key === r.verse);
    const set: Partial<typeof scriptureVerses.$inferInsert> = {};
    // "Text" column: one script only — the other column is cleared ("" ), so the site derives it.
    const single = (r.devanagari === "" && Boolean(r.iast?.trim())) || (r.iast === "" && Boolean(r.devanagari?.trim()));
    if (r.devanagari?.trim()) set.devanagari = r.devanagari.trim();
    if (r.iast?.trim()) set.iast = r.iast.trim().normalize("NFC");
    if (single && (cur?.language || book.verseLanguage) === "sanskrit") {
      if (!r.devanagari?.trim()) set.devanagari = "";
      if (!r.iast?.trim()) set.iast = "";
    }
    if (r.speaker?.trim()) set.speaker = r.speaker.trim();
    if (r.verseNo?.trim()) set.verseNo = r.verseNo.trim();
    const st = r.status?.trim().toLowerCase();
    if (st && ["draft", "published", "archived"].includes(st)) set.status = st as "draft";
    const comms = Object.entries(r.c ?? {})
      .map(([col, html]) => ({ typeId: typeByCol.get(col.toLowerCase())!, html: html.trim() }))
      .filter((x) => x.html);

    if (!cur) {
      report.created++;
      if (input.dryRun) continue;
      const rg = range(r.verse, 0);
      const [created] = await db
        .insert(scriptureVerses)
        .values({
          bookId: book.id,
          divisionId: p.divisionId,
          key: r.verse,
          verseNo: set.verseNo ?? composeVerseNo(p.path.map((_, i) => findPath(p.path.slice(0, i + 1))?.number || p.path[i]), r.verse),
          verseFrom: rg.from,
          verseTo: rg.to,
          position: rg.from * 10,
          devanagari: set.devanagari ?? "",
          iast: set.iast ?? "",
          speaker: set.speaker ?? "",
          status: (set.status as "published") ?? "published",
          updatedBy: user.id,
        })
        .returning();
      if (comms.length)
        await db.insert(scriptureCommentaries).values(comms.map((c) => ({ typeId: c.typeId, verseId: created.id, html: toHtml(c.html), status: "published" as const, updatedBy: user.id })));
      continue;
    }
    const verseChanged = Object.entries(set).some(([k, v]) => (cur as Record<string, unknown>)[k] !== v);
    const commChanges = comms.filter((c) => {
      const e = existingComm.find((x) => x.verseId === cur.id && x.typeId === c.typeId);
      const br = (h: string) => h.replace(/<br\s*\/?>/gi, "<br>");
      return !e || br(e.html) !== br(toHtml(c.html));
    });
    if (!verseChanged && !commChanges.length) {
      report.unchanged++;
      continue;
    }
    report.updated++;
    if (input.dryRun) continue;
    if (verseChanged) await db.update(scriptureVerses).set({ ...set, updatedBy: user.id }).where(eq(scriptureVerses.id, cur.id));
    for (const c of commChanges) {
      const e = existingComm.find((x) => x.verseId === cur.id && x.typeId === c.typeId);
      if (e) await db.update(scriptureCommentaries).set({ html: toHtml(c.html), updatedBy: user.id }).where(eq(scriptureCommentaries.id, e.id));
      else await db.insert(scriptureCommentaries).values({ typeId: c.typeId, verseId: cur.id, html: toHtml(c.html), status: "published", updatedBy: user.id });
    }
  }
  if (!input.dryRun) {
    for (const d of realDivIds) await resequenceVerses(d);
    if (report.created || report.updated || report.divisionsCreated)
      await log(user, "books", book.id, "import", null, { created: report.created, updated: report.updated, divisions: report.divisionsCreated }, "spreadsheet");
    revalidateScriptures();
  }
  report.message = input.dryRun ? "Checked — nothing saved yet." : "Saved.";
  return report;
}

/** Spreadsheet cells may be plain text (with line breaks) or HTML. */
function toHtml(s: string) {
  const t = s.trim();
  return sanitizeRich(/^<[a-z][\s\S]*>/i.test(t) ? t : plainToHtml(t));
}

// ======================================================= e-book import ===
const KindIn = z.object({
  key: z.string().trim().min(1).max(60).regex(/^[a-z0-9_-]+$/),
  name: z.string().trim().min(1).max(120),
  author: z.string().trim().max(120),
  language: z.enum(["sanskrit", "english"]),
  pane: z.enum(["commentary", "verse", "translation"]),
});

/**
 * The e-book import (Bhāgavatam): make sure every kind of commentary it brings
 * exists for the book (synonyms, translation, purport, each ācārya's commentary).
 * Existing kinds are left exactly as they are.
 */
export async function ensureCommentaryKinds(bookId: number, kinds: z.input<typeof KindIn>[]): Promise<{ ok: boolean; message: string; created: string[] }> {
  const user = await requireUser("editor");
  const parsed = z.array(KindIn).max(60).safeParse(kinds);
  if (!parsed.success) return { ok: false, message: "The list of commentaries is not valid.", created: [] };
  const db = getDb();
  const [book] = await db.select().from(books).where(eq(books.id, Number(bookId))).limit(1);
  if (!book) return { ok: false, message: "Book not found.", created: [] };
  const have = await db.select().from(scriptureCommentaryTypes).where(eq(scriptureCommentaryTypes.bookId, book.id));
  let sort = Math.max(0, ...have.map((t) => t.sort));
  const created: string[] = [];
  for (const k of parsed.data) {
    if (have.some((t) => t.key === k.key)) continue;
    // synonyms (word-for-word) come first, before the Anvaya and the translation
    let at: number;
    if (k.pane === "verse") at = Math.min(10, ...have.map((t) => t.sort)) - 5;
    else at = sort += 10;
    const [t] = await db
      .insert(scriptureCommentaryTypes)
      .values({ bookId: book.id, key: k.key, name: k.name, author: k.author, language: k.language, pane: k.pane, appliesTo: "verse", sort: at, updatedBy: user.id })
      .returning();
    await log(user, "scripture_commentary_types", t.id, "create", null, t, "e-book import");
    created.push(k.name);
  }
  if (created.length) revalidateScriptures();
  return { ok: true, message: created.length ? `Added: ${created.join(", ")}.` : "All kinds already exist.", created };
}
