import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  audioLinks,
  books,
  scriptureCategories,
  scriptureCommentaries,
  scriptureCommentaryTypes,
  scriptureDivisions,
  scriptureVerses,
} from "@/lib/db/schema";
import { buildTree, toBookInfo, typeInfo } from "@/lib/data/scriptures";
import { readingOrder, type TreeNode } from "@/lib/scriptures/core";

// Uncached reads for the Scriptures admin (all statuses).

export async function listBooksAdmin() {
  const db = getDb();
  const rows = await db.select().from(books).orderBy(asc(books.sort), asc(books.id));
  const [verses, divs, comm, types, drafts] = await Promise.all([
    db.select({ bookId: scriptureVerses.bookId, n: sql<number>`count(*)::int` }).from(scriptureVerses).groupBy(scriptureVerses.bookId),
    db.select({ bookId: scriptureDivisions.bookId, n: sql<number>`count(*)::int` }).from(scriptureDivisions).groupBy(scriptureDivisions.bookId),
    db
      .select({ bookId: scriptureCommentaryTypes.bookId, n: sql<number>`count(*)::int` })
      .from(scriptureCommentaries)
      .innerJoin(scriptureCommentaryTypes, eq(scriptureCommentaryTypes.id, scriptureCommentaries.typeId))
      .groupBy(scriptureCommentaryTypes.bookId),
    db.select({ bookId: scriptureCommentaryTypes.bookId, n: sql<number>`count(*)::int` }).from(scriptureCommentaryTypes).groupBy(scriptureCommentaryTypes.bookId),
    db
      .select({ bookId: scriptureCommentaryTypes.bookId, n: sql<number>`count(*)::int` })
      .from(scriptureCommentaries)
      .innerJoin(scriptureCommentaryTypes, eq(scriptureCommentaryTypes.id, scriptureCommentaries.typeId))
      .where(eq(scriptureCommentaries.status, "draft"))
      .groupBy(scriptureCommentaryTypes.bookId),
  ]);
  const n = (list: { bookId: number; n: number }[], id: number) => list.find((x) => x.bookId === id)?.n ?? 0;
  return rows.map((b) => ({
    ...toBookInfo(b),
    sort: b.sort,
    verses: n(verses, b.id),
    divisions: n(divs, b.id),
    commentaries: n(comm, b.id),
    types: n(types, b.id),
    drafts: n(drafts, b.id),
    updatedAt: b.updatedAt,
    categoryId: b.categoryId,
  }));
}

export async function getBookRow(code: string) {
  const [b] = await getDb().select().from(books).where(eq(books.code, code.toLowerCase())).limit(1);
  return b ?? null;
}

export type AdminNode = TreeNode & { status: string; commentaries: number };

/** Book + whole tree (all statuses) + commentary types with their entry counts. */
export async function getBookAdmin(code: string) {
  const b = await getBookRow(code);
  if (!b) return null;
  const db = getDb();
  const [tree, statusRows, commCounts, types] = await Promise.all([
    buildTree(b.id, { all: true }),
    db.select({ id: scriptureDivisions.id, status: scriptureDivisions.status }).from(scriptureDivisions).where(eq(scriptureDivisions.bookId, b.id)),
    db
      .select({ divisionId: scriptureVerses.divisionId, n: sql<number>`count(*)::int` })
      .from(scriptureCommentaries)
      .innerJoin(scriptureVerses, eq(scriptureVerses.id, scriptureCommentaries.verseId))
      .where(eq(scriptureVerses.bookId, b.id))
      .groupBy(scriptureVerses.divisionId),
    listTypesAdmin(b.id),
  ]);
  const st = new Map(statusRows.map((r) => [r.id, r.status]));
  const cc = new Map(commCounts.map((r) => [r.divisionId, r.n]));
  const nodes: AdminNode[] = tree.map((n) => ({ ...n, status: st.get(n.id) ?? "published", commentaries: cc.get(n.id) ?? 0 }));
  return { book: toBookInfo(b), row: b, tree: nodes, types };
}

