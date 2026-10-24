import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { chapters, editions, practiceQuestions, practiceTopics } from "@/lib/db/schema";

export async function madhyamaChapters() {
  const db = getDb();
  const [ed] = await db.select().from(editions).where(eq(editions.slug, "madhyama")).limit(1);
  if (!ed) return [];
  return db.select().from(chapters).where(eq(chapters.editionId, ed.id)).orderBy(asc(chapters.sort));
}

export async function listTopicsAdmin() {
  return getDb()
    .select({
      id: practiceTopics.id,
      chapterId: practiceTopics.chapterId,
      slug: practiceTopics.slug,
      title: practiceTopics.title,
      subtitle: practiceTopics.subtitle,
      sutraFrom: practiceTopics.sutraFrom,
      sutraTo: practiceTopics.sutraTo,
      status: practiceTopics.status,
      sort: practiceTopics.sort,
      total: sql<number>`(select count(*)::int from ${practiceQuestions} where ${practiceQuestions.topicId} = ${practiceTopics.id})`,
      published: sql<number>`(select count(*)::int from ${practiceQuestions} where ${practiceQuestions.topicId} = ${practiceTopics.id} and ${practiceQuestions.status} = 'published')`,
    })
    .from(practiceTopics)
    .orderBy(asc(practiceTopics.sort), asc(practiceTopics.id));
}

/** Question counts per chapter and difficulty (published only), for the dashboard. */
export async function levelCountsByChapter() {
  const rows = await getDb()
    .select({
      chapterId: practiceTopics.chapterId,
      difficulty: practiceQuestions.difficulty,
      n: sql<number>`count(*)::int`,
    })
    .from(practiceQuestions)
    .innerJoin(practiceTopics, eq(practiceTopics.id, practiceQuestions.topicId))
    .where(eq(practiceQuestions.status, "published"))
    .groupBy(practiceTopics.chapterId, practiceQuestions.difficulty);
  const out = new Map<number, Record<string, number>>();
  for (const r of rows) out.set(r.chapterId, { ...(out.get(r.chapterId) ?? {}), [r.difficulty]: r.n });
  return out;
}

export async function getTopicAdmin(id: number) {
  const db = getDb();
  const [t] = await db.select().from(practiceTopics).where(eq(practiceTopics.id, id)).limit(1);
  if (!t) return null;
  const [ch] = await db.select().from(chapters).where(eq(chapters.id, t.chapterId)).limit(1);
  const qs = await db.select().from(practiceQuestions).where(eq(practiceQuestions.topicId, id)).orderBy(asc(practiceQuestions.id));
  return { topic: t, chapter: ch, questions: qs };
}

export async function getQuestionAdmin(id: number) {
  const db = getDb();
  const [q] = await db.select().from(practiceQuestions).where(eq(practiceQuestions.id, id)).limit(1);
  if (!q) return null;
  const [t] = await db.select().from(practiceTopics).where(eq(practiceTopics.id, q.topicId)).limit(1);
  const [chapter] = t ? await db.select().from(chapters).where(eq(chapters.id, t.chapterId)).limit(1) : [];
  return { question: q, topic: t, chapter };
}
