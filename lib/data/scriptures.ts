import "server-only";
import { unstable_cache } from "next/cache";
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
import { isDbConfigured } from "@/lib/env";
import { tags } from "@/lib/data/tags";
import {
  parseVerseKey,
  type BookInfo,
  type CommentaryType,
  type DivisionData,
  type TreeNode,
  type VerseData,
} from "@/lib/scriptures/core";

// Public reads for the Scriptures module. Everything is cached with tags
// (tags.scrAll + tags.scriptureBook(code)); every admin save revalidates
// them, so the static pages refresh right after an edit. Only published
// rows are ever returned here. Errors THROW (never cached as "empty").

type BookRow = typeof books.$inferSelect;

export function toBookInfo(b: BookRow): BookInfo {
  return {
    id: b.id,
    code: b.code,
    title: b.title,
    titleDeva: b.titleDeva,
    tagline: b.tagline,
    description: b.description,
    author: b.author,
    abbrev: b.abbrev,
    levels: b.levels?.length ? b.levels : ["Chapter"],
    verseLabel: b.verseLabel,
    verseLabelPlural: b.verseLabelPlural,
    verseLanguage: b.verseLanguage,
    coverUrl: b.coverUrl,
    introHtml: b.introHtml,
    status: b.status,
    categoryId: b.categoryId,
  };
}

export type BookCard = BookInfo & { divisions: number; verses: number; expected: number | null };

export const getBooks = unstable_cache(
  async (): Promise<BookCard[]> => {
    if (!isDbConfigured) return [];
    const db = getDb();
    const rows = await db.select().from(books).where(eq(books.status, "published")).orderBy(asc(books.sort), asc(books.id));
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const [verseCounts, divCounts] = await Promise.all([
      db
        .select({ bookId: scriptureVerses.bookId, n: sql<number>`count(*)::int` })
        .from(scriptureVerses)
        .where(and(inArray(scriptureVerses.bookId, ids), eq(scriptureVerses.status, "published")))
        .groupBy(scriptureVerses.bookId),
      db
        .select({ bookId: scriptureDivisions.bookId, n: sql<number>`count(*)::int` })
        .from(scriptureDivisions)
        .where(and(inArray(scriptureDivisions.bookId, ids), eq(scriptureDivisions.status, "published"), sql`${scriptureDivisions.parentId} is null`))
        .groupBy(scriptureDivisions.bookId),
    ]);
    return rows.map((b) => ({
      ...toBookInfo(b),
      verses: verseCounts.find((v) => v.bookId === b.id)?.n ?? 0,
      divisions: divCounts.find((v) => v.bookId === b.id)?.n ?? 0,
      expected: null,
    }));
  },
  ["scr:books:v2"],
  { tags: [tags.scrAll] }
);

export type Category = { id: number; key: string; name: string; description: string; section: string; sort: number };

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    if (!isDbConfigured) return [];
    const rows = await getDb().select().from(scriptureCategories).orderBy(asc(scriptureCategories.sort), asc(scriptureCategories.id));
    return rows.map((c) => ({ id: c.id, key: c.key, name: c.name, description: c.description, section: c.section, sort: c.sort }));
  },
  ["scr:cats:v1"],
  { tags: [tags.scrAll] }
);

const bookByCode = (code: string) =>
  unstable_cache(
    async (): Promise<BookInfo | null> => {
      if (!isDbConfigured) return null;
      const [b] = await getDb()
        .select()
        .from(books)
        .where(and(eq(books.code, code), eq(books.status, "published")))
        .limit(1);
      return b ? toBookInfo(b) : null;
    },
    ["scr:book:v1", code],
    { tags: [tags.scrAll, tags.scriptureBook(code)] }
  )();

export async function getBook(code: string) {
  return bookByCode(code.toLowerCase());
}

