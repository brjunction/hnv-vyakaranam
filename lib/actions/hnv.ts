"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { and, asc, count, desc, eq, gt, inArray, lt, max, min, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  chapters,
  commentaryTypes,
  editions,
  revisions,
  subchapters,
  sutraCommentaries,
  sutras,
} from "@/lib/db/schema";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { revalidateHnv } from "@/lib/actions/revalidate";
import { fail, ok, type ActionState } from "@/lib/actions/types";
import { sanitizeRich } from "@/lib/html/sanitize";
import { parseNumber, prefixRegex } from "@/lib/hnv/numbering";
import { slugifyTitle } from "@/lib/hnv/slug";
import {
  resequenceChapter,
  resequenceCommentaryTypes,
  resequenceChapters,
  resequenceSections,
  shiftDown,
  shiftUp,
} from "@/lib/hnv/ordering";

// Admin writes for the HNV module: chapters, sections (subchapters), sūtras
// and commentaries. Roles (docs/04-admin.md §3):
//   editor/owner — everything here
//   contributor  — commentary text only, saved as draft
//   viewer       — read only
// Every change is logged in `revisions` and revalidates the public pages.

const Id = z.coerce.number().int().positive();
const Status = z.enum(["draft", "published", "archived"]);
const NumberText = z
  .string()
  .trim()
  .min(1, "Give the sūtra a number.")
  .max(20, "That number is too long.")
  .regex(/^[0-9A-Za-z.\-]+$/, "Use digits, letters, dots or hyphens only (e.g. 42 or 0.1.3).");
const Rich = z.string().max(400_000, "That text is too long.").transform(sanitizeRich);
const Plain = (maxLen: number) => z.string().trim().max(maxLen);

function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

async function log(
  user: SessionUser,
  entityTable: string,
  entityId: number,
  action: "create" | "update" | "delete",
  before: unknown,
  after: unknown,
  note = ""
) {
  await getDb().insert(revisions).values({ entityTable, entityId, action, before, after, userId: user.id, note });
}

async function uniqueSlug(table: "chapters" | "subchapters", parentId: number, title: string, exceptId?: number) {
  const db = getDb();
  const base = slugifyTitle(title);
  for (let i = 1; i < 200; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const rows =
      table === "chapters"
        ? await db.select({ id: chapters.id }).from(chapters).where(and(eq(chapters.editionId, parentId), eq(chapters.slug, slug)))
        : await db.select({ id: subchapters.id }).from(subchapters).where(and(eq(subchapters.chapterId, parentId), eq(subchapters.slug, slug)));
    if (rows.every((r) => r.id === exceptId)) return slug;
  }
  return `${base}-${Date.now()}`;
}

// =========================================================== chapters ====
const ChapterInput = z.object({
  id: Id.optional(),
  editionId: Id,
  title: Plain(200).min(1, "The chapter needs a title."),
  titleEn: Plain(200),
  number: z.union([z.literal(""), z.coerce.number().int().min(0).max(999)]),
  summary: Plain(2000),
  kind: z.enum(["sutras", "verses"]),
  rangeLabel: Plain(60),
  status: Status,
});