export async function listTypesAdmin(bookId: number) {
  return getDb()
    .select({
      id: scriptureCommentaryTypes.id,
      key: scriptureCommentaryTypes.key,
      name: scriptureCommentaryTypes.name,
      nameDeva: scriptureCommentaryTypes.nameDeva,
      author: scriptureCommentaryTypes.author,
      description: scriptureCommentaryTypes.description,
      language: scriptureCommentaryTypes.language,
      appliesTo: scriptureCommentaryTypes.appliesTo,
      pane: scriptureCommentaryTypes.pane,
      isVisible: scriptureCommentaryTypes.isVisible,
      sort: scriptureCommentaryTypes.sort,
      entries: sql<number>`(select count(*)::int from ${scriptureCommentaries} where ${scriptureCommentaries.typeId} = ${scriptureCommentaryTypes.id})`,
    })
    .from(scriptureCommentaryTypes)
    .where(eq(scriptureCommentaryTypes.bookId, bookId))
    .orderBy(asc(scriptureCommentaryTypes.sort), asc(scriptureCommentaryTypes.id));
}

async function audioFor(entityType: "scripture_verse" | "scripture_division", id: number) {
  return getDb()
    .select({ title: audioLinks.title, speaker: audioLinks.speaker, url: audioLinks.url })
    .from(audioLinks)
    .where(and(eq(audioLinks.entityType, entityType), eq(audioLinks.entityId, id)))
    .orderBy(asc(audioLinks.sort), asc(audioLinks.id));
}

/** One division: its details, ancestors, sub-divisions, verses with commentary coverage. */
export async function getDivisionAdmin(id: number) {
  const db = getDb();
  const [d] = await db.select().from(scriptureDivisions).where(eq(scriptureDivisions.id, id)).limit(1);
  if (!d) return null;
  const [b] = await db.select().from(books).where(eq(books.id, d.bookId)).limit(1);
  const [tree, types, verses, divComm, audio] = await Promise.all([
    buildTree(b.id, { all: true }),
    listTypesAdmin(b.id),
    db.select().from(scriptureVerses).where(eq(scriptureVerses.divisionId, d.id)).orderBy(asc(scriptureVerses.position), asc(scriptureVerses.id)),
    db.select().from(scriptureCommentaries).where(eq(scriptureCommentaries.divisionId, d.id)),
    audioFor("scripture_division", d.id),
  ]);
  const verseIds = verses.map((v) => v.id);
  const coverage = verseIds.length
    ? await db
        .select({ verseId: scriptureCommentaries.verseId, typeId: scriptureCommentaries.typeId, status: scriptureCommentaries.status })
        .from(scriptureCommentaries)
        .where(inArray(scriptureCommentaries.verseId, verseIds))
    : [];
  const node = tree.find((n) => n.id === d.id)!;
  const statuses = await db.select({ id: scriptureDivisions.id, status: scriptureDivisions.status }).from(scriptureDivisions).where(eq(scriptureDivisions.parentId, d.id));
  const children = tree
    .filter((n) => n.parentId === d.id)
    .map((n) => ({ ...n, status: statuses.find((s) => s.id === n.id)?.status ?? "published" }));
  const ancestors: TreeNode[] = [];
  let cur = node?.parentId ?? null;
  while (cur != null) {
    const p = tree.find((n) => n.id === cur);
    if (!p) break;
    ancestors.unshift(p);
    cur = p.parentId;
  }
  const order = readingOrder(tree);
  const idx = order.findIndex((n) => n.id === d.id);
  const siblings = tree.filter((n) => n.parentId === d.parentId);
  const si = siblings.findIndex((n) => n.id === d.id);
  return {
    book: toBookInfo(b),
    division: d,
    node,
    ancestors,
    children,
    types,
    verses: verses.map((v) => ({
      ...v,
      cov: Object.fromEntries(coverage.filter((c) => c.verseId === v.id).map((c) => [c.typeId, c.status])) as Record<number, string>,
    })),
    divComm,
    audio,
    prev: si > 0 ? siblings[si - 1] : idx > 0 ? order[idx - 1] : null,
    next: si >= 0 && si < siblings.length - 1 ? siblings[si + 1] : idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null,
  };
}

