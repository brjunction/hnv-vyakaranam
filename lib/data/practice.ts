import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { chapters, editions, practiceQuestions, practiceTopics, sutras } from "@/lib/db/schema";
import { isDbConfigured } from "@/lib/env";
import { tags } from "@/lib/data/tags";
import type { Difficulty, PracticeChapter, PracticeType, Question, SutraLine } from "@/lib/practiceData";

// Public read of the practice bank (Madhyama chapters → topics → questions).
// Cached with the "practice" tag; admin saves revalidate it.

export type PracticeData = { chapters: PracticeChapter[]; questions: Question[]; /** declension tables for Nāma Grid (type "paradigm": options = 24 forms) */ paradigms: Question[]; /** sūtras of each prakaraṇa in order (Sūtra Order) */ sutraLines: Record<string, SutraLine[]>; sutraSpan: string };

async function read(): Promise<PracticeData> {
  if (!isDbConfigured) return { chapters: [], questions: [], paradigms: [], sutraLines: {}, sutraSpan: "" };
  const db = getDb();
  const [ed] = await db.select().from(editions).where(eq(editions.slug, "madhyama")).limit(1);
  if (!ed) return { chapters: [], questions: [], paradigms: [], sutraLines: {}, sutraSpan: "" };
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

  // The sūtra text behind each answer (refs like "42" or "M 42" → Madhyama sūtra 42).
  const numOf = (ref: string) => ref.split(/[\/,;]+/).map((x) => x.trim()).map((x) => /^(?:M\s*)?(\d+(?:\.\d+)*)$/i.exec(x)?.[1]).filter((x): x is string => !!x);
  const wanted = [...new Set(qs.flatMap((q) => q.sutraRefs.flatMap(numOf)))];
  const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const texts = wanted.length
    ? await db
        .select({ number: sutras.number, sanskrit: sutras.sanskrit, iast: sutras.transliteration, translation: sutras.translation })
        .from(sutras)
        .where(and(eq(sutras.editionId, ed.id), eq(sutras.status, "published"), inArray(sutras.number, wanted)))
    : [];
  const textOf = new Map(texts.map((t) => [t.number, { number: t.number, sanskrit: strip(t.sanskrit), iast: strip(t.iast), translation: strip(t.translation) }]));

  const chapterOfTopic = new Map(topics.map((t) => [t.id, chs.find((c) => c.id === t.chapterId)?.slug ?? ""]));
  const all: Question[] = qs
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
      sutras: [...new Set(q.sutraRefs.flatMap(numOf))].map((n) => textOf.get(n)).filter((x): x is NonNullable<typeof x> => !!x),
    }));
  const paradigms = all.filter((q) => q.type === "paradigm");
  const questions = all.filter((q) => q.type !== "paradigm");
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
  // The sūtras of each prakaraṇa, in book order, for Sūtra Order.
  const sutraLines: Record<string, SutraLine[]> = {};
  if (chs.length) {
    const rows = await db
      .select({ chapterId: sutras.chapterId, number: sutras.number, iast: sutras.transliteration })
      .from(sutras)
      .where(and(eq(sutras.editionId, ed.id), eq(sutras.status, "published"), inArray(sutras.chapterId, chs.map((c) => c.id))))
      .orderBy(asc(sutras.chapterId), asc(sutras.position));
    for (const r of rows) {
      const slug = chs.find((c) => c.id === r.chapterId)?.slug;
      const iast = strip(r.iast);
      if (slug && iast) (sutraLines[slug] ??= []).push({ number: r.number, iast });
    }
  }
  return { chapters: list, questions, paradigms, sutraLines, sutraSpan };
}

export function getPracticeData(): Promise<PracticeData> {
  return unstable_cache(read, ["practice:v6"], { tags: [tags.practice], revalidate: 86400 })();
}