/** Build the published tree (a division is hidden when any ancestor is unpublished). */
export async function buildTree(bookId: number, opts: { all?: boolean } = {}): Promise<TreeNode[]> {
  const db = getDb();
  const divs = await db
    .select()
    .from(scriptureDivisions)
    .where(opts.all ? eq(scriptureDivisions.bookId, bookId) : and(eq(scriptureDivisions.bookId, bookId), eq(scriptureDivisions.status, "published")))
    .orderBy(asc(scriptureDivisions.position), asc(scriptureDivisions.id));
  const stats = await db
    .select({
      divisionId: scriptureVerses.divisionId,
      n: sql<number>`count(*)::int`,
      first: sql<string>`(array_agg(${scriptureVerses.key} order by ${scriptureVerses.position}, ${scriptureVerses.id}))[1]`,
      last: sql<string>`(array_agg(${scriptureVerses.key} order by ${scriptureVerses.position} desc, ${scriptureVerses.id} desc))[1]`,
    })
    .from(scriptureVerses)
    .where(opts.all ? eq(scriptureVerses.bookId, bookId) : and(eq(scriptureVerses.bookId, bookId), eq(scriptureVerses.status, "published")))
    .groupBy(scriptureVerses.divisionId);
  const byId = new Map(divs.map((d) => [d.id, d]));
  const statOf = new Map(stats.map((s) => [s.divisionId, s]));
  const pathOf = (id: number): string[] | null => {
    const out: string[] = [];
    let cur = byId.get(id);
    let guard = 0;
    while (cur && guard++ < 20) {
      out.unshift(cur.key);
      if (cur.parentId == null) return out;
      cur = byId.get(cur.parentId);
    }
    return null; // an ancestor is missing (unpublished)
  };
  const out: TreeNode[] = [];
  for (const d of divs) {
    const path = pathOf(d.id);
    if (!path) continue;
    const s = statOf.get(d.id);
    out.push({
      id: d.id,
      parentId: d.parentId,
      depth: d.depth,
      key: d.key,
      number: d.number || d.key,
      title: d.title,
      titleDeva: d.titleDeva,
      subtitle: d.subtitle,
      expected: d.expectedChildren,
      verses: s?.n ?? 0,
      firstVerse: s?.first ?? null,
      lastVerse: s?.last ?? null,
      hasBody: Boolean(d.bodyHtml.trim()),
      path,
    });
  }
  return out;
}

export async function getTree(code: string): Promise<TreeNode[]> {
  const c = code.toLowerCase();
  return unstable_cache(
    async () => {
      const book = await getBook(c);
      if (!book) return [];
      return buildTree(book.id);
    },
    ["scr:tree:v1", c],
    { tags: [tags.scrAll, tags.scriptureBook(c)] }
  )();
}

function findDivision(tree: TreeNode[], path: string[]): TreeNode | null {
  let parent: number | null = null;
  let node: TreeNode | null = null;
  for (const seg of path) {
    node = tree.find((n) => n.parentId === parent && n.key.toLowerCase() === seg.toLowerCase()) ?? null;
    if (!node) return null;
    parent = node.id;
  }
  return node;
}

export type Resolved =
  | { kind: "book" }
  | { kind: "division"; node: TreeNode }
  | { kind: "verse"; node: TreeNode; key: string }
  | { kind: "redirect"; to: string[] }
  | null;

/** Turn URL segments into a division, a verse, or a redirect ("17" → "16-18"). */
export async function resolvePath(code: string, segs: string[]): Promise<Resolved> {
  if (!segs.length) return { kind: "book" };
  const tree = await getTree(code);
  const div = findDivision(tree, segs);
  if (div) return { kind: "division", node: div };
  const parent = findDivision(tree, segs.slice(0, -1));
  if (!parent) return null;
  const key = segs[segs.length - 1];
  const data = await getDivisionData(code, parent.path);
  if (!data) return null;
  if (data.verses.some((v) => v.key === key)) return { kind: "verse", node: parent, key };
  const n = parseVerseKey(key);
  if (n) {
    const hit = data.verses.find((v) => {
      const r = parseVerseKey(v.key);
      return r && r.from <= n.from && r.to >= n.from;
    });
    if (hit) return { kind: "redirect", to: [...parent.path, hit.key] };
  }
  return null;
}

async function loadAudio(entityType: "scripture_verse" | "scripture_division", ids: number[]) {
  if (!ids.length) return new Map<number, VerseData["audio"]>();
  const rows = await getDb()
    .select()
    .from(audioLinks)
    .where(and(eq(audioLinks.entityType, entityType), inArray(audioLinks.entityId, ids), eq(audioLinks.status, "published")))
    .orderBy(asc(audioLinks.sort), asc(audioLinks.id));
  const m = new Map<number, VerseData["audio"]>();
  for (const r of rows) {
    const list = m.get(r.entityId) ?? [];
    list.push({ title: r.title, speaker: r.speaker, url: r.url });
    m.set(r.entityId, list);
  }
  return m;
}

export function typeInfo(t: typeof scriptureCommentaryTypes.$inferSelect): CommentaryType {
  return {
    id: t.id,
    key: t.key,
    name: t.name,
    nameDeva: t.nameDeva,
    author: t.author,
    description: t.description,
    language: t.language,
    appliesTo: t.appliesTo,
    pane: t.pane,
  };
}