/** One verse with everything the editor needs, plus prev/next across divisions. */
export async function getVerseAdmin(id: number) {
  const db = getDb();
  const [v] = await db.select().from(scriptureVerses).where(eq(scriptureVerses.id, id)).limit(1);
  if (!v) return null;
  const [b] = await db.select().from(books).where(eq(books.id, v.bookId)).limit(1);
  const [tree, typeRows, comm, audio, siblings] = await Promise.all([
    buildTree(b.id, { all: true }),
    db.select().from(scriptureCommentaryTypes).where(eq(scriptureCommentaryTypes.bookId, b.id)).orderBy(asc(scriptureCommentaryTypes.sort), asc(scriptureCommentaryTypes.id)),
    db.select().from(scriptureCommentaries).where(eq(scriptureCommentaries.verseId, v.id)),
    audioFor("scripture_verse", v.id),
    db
      .select({ id: scriptureVerses.id, key: scriptureVerses.key })
      .from(scriptureVerses)
      .where(eq(scriptureVerses.divisionId, v.divisionId))
      .orderBy(asc(scriptureVerses.position), asc(scriptureVerses.id)),
  ]);
  const node = tree.find((n) => n.id === v.divisionId)!;
  const ancestors: TreeNode[] = [];
  let cur: number | null = node?.id ?? null;
  while (cur != null) {
    const p = tree.find((n) => n.id === cur);
    if (!p) break;
    ancestors.unshift(p);
    cur = p.parentId;
  }
  const i = siblings.findIndex((s) => s.id === v.id);
  let prev: { id: number; label: string } | null = i > 0 ? { id: siblings[i - 1].id, label: siblings[i - 1].key } : null;
  let next: { id: number; label: string } | null = i < siblings.length - 1 ? { id: siblings[i + 1].id, label: siblings[i + 1].key } : null;
  if (!prev || !next) {
    const order = readingOrder(tree).filter((n) => n.verses > 0);
    const oi = order.findIndex((n) => n.id === v.divisionId);
    const neighbour = async (n: TreeNode | undefined, last: boolean) => {
      if (!n) return null;
      const [r] = await db
        .select({ id: scriptureVerses.id, key: scriptureVerses.key })
        .from(scriptureVerses)
        .where(eq(scriptureVerses.divisionId, n.id))
        .orderBy(last ? sql`${scriptureVerses.position} desc, ${scriptureVerses.id} desc` : sql`${scriptureVerses.position} asc, ${scriptureVerses.id} asc`)
        .limit(1);
      return r ? { id: r.id, label: [...n.path, r.key].join(".") } : null;
    };
    if (!prev && oi > 0) prev = await neighbour(order[oi - 1], true);
    if (!next && oi >= 0) next = await neighbour(order[oi + 1], false);
  }
  return {
    book: toBookInfo(b),
    verse: v,
    node,
    ancestors,
    types: typeRows.map((t) => ({ ...typeInfo(t), isVisible: t.isVisible })),
    comm,
    audio,
    prev,
    next,
    index: i,
    total: siblings.length,
    tree,
  };
}

/** "1.12.1" / "18.6" / "1.12" → admin URL of that verse or division. */
export async function findByReference(bookId: number, ref: string): Promise<string | null> {
  const parts = ref
    .trim()
    .replace(/^[a-z]{1,4}\s+/i, "")
    .split(/[\s.:/,]+/)
    .filter(Boolean);
  if (!parts.length) return null;
  const tree = await buildTree(bookId, { all: true });
  let parent: number | null = null;
  let node: TreeNode | null = null;
  let i = 0;
  for (; i < parts.length; i++) {
    const hit: TreeNode | undefined = tree.find((n) => n.parentId === parent && n.key === parts[i]);
    if (!hit) break;
    node = hit;
    parent = hit.id;
  }
  if (!node) return null;
  if (i === parts.length) return `/admin/scriptures/d/${node.id}`;
  if (i === parts.length - 1) {
    const [v] = await getDb()
      .select({ id: scriptureVerses.id })
      .from(scriptureVerses)
      .where(and(eq(scriptureVerses.divisionId, node.id), eq(scriptureVerses.key, parts[i])))
      .limit(1);
    if (v) return `/admin/scriptures/v/${v.id}`;
  }
  return `/admin/scriptures/d/${node.id}`;
}