export async function saveChapter(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const p = ChapterInput.safeParse({
    id: str(form, "id") || undefined,
    editionId: str(form, "editionId"),
    title: str(form, "title"),
    titleEn: str(form, "titleEn"),
    number: str(form, "number"),
    summary: str(form, "summary"),
    kind: str(form, "kind") || "sutras",
    rangeLabel: str(form, "rangeLabel"),
    status: str(form, "status") || "published",
  });
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the form.");
  const { id, number, ...rest } = p.data;
  const fields = { ...rest, number: number === "" ? null : number, updatedBy: user.id };
  const db = getDb();

  if (id) {
    const [before] = await db.select().from(chapters).where(eq(chapters.id, id)).limit(1);
    if (!before) return fail("That chapter no longer exists.");
    await db.update(chapters).set(fields).where(eq(chapters.id, id));
    await log(user, "chapters", id, "update", before, { ...before, ...fields });
    revalidateHnv();
    return ok("Chapter saved.");
  }

  const slug = await uniqueSlug("chapters", fields.editionId, str(form, "slug") || fields.titleEn || fields.title);
  const [{ top }] = await db.select({ top: max(chapters.sort) }).from(chapters).where(eq(chapters.editionId, fields.editionId));
  const [created] = await db
    .insert(chapters)
    .values({ ...fields, slug, sort: (top ?? 0) + 10 })
    .returning();
  await log(user, "chapters", created.id, "create", null, created);
  revalidateHnv();
  const [ed] = await db.select({ slug: editions.slug }).from(editions).where(eq(editions.id, fields.editionId));
  redirect(`/admin/hnv/${ed.slug}/chapters/${created.id}`);
}

export async function moveChapter(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const dir = str(form, "dir") === "up" ? "up" : "down";
  const db = getDb();
  const [ch] = await db.select().from(chapters).where(eq(chapters.id, id)).limit(1);
  if (!ch) return fail("That chapter no longer exists.");
  const [other] = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.editionId, ch.editionId), dir === "up" ? lt(chapters.sort, ch.sort) : gt(chapters.sort, ch.sort)))
    .orderBy(dir === "up" ? desc(chapters.sort) : asc(chapters.sort))
    .limit(1);
  if (!other) return ok("Already at the " + (dir === "up" ? "top." : "bottom."));
  await db.batch([
    db.update(chapters).set({ sort: other.sort }).where(eq(chapters.id, ch.id)),
    db.update(chapters).set({ sort: ch.sort }).where(eq(chapters.id, other.id)),
  ]);
  await resequenceChapters(ch.editionId);
  revalidateHnv();
  return ok("Moved.");
}

export async function deleteChapter(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const db = getDb();
  const [ch] = await db.select().from(chapters).where(eq(chapters.id, id)).limit(1);
  if (!ch) return fail("That chapter no longer exists.");
  const [{ n }] = await db.select({ n: count() }).from(sutras).where(eq(sutras.chapterId, id));
  if (n > 0) return fail(`This chapter still has ${n} sūtras. Delete or move them first.`);
  try {
    await db.delete(chapters).where(eq(chapters.id, id));
  } catch {
    return fail("This chapter is still used elsewhere (for example by Practice topics), so it can't be deleted.");
  }
  await log(user, "chapters", id, "delete", ch, null);
  revalidateHnv();
  const [ed] = await db.select({ slug: editions.slug }).from(editions).where(eq(editions.id, ch.editionId));
  redirect(`/admin/hnv/${ed.slug}`);
}

// =========================================================== sections ====
export async function addSection(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const p = z
    .object({ chapterId: Id, title: Plain(200).min(1, "Give the section a title."), after: z.string() })
    .safeParse({ chapterId: str(form, "chapterId"), title: str(form, "title"), after: str(form, "after") });
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the form.");
  const { chapterId, title, after } = p.data;
  const db = getDb();
  let sort: number;
  if (after === "start") sort = -5;
  else if (after && after !== "end") {
    const [a] = await db.select().from(subchapters).where(eq(subchapters.id, Number(after))).limit(1);
    sort = (a?.sort ?? 0) + 5;
  } else {
    const [{ top }] = await db.select({ top: max(subchapters.sort) }).from(subchapters).where(eq(subchapters.chapterId, chapterId));
    sort = (top ?? 0) + 10;
  }
  const slug = await uniqueSlug("subchapters", chapterId, title);
  const [created] = await db.insert(subchapters).values({ chapterId, title, slug, sort }).returning();
  await resequenceSections(chapterId);
  await log(user, "subchapters", created.id, "create", null, created);
  revalidateHnv();
  return ok(`Section “${title}” added.`);
}