/** Load one division with its verses and commentaries (the chapter reader's data). */
export async function loadDivisionData(
  book: BookInfo,
  tree: TreeNode[],
  node: TreeNode,
  opts: { all?: boolean } = {}
): Promise<DivisionData> {
  const db = getDb();
  const pub = (col: typeof scriptureVerses.status | typeof scriptureCommentaries.status) => (opts.all ? sql`true` : eq(col, "published"));
  const [divRow] = await db.select().from(scriptureDivisions).where(eq(scriptureDivisions.id, node.id)).limit(1);
  const types = await db
    .select()
    .from(scriptureCommentaryTypes)
    .where(opts.all ? eq(scriptureCommentaryTypes.bookId, book.id) : and(eq(scriptureCommentaryTypes.bookId, book.id), eq(scriptureCommentaryTypes.isVisible, true)))
    .orderBy(asc(scriptureCommentaryTypes.sort), asc(scriptureCommentaryTypes.id));
  const typeIds = types.map((t) => t.id);
  const verseRows = await db
    .select()
    .from(scriptureVerses)
    .where(and(eq(scriptureVerses.divisionId, node.id), pub(scriptureVerses.status)))
    .orderBy(asc(scriptureVerses.position), asc(scriptureVerses.id));
  const verseIds = verseRows.map((v) => v.id);
  const [vComm, dComm, vAudio, dAudio] = await Promise.all([
    verseIds.length && typeIds.length
      ? db
          .select({ verseId: scriptureCommentaries.verseId, typeId: scriptureCommentaries.typeId, html: scriptureCommentaries.html })
          .from(scriptureCommentaries)
          .where(and(inArray(scriptureCommentaries.verseId, verseIds), inArray(scriptureCommentaries.typeId, typeIds), pub(scriptureCommentaries.status)))
      : Promise.resolve([]),
    typeIds.length
      ? db
          .select({ typeId: scriptureCommentaries.typeId, html: scriptureCommentaries.html })
          .from(scriptureCommentaries)
          .where(and(eq(scriptureCommentaries.divisionId, node.id), inArray(scriptureCommentaries.typeId, typeIds), pub(scriptureCommentaries.status)))
      : Promise.resolve([]),
    loadAudio("scripture_verse", verseIds),
    loadAudio("scripture_division", [node.id]),
  ]);
  const cOf = new Map<number, Record<number, string>>();
  for (const r of vComm) {
    if (!r.verseId || !r.html.trim()) continue;
    const m = cOf.get(r.verseId) ?? {};
    m[r.typeId] = r.html;
    cOf.set(r.verseId, m);
  }
  const dc: Record<number, string> = {};
  for (const r of dComm) if (r.html.trim()) dc[r.typeId] = r.html;

  return {
    book,
    division: { ...node, bodyHtml: divRow?.bodyHtml ?? "", c: dc, audio: dAudio.get(node.id) ?? [] },
    types: types.map(typeInfo),
    verses: verseRows.map((v) => ({
      id: v.id,
      key: v.key,
      verseNo: v.verseNo,
      devanagari: v.devanagari,
      iast: v.iast,
      speaker: v.speaker,
      language: v.language || book.verseLanguage || "sanskrit",
      c: cOf.get(v.id) ?? {},
      audio: vAudio.get(v.id) ?? [],
    })),
    children: tree.filter((n) => n.parentId === node.id),
  };
}

export async function getDivisionData(code: string, path: string[]): Promise<DivisionData | null> {
  const c = code.toLowerCase();
  return unstable_cache(
    async () => {
      const book = await getBook(c);
      if (!book) return null;
      const tree = await getTree(c);
      const node = findDivision(tree, path);
      if (!node) return null;
      return loadDivisionData(book, tree, node);
    },
    ["scr:div:v1", c, path.join("/")],
    { tags: [tags.scrAll, tags.scriptureBook(c)] }
  )();
}

/** All verse URLs of a book, for the sitemap. */
export async function getVersePaths(code: string): Promise<string[][]> {
  const tree = await getTree(code);
  const book = await getBook(code);
  if (!book) return [];
  const rows = await getDb()
    .select({ divisionId: scriptureVerses.divisionId, key: scriptureVerses.key })
    .from(scriptureVerses)
    .where(and(eq(scriptureVerses.bookId, book.id), eq(scriptureVerses.status, "published")));
  const byId = new Map(tree.map((n) => [n.id, n]));
  return rows.flatMap((r) => {
    const n = byId.get(r.divisionId);
    return n ? [[...n.path, r.key]] : [];
  });
}

// ------------------------------------------------------------------ search
export type SearchHit = {
  book: string;
  bookTitle: string;
  abbrev: string;
  path: string[];
  key: string | null;
  verseNo: string;
  title: string;
  snippet: string;
  where: string;
};

const strip = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

function snippet(text: string, needle: string) {
  const t = strip(text);
  const i = t.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0) return t.slice(0, 160);
  const start = Math.max(0, i - 60);
  return (start ? "…" : "") + t.slice(start, i + needle.length + 100) + (i + needle.length + 100 < t.length ? "…" : "");
}

