import "server-only";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { chapters, commentaryTypes, editions, subchapters, sutraCommentaries, sutras } from "@/lib/db/schema";

// Uncached reads for the admin (editors must always see the latest state).

export async function getEdition(slug: string) {
  const [e] = await getDb().select().from(editions).where(eq(editions.slug, slug)).limit(1);
  return e ?? null;
}

export async function listEditions() {
  return getDb().select().from(editions).orderBy(asc(editions.sort));
}

export async function listChaptersAdmin(editionId: number) {
  const db = getDb();
  return db
    .select({
      id: chapters.id,
      slug: chapters.slug,
      number: chapters.number,
      title: chapters.title,
      titleEn: chapters.titleEn,
      kind: chapters.kind,
      status: chapters.status,
      sort: chapters.sort,
      sutras: sql<number>`(select count(*)::int from ${sutras} where ${sutras.chapterId} = ${chapters.id})`,
      sections: sql<number>`(select count(*)::int from ${subchapters} where ${subchapters.chapterId} = ${chapters.id})`,
      first: sql<string | null>`(select number from ${sutras} where ${sutras.chapterId} = ${chapters.id} order by position limit 1)`,
      last: sql<string | null>`(select number from ${sutras} where ${sutras.chapterId} = ${chapters.id} order by position desc limit 1)`,
    })
    .from(chapters)
    .where(eq(chapters.editionId, editionId))
    .orderBy(asc(chapters.sort), asc(chapters.id));
}

export async function getChapterAdmin(chapterId: number) {
  const db = getDb();
  const [ch] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  if (!ch) return null;
  const [edition] = await db.select().from(editions).where(eq(editions.id, ch.editionId)).limit(1);
  const [sections, rows] = await Promise.all([
    db.select().from(subchapters).where(eq(subchapters.chapterId, ch.id)).orderBy(asc(subchapters.sort), asc(subchapters.id)),
    db
      .select({
        id: sutras.id,
        number: sutras.number,
        subchapterId: sutras.subchapterId,
        sanskrit: sutras.sanskrit,
        transliteration: sutras.transliteration,
        hasVrtti: sql<boolean>`${sutras.vrtti} <> ''`,
        hasTranslation: sql<boolean>`${sutras.translation} <> ''`,
        status: sutras.status,
        commentaries: sql<number>`(select count(*)::int from ${sutraCommentaries} where ${sutraCommentaries.sutraId} = ${sutras.id})`,
        drafts: sql<number>`(select count(*)::int from ${sutraCommentaries} where ${sutraCommentaries.sutraId} = ${sutras.id} and ${sutraCommentaries.status} = 'draft')`,
      })
      .from(sutras)
      .where(eq(sutras.chapterId, ch.id))
      .orderBy(asc(sutras.position), asc(sutras.id)),
  ]);
  return { chapter: ch, edition, sections, sutras: rows };
}

/** Every sūtra of an edition in reading order (chapter, section, position). */
export async function readingOrder(editionId: number) {
  return getDb()
    .select({ id: sutras.id, number: sutras.number, chapterId: sutras.chapterId, subchapterId: sutras.subchapterId })
    .from(sutras)
    .innerJoin(chapters, eq(chapters.id, sutras.chapterId))
    .leftJoin(subchapters, eq(subchapters.id, sutras.subchapterId))
    .where(eq(sutras.editionId, editionId))
    .orderBy(asc(chapters.sort), sql`coalesce(${subchapters.sort}, 2147483647)`, asc(sutras.position), asc(sutras.id));
}

export async function getSutraAdmin(id: number) {
  const db = getDb();
  const [s] = await db.select().from(sutras).where(eq(sutras.id, id)).limit(1);
  if (!s) return null;
  const [[chapter], [edition], sections, types, entries, order] = await Promise.all([
    db.select().from(chapters).where(eq(chapters.id, s.chapterId)).limit(1),
    db.select().from(editions).where(eq(editions.id, s.editionId)).limit(1),
    db.select().from(subchapters).where(eq(subchapters.chapterId, s.chapterId)).orderBy(asc(subchapters.sort)),
    db.select().from(commentaryTypes).where(eq(commentaryTypes.editionId, s.editionId)).orderBy(asc(commentaryTypes.sort), asc(commentaryTypes.id)),
    db.select().from(sutraCommentaries).where(eq(sutraCommentaries.sutraId, s.id)),
    readingOrder(s.editionId),
  ]);
  const i = order.findIndex((o) => o.id === s.id);
  return {
    sutra: s,
    chapter,
    edition,
    sections,
    types,
    entries,
    prev: i > 0 ? order[i - 1] : null,
    next: i >= 0 && i < order.length - 1 ? order[i + 1] : null,
  };
}

export async function listCommentaryTypesAdmin(editionId: number) {
  return getDb()
    .select({
      id: commentaryTypes.id,
      key: commentaryTypes.key,
      name: commentaryTypes.name,
      author: commentaryTypes.author,
      description: commentaryTypes.description,
      isVisible: commentaryTypes.isVisible,
      sort: commentaryTypes.sort,
      entries: sql<number>`(select count(*)::int from ${sutraCommentaries} where ${sutraCommentaries.commentaryTypeId} = ${commentaryTypes.id})`,
    })
    .from(commentaryTypes)
    .where(eq(commentaryTypes.editionId, editionId))
    .orderBy(asc(commentaryTypes.sort), asc(commentaryTypes.id));
}

export async function findSutraByNumber(editionId: number, number: string) {
  const [s] = await getDb()
    .select({ id: sutras.id })
    .from(sutras)
    .where(and(eq(sutras.editionId, editionId), eq(sutras.number, number.trim())))
    .limit(1);
  return s ?? null;
}

export async function countDrafts(editionId: number) {
  const [{ n }] = await getDb()
    .select({ n: count() })
    .from(sutraCommentaries)
    .innerJoin(sutras, eq(sutras.id, sutraCommentaries.sutraId))
    .where(and(eq(sutras.editionId, editionId), eq(sutraCommentaries.status, "draft")));
  return n;
}