export async function renameSection(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const p = z.object({ id: Id, title: Plain(200).min(1, "The title can't be empty.") }).safeParse({
    id: str(form, "id"),
    title: str(form, "title"),
  });
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the form.");
  const db = getDb();
  const [before] = await db.select().from(subchapters).where(eq(subchapters.id, p.data.id)).limit(1);
  if (!before) return fail("That section no longer exists.");
  await db.update(subchapters).set({ title: p.data.title }).where(eq(subchapters.id, p.data.id));
  await log(user, "subchapters", before.id, "update", before, { ...before, title: p.data.title });
  revalidateHnv();
  return ok("Renamed.");
}

export async function moveSection(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const dir = str(form, "dir") === "up" ? "up" : "down";
  const db = getDb();
  const [sec] = await db.select().from(subchapters).where(eq(subchapters.id, id)).limit(1);
  if (!sec) return fail("That section no longer exists.");
  const [other] = await db
    .select()
    .from(subchapters)
    .where(and(eq(subchapters.chapterId, sec.chapterId), dir === "up" ? lt(subchapters.sort, sec.sort) : gt(subchapters.sort, sec.sort)))
    .orderBy(dir === "up" ? desc(subchapters.sort) : asc(subchapters.sort))
    .limit(1);
  if (!other) return ok("Already at the " + (dir === "up" ? "top." : "bottom."));
  await db.batch([
    db.update(subchapters).set({ sort: other.sort }).where(eq(subchapters.id, sec.id)),
    db.update(subchapters).set({ sort: sec.sort }).where(eq(subchapters.id, other.id)),
  ]);
  await resequenceSections(sec.chapterId);
  await resequenceChapter(sec.chapterId);
  revalidateHnv();
  return ok("Moved. Sūtra numbers were not changed.");
}

export async function deleteSection(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const mode = str(form, "mode"); // "" | "prev" | "next"
  const db = getDb();
  const [sec] = await db.select().from(subchapters).where(eq(subchapters.id, id)).limit(1);
  if (!sec) return fail("That section no longer exists.");
  const [{ n }] = await db.select({ n: count() }).from(sutras).where(eq(sutras.subchapterId, id));

  if (n > 0) {
    if (mode !== "prev" && mode !== "next") {
      return fail(`This section has ${n} sūtras. Choose where they go, or delete the sūtras first.`);
    }
    const [target] = await db
      .select()
      .from(subchapters)
      .where(
        and(
          eq(subchapters.chapterId, sec.chapterId),
          ne(subchapters.id, id),
          mode === "prev" ? lt(subchapters.sort, sec.sort) : gt(subchapters.sort, sec.sort)
        )
      )
      .orderBy(mode === "prev" ? desc(subchapters.sort) : asc(subchapters.sort))
      .limit(1);
    if (!target) return fail(`There is no ${mode === "prev" ? "previous" : "next"} section to move the sūtras into.`);
    await db.batch([
      db.update(sutras).set({ subchapterId: target.id, updatedBy: user.id }).where(eq(sutras.subchapterId, id)),
      db.delete(subchapters).where(eq(subchapters.id, id)),
    ]);
    await resequenceChapter(sec.chapterId);
    await log(user, "subchapters", id, "delete", sec, null, `${n} sūtras moved into “${target.title}”`);
    revalidateHnv();
    return ok(`Section deleted; its ${n} sūtras now belong to “${target.title}”.`);
  }

  await db.delete(subchapters).where(eq(subchapters.id, id));
  await resequenceSections(sec.chapterId);
  await log(user, "subchapters", id, "delete", sec, null);
  revalidateHnv();
  return ok("Section deleted.");
}