// ------------------------------------------------------------- progress ---
/** Per-book completion: verses with text, and entries per commentary kind. */
export async function bookProgress(bookId: number) {
  const db = getDb();
  const [[totals], perType, perDivision] = await Promise.all([
    db
      .select({
        verses: sql<number>`count(*)::int`,
        withText: sql<number>`count(*) filter (where ${scriptureVerses.devanagari} <> '' or ${scriptureVerses.iast} <> '')::int`,
        drafts: sql<number>`count(*) filter (where ${scriptureVerses.status} <> 'published')::int`,
      })
      .from(scriptureVerses)
      .where(eq(scriptureVerses.bookId, bookId)),
    db
      .select({ typeId: scriptureCommentaries.typeId, n: sql<number>`count(*)::int`, drafts: sql<number>`count(*) filter (where ${scriptureCommentaries.status} = 'draft')::int` })
      .from(scriptureCommentaries)
      .innerJoin(scriptureVerses, eq(scriptureVerses.id, scriptureCommentaries.verseId))
      .where(eq(scriptureVerses.bookId, bookId))
      .groupBy(scriptureCommentaries.typeId),
    db
      .select({ divisionId: scriptureVerses.divisionId, typeId: scriptureCommentaries.typeId, n: sql<number>`count(*)::int` })
      .from(scriptureCommentaries)
      .innerJoin(scriptureVerses, eq(scriptureVerses.id, scriptureCommentaries.verseId))
      .where(eq(scriptureVerses.bookId, bookId))
      .groupBy(scriptureVerses.divisionId, scriptureCommentaries.typeId),
  ]);
  return { totals, perType, perDivision };
}

/** The next verses (in reading order) that have no entry of a kind — or no text when typeId = 0. */
export async function missingQueue(bookId: number, typeId: number, limit = 40) {
  const db = getDb();
  const tree = await buildTree(bookId, { all: true });
  const order = readingOrder(tree);
  const rank = new Map(order.map((n, i) => [n.id, i]));
  const rows = await db
    .select({ id: scriptureVerses.id, divisionId: scriptureVerses.divisionId, verseNo: scriptureVerses.verseNo, position: scriptureVerses.position, deva: scriptureVerses.devanagari, iast: scriptureVerses.iast })
    .from(scriptureVerses)
    .where(
      typeId
        ? and(
            eq(scriptureVerses.bookId, bookId),
            sql`not exists (select 1 from ${scriptureCommentaries} c where c.verse_id = ${scriptureVerses.id} and c.type_id = ${typeId} and c.html <> '')`
          )
        : and(eq(scriptureVerses.bookId, bookId), sql`${scriptureVerses.devanagari} = '' and ${scriptureVerses.iast} = ''`)
    );
  rows.sort((a, b) => (rank.get(a.divisionId) ?? 1e9) - (rank.get(b.divisionId) ?? 1e9) || a.position - b.position);
  return { total: rows.length, items: rows.slice(0, limit) };
}

/** Latest scripture edits with who made them. */
export async function recentScriptureActivity(limit = 15) {
  const { adminUsers, revisions } = await import("@/lib/db/schema");
  return getDb()
    .select({ id: revisions.id, table: revisions.entityTable, entityId: revisions.entityId, action: revisions.action, note: revisions.note, at: revisions.createdAt, who: adminUsers.name })
    .from(revisions)
    .leftJoin(adminUsers, eq(adminUsers.id, revisions.userId))
    .where(sql`${revisions.entityTable} in ('books','scripture_divisions','scripture_verses','scripture_commentaries','scripture_commentary_types')`)
    .orderBy(sql`${revisions.createdAt} desc`)
    .limit(limit);
}

export async function listCategoriesAdmin() {
  return getDb()
    .select({
      id: scriptureCategories.id,
      key: scriptureCategories.key,
      name: scriptureCategories.name,
      description: scriptureCategories.description,
      section: scriptureCategories.section,
      sort: scriptureCategories.sort,
      books: sql<number>`(select count(*)::int from ${books} where ${books.categoryId} = ${scriptureCategories.id})`,
    })
    .from(scriptureCategories)
    .orderBy(asc(scriptureCategories.sort), asc(scriptureCategories.id));
}
