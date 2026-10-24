import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { chapters, editions, practiceQuestions, practiceTopics } from "@/lib/db/schema";
import { isDbConfigured } from "@/lib/env";
import { tags } from "@/lib/data/tags";
import type { Difficulty, PracticeChapter, PracticeType, Question } from "@/lib/practiceData";

// Public read of the practice bank (Madhyama chapters → topics → questions).
// Cached with the "practice" tag; admin saves revalidate it.

export type PracticeData = { chapters: PracticeChapter[]; questions: Question[]; sutraSpan: string };

async function read(): Promise<PracticeData> {
  if (!isDbConfigured) return { chapters: [], questions: [], sutraSpan: "" };
  const db = getDb();
  const [ed] = await db.select().from(editions).where(eq(editions.slug, "madhyama")).limit(1);
  if (!ed) return { chapters: [], questions: [], sutraSpan: "" };
  const chs = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.editionId, ed.id), eq(chapters.status, "published")))
    .orderBy(asc(chapters.sort));
  const topics = chs.length
    ? await db
        .select()
        .from(practiceTopics)
        .where(and(inArray(practiceTopics.chapterId, chs.map((c) => c.id)), eq(practiceTopics.status, "published")))
        .orderBy(asc(practiceTopics.sort), asc(practiceTopics.id))
    : [];
  const qs = topics.length
    ? await db
        .select()
        .from(practiceQuestions)
        .where(and(inArray(practiceQuestions.topicId, topics.map((t) => t.id)), eq(practiceQuestions.status, "published")))
        .orderBy(asc(practiceQuestions.id))
    : [];

  const chapterOfTopic = new Map(topics.map((t) => [t.id, chs.find((c) => c.id === t.chapterId)?.slug ?? ""]));
  const questions: Question[] = qs
    .filter((q) => q.options.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length)
    .map((q) => ({
      id: q.code,
      topicSlug: String(q.topicId),
      chapter: chapterOfTopic.get(q.topicId) ?? "",
      difficulty: q.difficulty as Difficulty,
      type: q.type as PracticeType,
      prompt: q.prompt,
      promptSub: q.promptSub || undefined,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      sutraRefs: q.sutraRefs,
    }));
  const withQuestions = new Set(questions.map((q) => q.topicSlug));

  const list: PracticeChapter[] = chs.map((c) => {
    const ts = topics
      .filter((t) => t.chapterId === c.id && withQuestions.has(String(t.id)))
      .map((t) => ({ slug: String(t.id), icon: t.slug, title: t.title, subtitle: t.subtitle }));
    return { slug: c.slug, number: c.number, title: c.title, titleEn: c.titleEn, topics: ts, available: ts.length > 0 };
  });

  const used = topics.filter((t) => withQuestions.has(String(t.id)));
  const ends = used.flatMap((t) => [t.sutraFrom, t.sutraTo]).filter((x): x is string => Boolean(x));
  const nums = ends.every((x) => /^\d+$/.test(x)) ? ends.map(Number) : [];
  // Numbers → "41–86"; free text (e.g. "M 41") → first "from" – last "to".
  const sutraSpan = nums.length
    ? `${Math.min(...nums)}–${Math.max(...nums)}`
    : ends.length
      ? `${used.find((t) => t.sutraFrom)?.sutraFrom ?? ""}–${[...used].reverse().find((t) => t.sutraTo)?.sutraTo ?? ""}`
      : "";
  return { chapters: list, questions, sutraSpan };
}

export function getPracticeData(): Promise<PracticeData> {
  return unstable_cache(read, ["practice:v2"], { tags: [tags.practice], revalidate: 86400 })();
}