// ============================================================= sūtras ====
const CoreInput = z.object({
  number: NumberText,
  subchapterId: Id,
  sanskrit: Plain(4000),
  transliteration: Plain(4000),
  brhatNumber: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9A-Za-z.\-]*$/, "Bṛhat sūtra number: digits, letters, dots or a hyphen only."),
  synonyms: Rich,
  vrtti: Rich,
  translation: Rich,
  status: Status,
});

function readCore(form: FormData) {
  // One sūtra text in any script (IAST preferred). It goes to the column of
  // its own script; the other is left empty and derived on the site.
  const one = form.has("sutraText") ? str(form, "sutraText").trim() : null;
  const indic = one !== null && /[\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F]/.test(one);
  return CoreInput.safeParse({
    number: str(form, "number"),
    subchapterId: str(form, "subchapterId"),
    sanskrit: one === null ? str(form, "sanskrit") : indic ? one : "",
    transliteration: one === null ? str(form, "transliteration") : indic ? "" : one,
    brhatNumber: str(form, "brhatNumber"),
    synonyms: str(form, "synonyms"),
    vrtti: str(form, "vrtti"),
    translation: str(form, "translation"),
    status: str(form, "status") || "published",
  });
}

/** Commentary fields are named c_<typeId> (HTML) and cs_<typeId> (status). */
async function saveCommentaries(user: SessionUser, sutraId: number, editionId: number, form: FormData) {
  const db = getDb();
  const types = await db.select().from(commentaryTypes).where(eq(commentaryTypes.editionId, editionId));
  const existing = await db.select().from(sutraCommentaries).where(eq(sutraCommentaries.sutraId, sutraId));
  let changed = 0;
  for (const t of types) {
    if (!form.has(`c_${t.id}`)) continue;
    const html = sanitizeRich(str(form, `c_${t.id}`));
    let status = Status.catch("published").parse(str(form, `cs_${t.id}`) || "published");
    if (user.role === "contributor") status = "draft";
    const prev = existing.find((e) => e.commentaryTypeId === t.id);
    if (!html) {
      if (prev) {
        await db.delete(sutraCommentaries).where(eq(sutraCommentaries.id, prev.id));
        await log(user, "sutra_commentaries", prev.id, "delete", prev, null);
        changed++;
      }
      continue;
    }
    if (prev && prev.html === html && prev.status === status) continue;
    if (prev) {
      await db.update(sutraCommentaries).set({ html, status, updatedBy: user.id }).where(eq(sutraCommentaries.id, prev.id));
      await log(user, "sutra_commentaries", prev.id, "update", prev, { ...prev, html, status });
    } else {
      const [c] = await db
        .insert(sutraCommentaries)
        .values({ sutraId, commentaryTypeId: t.id, html, status, updatedBy: user.id })
        .returning();
      await log(user, "sutra_commentaries", c.id, "create", null, c);
    }
    changed++;
  }
  return changed;
}

export async function saveSutra(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("contributor");
  const id = Id.safeParse(str(form, "id"));
  if (!id.success) return fail("Missing sūtra id.");
  const db = getDb();
  const [before] = await db.select().from(sutras).where(eq(sutras.id, id.data)).limit(1);
  if (!before) return fail("That sūtra no longer exists.");

  if (user.role === "contributor") {
    const n = await saveCommentaries(user, before.id, before.editionId, form);
    revalidateHnv();
    return ok(
      n
        ? "Commentary saved as a draft. An editor will publish it. (Contributors can't change the sūtra text itself.)"
        : "Nothing changed."
    );
  }

  const p = readCore(form);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the form.");
  const fields = p.data;

  if (fields.number !== before.number) {
    const [clash] = await db
      .select({ id: sutras.id })
      .from(sutras)
      .where(and(eq(sutras.editionId, before.editionId), eq(sutras.number, fields.number)))
      .limit(1);
    if (clash) return fail(`Number ${fields.number} is already used by another sūtra. Pick a free number.`);
  }

  const [sec] = await db.select().from(subchapters).where(eq(subchapters.id, fields.subchapterId)).limit(1);
  if (!sec || sec.chapterId !== before.chapterId) return fail("Pick a section from this chapter.");
  const movedSection = fields.subchapterId !== before.subchapterId;

  await db
    .update(sutras)
    .set({ ...fields, ...(movedSection ? { position: 1_000_000 } : {}), updatedBy: user.id })
    .where(eq(sutras.id, before.id));
  if (movedSection) await resequenceChapter(before.chapterId);
  await log(user, "sutras", before.id, "update", before, { ...before, ...fields });
  const n = await saveCommentaries(user, before.id, before.editionId, form);
  revalidateHnv();
  return ok(`Sūtra ${fields.number} saved${n ? ` (with ${n} commentary change${n === 1 ? "" : "s"})` : ""}.`);
}