/** Search published verses (text + commentaries) and division titles. `needles` = query in several scripts. */
export async function searchScriptures(needles: string[], bookCode?: string, limit = 40): Promise<SearchHit[]> {
  if (!isDbConfigured || !needles.length) return [];
  const db = getDb();
  const bookRows = await db.select().from(books).where(eq(books.status, "published"));
  const scope = bookCode ? bookRows.filter((b) => b.code === bookCode) : bookRows;
  if (!scope.length) return [];
  const bookIds = scope.map((b) => b.id);
  const pats = needles.map((n) => `%${n.replace(/[%_\\]/g, (m) => "\\" + m)}%`);
  const any = (col: unknown) => sql.join(pats.map((p) => sql`${col} ilike ${p}`), sql` or `);

  const [verseHits, commHits, divHits] = await Promise.all([
    db
      .select({ id: scriptureVerses.id, bookId: scriptureVerses.bookId, divisionId: scriptureVerses.divisionId, key: scriptureVerses.key, verseNo: scriptureVerses.verseNo, iast: scriptureVerses.iast, deva: scriptureVerses.devanagari })
      .from(scriptureVerses)
      .where(and(inArray(scriptureVerses.bookId, bookIds), eq(scriptureVerses.status, "published"), sql`(${any(scriptureVerses.iast)} or ${any(scriptureVerses.devanagari)})`))
      .limit(limit),
    db
      .select({ verseId: scriptureVerses.id, bookId: scriptureVerses.bookId, divisionId: scriptureVerses.divisionId, key: scriptureVerses.key, verseNo: scriptureVerses.verseNo, html: scriptureCommentaries.html, type: scriptureCommentaryTypes.name })
      .from(scriptureCommentaries)
      .innerJoin(scriptureVerses, eq(scriptureVerses.id, scriptureCommentaries.verseId))
      .innerJoin(scriptureCommentaryTypes, eq(scriptureCommentaryTypes.id, scriptureCommentaries.typeId))
      .where(and(inArray(scriptureVerses.bookId, bookIds), eq(scriptureVerses.status, "published"), eq(scriptureCommentaries.status, "published"), eq(scriptureCommentaryTypes.isVisible, true), sql`(${any(scriptureCommentaries.html)})`))
      .limit(limit),
    db
      .select({ id: scriptureDivisions.id, bookId: scriptureDivisions.bookId, title: scriptureDivisions.title, titleDeva: scriptureDivisions.titleDeva, subtitle: scriptureDivisions.subtitle })
      .from(scriptureDivisions)
      .where(and(inArray(scriptureDivisions.bookId, bookIds), eq(scriptureDivisions.status, "published"), sql`(${any(scriptureDivisions.title)} or ${any(scriptureDivisions.titleDeva)} or ${any(scriptureDivisions.subtitle)})`))
      .limit(12),
  ]);

  const trees = new Map<number, Map<number, TreeNode>>();
  for (const b of scope) {
    const t = await getTree(b.code);
    trees.set(b.id, new Map(t.map((n) => [n.id, n])));
  }
  const bookOf = new Map(scope.map((b) => [b.id, b]));
  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  const firstNeedle = (text: string) => needles.find((n) => text.toLowerCase().includes(n.toLowerCase())) ?? needles[0];

  for (const d of divHits) {
    const node = trees.get(d.bookId)?.get(d.id);
    const b = bookOf.get(d.bookId)!;
    if (!node) continue;
    hits.push({ book: b.code, bookTitle: b.title, abbrev: b.abbrev, path: node.path, key: null, verseNo: node.path.join("."), title: d.title || d.titleDeva, snippet: d.subtitle, where: "Title" });
  }
  for (const v of verseHits) {
    const node = trees.get(v.bookId)?.get(v.divisionId);
    const b = bookOf.get(v.bookId)!;
    if (!node || seen.has(`${v.id}`)) continue;
    seen.add(`${v.id}`);
    const text = v.iast || v.deva;
    hits.push({ book: b.code, bookTitle: b.title, abbrev: b.abbrev, path: node.path, key: v.key, verseNo: v.verseNo, title: "", snippet: snippet(text.replace(/\s*\/\s*/g, " · "), firstNeedle(text)), where: "Verse" });
  }
  for (const v of commHits) {
    const node = trees.get(v.bookId)?.get(v.divisionId);
    const b = bookOf.get(v.bookId)!;
    if (!node) continue;
    const k = `${v.verseId}:${v.type}`;
    if (seen.has(k)) continue;
    seen.add(k);
    hits.push({ book: b.code, bookTitle: b.title, abbrev: b.abbrev, path: node.path, key: v.key, verseNo: v.verseNo, title: "", snippet: snippet(v.html, firstNeedle(strip(v.html))), where: v.type });
  }
  return hits.slice(0, limit);
}