export async function createSutra(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const p = readCore(form);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the form.");
  const fields = p.data;
  const afterId = Number(str(form, "afterId")) || 0;
  const shift = str(form, "shift") === "on";
  const db = getDb();

  const [sec] = await db.select().from(subchapters).where(eq(subchapters.id, fields.subchapterId)).limit(1);
  if (!sec) return fail("That section no longer exists.");
  const [ch] = await db.select().from(chapters).where(eq(chapters.id, sec.chapterId)).limit(1);

  // Where it goes: right after `afterId`, else at the start of the section.
  let position: number;
  if (afterId) {
    const [a] = await db.select().from(sutras).where(eq(sutras.id, afterId)).limit(1);
    if (!a || a.subchapterId !== sec.id) return fail("The sūtra to insert after is not in that section.");
    position = a.position + 5;
  } else {
    const [{ lo }] = await db.select({ lo: min(sutras.position) }).from(sutras).where(eq(sutras.subchapterId, sec.id));
    position = lo === null ? 0 : lo - 5;
  }

  const [clash] = await db
    .select({ id: sutras.id })
    .from(sutras)
    .where(and(eq(sutras.editionId, ch.editionId), eq(sutras.number, fields.number)))
    .limit(1);
  const parsed = parseNumber(fields.number);
  if (clash && !(shift && parsed)) {
    return fail(`Number ${fields.number} is already used. Tick “renumber the following sūtras”, or pick a free number.`);
  }

  const [created] = await db
    .insert(sutras)
    .values({
      ...fields,
      editionId: ch.editionId,
      chapterId: ch.id,
      position,
      // Temporary unique number; set to the real one in the batch below.
      number: `~new~${Date.now()}`,
      updatedBy: user.id,
    })
    .returning({ id: sutras.id });

  try {
    await db.batch([
      ...(clash && parsed ? shiftUp(ch.editionId, parsed.prefix, parsed.n) : []),
      db.update(sutras).set({ number: fields.number }).where(eq(sutras.id, created.id)),
    ] as unknown as Parameters<typeof db.batch>[0]);
  } catch (err) {
    await db.delete(sutras).where(eq(sutras.id, created.id));
    console.error("[createSutra]", err);
    return fail("Could not insert the sūtra (the numbers were left unchanged). Please try again.");
  }

  await resequenceChapter(ch.id);
  await log(user, "sutras", created.id, "create", null, { ...fields, chapterId: ch.id }, clash ? "following sūtras renumbered +1" : "");
  await saveCommentaries(user, created.id, ch.editionId, form);
  revalidateHnv();
  redirect(`/admin/hnv/sutras/${created.id}?created=1`);
}

export async function deleteSutra(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const closeGap = str(form, "closeGap") === "on";
  const db = getDb();
  const [s] = await db.select().from(sutras).where(eq(sutras.id, id)).limit(1);
  if (!s) return fail("That sūtra no longer exists.");
  const comms = await db.select().from(sutraCommentaries).where(eq(sutraCommentaries.sutraId, id));
  const parsed = parseNumber(s.number);

  await db.batch([
    db.insert(revisions).values({
      entityTable: "sutras",
      entityId: id,
      action: "delete",
      before: { ...s, commentaries: comms },
      after: null,
      userId: user.id,
      note: closeGap ? "following sūtras renumbered −1" : "",
    }),
    db.delete(sutras).where(eq(sutras.id, id)),
    ...(closeGap && parsed ? shiftDown(s.editionId, parsed.prefix, parsed.n) : []),
  ] as unknown as Parameters<typeof db.batch>[0]);

  await resequenceChapter(s.chapterId);
  revalidateHnv();
  const [ed] = await db.select({ slug: editions.slug }).from(editions).where(eq(editions.id, s.editionId));
  redirect(`/admin/hnv/${ed.slug}/chapters/${s.chapterId}?deleted=${encodeURIComponent(s.number)}#sec-${s.subchapterId}`);
}

/** How many sūtras a renumber would touch (shown before inserting/deleting). */
export async function countFollowing(editionId: number, number: string): Promise<number> {
  await requireUser("viewer");
  const p = parseNumber(number);
  if (!p) return 0;
  const [{ n }] = await getDb()
    .select({ n: count() })
    .from(sutras)
    .where(
      and(
        eq(sutras.editionId, editionId),
        sql`${sutras.number} ~ ${prefixRegex(p.prefix)}`,
        sql`(regexp_match(${sutras.number}, '([0-9]+)$'))[1]::int >= ${p.n}`
      )
    );
  return n;
}

// ======================================================= commentaries ====
const TypeInput = z.object({
  id: Id.optional(),
  editionId: Id,
  name: Plain(120).min(1, "Give the commentary a name."),
  author: Plain(160),
  description: Plain(1000),
  isVisible: z.boolean(),
});

export async function saveCommentaryType(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const p = TypeInput.safeParse({
    id: str(form, "id") || undefined,
    editionId: str(form, "editionId"),
    name: str(form, "name"),
    author: str(form, "author"),
    description: str(form, "description"),
    isVisible: str(form, "isVisible") === "on",
  });
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the form.");
  const { id, ...fields } = p.data;
  const db = getDb();
  if (id) {
    const [before] = await db.select().from(commentaryTypes).where(eq(commentaryTypes.id, id)).limit(1);
    if (!before) return fail("That commentary no longer exists.");
    await db.update(commentaryTypes).set({ ...fields, updatedBy: user.id }).where(eq(commentaryTypes.id, id));
    await log(user, "commentary_types", id, "update", before, { ...before, ...fields });
    revalidateHnv();
    return ok(`“${fields.name}” saved.`);
  }
  const base = slugifyTitle(fields.name).replace(/-/g, "_");
  const taken = new Set(
    (await db.select({ key: commentaryTypes.key }).from(commentaryTypes).where(eq(commentaryTypes.editionId, fields.editionId))).map((r) => r.key)
  );
  let key = base;
  for (let i = 2; taken.has(key); i++) key = `${base}_${i}`;
  const [{ top }] = await db.select({ top: max(commentaryTypes.sort) }).from(commentaryTypes).where(eq(commentaryTypes.editionId, fields.editionId));
  const [created] = await db
    .insert(commentaryTypes)
    .values({ ...fields, key, sort: (top ?? 0) + 10, updatedBy: user.id })
    .returning();
  await log(user, "commentary_types", created.id, "create", null, created);
  revalidateHnv();
  return ok(`“${fields.name}” added. It now appears on every sūtra's edit page.`);
}

export async function moveCommentaryType(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const dir = str(form, "dir") === "up" ? "up" : "down";
  const db = getDb();
  const [t] = await db.select().from(commentaryTypes).where(eq(commentaryTypes.id, id)).limit(1);
  if (!t) return fail("That commentary no longer exists.");
  const [other] = await db
    .select()
    .from(commentaryTypes)
    .where(and(eq(commentaryTypes.editionId, t.editionId), dir === "up" ? lt(commentaryTypes.sort, t.sort) : gt(commentaryTypes.sort, t.sort)))
    .orderBy(dir === "up" ? desc(commentaryTypes.sort) : asc(commentaryTypes.sort))
    .limit(1);
  if (!other) return ok("Already at the " + (dir === "up" ? "top." : "bottom."));
  await db.batch([
    db.update(commentaryTypes).set({ sort: other.sort }).where(eq(commentaryTypes.id, t.id)),
    db.update(commentaryTypes).set({ sort: t.sort }).where(eq(commentaryTypes.id, other.id)),
  ]);
  await resequenceCommentaryTypes(t.editionId);
  revalidateHnv();
  return ok("Moved.");
}

export async function deleteCommentaryType(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const db = getDb();
  const [t] = await db.select().from(commentaryTypes).where(eq(commentaryTypes.id, id)).limit(1);
  if (!t) return fail("That commentary no longer exists.");
  const entries = await db.select().from(sutraCommentaries).where(eq(sutraCommentaries.commentaryTypeId, id));
  if (entries.length && str(form, "confirm").trim().toLowerCase() !== "delete") {
    return fail(`It has text on ${entries.length} sūtras. Type DELETE in the box to remove it and all that text.`);
  }
  await db.batch([
    db.insert(revisions).values({
      entityTable: "commentary_types",
      entityId: id,
      action: "delete",
      before: { ...t, entries },
      after: null,
      userId: user.id,
    }),
    db.delete(commentaryTypes).where(eq(commentaryTypes.id, id)),
  ]);
  revalidateHnv();
  return ok(`“${t.name}” deleted${entries.length ? ` with its text on ${entries.length} sūtras (kept in the history log)` : ""}.`);
}

// ============================================================== misc =====
/** Publish every draft commentary of one sūtra (editors reviewing contributor work). */
export async function publishSutraDrafts(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const db = getDb();
  const drafts = await db
    .select({ id: sutraCommentaries.id })
    .from(sutraCommentaries)
    .where(and(eq(sutraCommentaries.sutraId, id), eq(sutraCommentaries.status, "draft")));
  if (!drafts.length) return ok("No drafts to publish.");
  await db
    .update(sutraCommentaries)
    .set({ status: "published", updatedBy: user.id })
    .where(inArray(sutraCommentaries.id, drafts.map((d) => d.id)));
  revalidateHnv();
  return ok(`Published ${drafts.length} draft${drafts.length === 1 ? "" : "s"}.`);
}

// ============================================================== audio ====
/** Recitation audio of a chapter and its sections: links only (one per line), never files. */
export async function saveChapterAudio(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "chapterId"));
  const clean = (v: string) => {
    const lines = v.split(/\s*\n\s*/).map((x) => x.trim()).filter(Boolean);
    const bad = lines.find((l) => !/^https?:\/\/\S+$/.test(l));
    if (bad) throw new Error(`Not a link: ${bad.slice(0, 80)}`);
    return lines.join("\n");
  };
  const db = getDb();
  try {
    const [before] = await db.select().from(chapters).where(eq(chapters.id, id)).limit(1);
    if (!before) return fail("That chapter no longer exists.");
    const audio = clean(str(form, "audio"));
    await db.update(chapters).set({ audio, updatedBy: user.id }).where(eq(chapters.id, id));
    const secs = await db.select().from(subchapters).where(eq(subchapters.chapterId, id));
    for (const s of secs) {
      const v = form.get(`sec-${s.id}`);
      if (typeof v !== "string") continue;
      const a = clean(v);
      if (a !== s.audio) await db.update(subchapters).set({ audio: a }).where(eq(subchapters.id, s.id));
    }
    await log(user, "chapters", id, "update", before, { ...before, audio });
  } catch (e) {
    return fail((e as Error).message);
  }
  revalidateHnv();
  return ok("Recitation links saved.");
}
