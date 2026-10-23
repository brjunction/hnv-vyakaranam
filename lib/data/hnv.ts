import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  chapters,
  commentaryTypes,
  editions,
  subchapters,
  sutraCommentaries,
  sutras,
} from "@/lib/db/schema";
import { isDbConfigured } from "@/lib/env";
import { tags } from "@/lib/data/tags";
import { rangeOf } from "@/lib/hnv/numbering";

// Public reads for the HNV module (chapters → sections → sūtras →
// commentaries). Cached with tags; every admin save revalidates
// tags.hnvAll, so pages update right after an edit. On a database error the
// loaders THROW, so an error is never cached as "empty".

export type PublicCommentary = { key: string; name: string; author: string; html: string };

export type PublicSutra = {
  id: number;
  number: string;
  sanskrit: string;
  transliteration: string;
  synonyms: string;
  vrtti: string;
  translation: string;
  commentaries: PublicCommentary[];
};

export type PublicSection = { slug: string; title: string; sutras: PublicSutra[] };

export type ChapterSummary = {
  slug: string;
  /** Displayed chapter number; null for Maṅgalācaraṇa / Afterword. */
  number: number | null;
  title: string;
  titleEn: string;
  summary: string;
  kind: "sutras" | "verses";
  /** "1–86" for sūtra chapters (calculated), the typed label for verse chapters. */
  rangeLabel: string;
  sutraCount: number;
};

export type PublicChapter = ChapterSummary & { sections: PublicSection[] };

function label(kind: "sutras" | "verses", typed: string, numbers: string[]): string {
  if (kind === "verses") return typed || (numbers.length ? `${numbers.length} verses` : "");
  return rangeOf(numbers) || typed;
}

async function editionId(slug: string): Promise<number | null> {
  const [e] = await getDb()
    .select({ id: editions.id, isPublished: editions.isPublished })
    .from(editions)
    .where(eq(editions.slug, slug))
    .limit(1);
  return e && e.isPublished ? e.id : null;
}

async function readChapterList(edition: string): Promise<ChapterSummary[]> {
  if (!isDbConfigured) return [];
  const db = getDb();
  const eid = await editionId(edition);
  if (!eid) return [];
  const rows = await db
    .select({
      slug: chapters.slug,
      number: chapters.number,
      title: chapters.title,
      titleEn: chapters.titleEn,
      summary: chapters.summary,
      kind: chapters.kind,
      rangeLabel: chapters.rangeLabel,
      numbers: sql<string[]>`coalesce(array_agg(${sutras.number}) filter (where ${sutras.id} is not null), '{}')`,
    })
    .from(chapters)
    .leftJoin(sutras, and(eq(sutras.chapterId, chapters.id), eq(sutras.status, "published")))
    .where(and(eq(chapters.editionId, eid), eq(chapters.status, "published")))
    .groupBy(chapters.id)
    .orderBy(asc(chapters.sort), asc(chapters.id));
  return rows.map(({ numbers, ...c }) => ({
    ...c,
    rangeLabel: label(c.kind, c.rangeLabel, numbers),
    sutraCount: numbers.length,
  }));
}

async function readChapter(edition: string, slug: string): Promise<PublicChapter | null> {
  if (!isDbConfigured) return null;
  const db = getDb();
  const eid = await editionId(edition);
  if (!eid) return null;
  const [ch] = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.editionId, eid), eq(chapters.slug, slug), eq(chapters.status, "published")))
    .limit(1);
  if (!ch) return null;

  const [secs, rows, types] = await Promise.all([
    db.select().from(subchapters).where(eq(subchapters.chapterId, ch.id)).orderBy(asc(subchapters.sort), asc(subchapters.id)),
    db
      .select()
      .from(sutras)
      .where(and(eq(sutras.chapterId, ch.id), eq(sutras.status, "published")))
      .orderBy(asc(sutras.position), asc(sutras.id)),
    db
      .select()
      .from(commentaryTypes)
      .where(and(eq(commentaryTypes.editionId, eid), eq(commentaryTypes.isVisible, true)))
      .orderBy(asc(commentaryTypes.sort), asc(commentaryTypes.id)),
  ]);

  const entries =
    rows.length && types.length
      ? await db
          .select()
          .from(sutraCommentaries)
          .where(
            and(
              inArray(sutraCommentaries.sutraId, rows.map((r) => r.id)),
              inArray(sutraCommentaries.commentaryTypeId, types.map((t) => t.id)),
              eq(sutraCommentaries.status, "published")
            )
          )
      : [];
  const typeOrder = new Map(types.map((t, i) => [t.id, i]));
  const typeById = new Map(types.map((t) => [t.id, t]));
  const bySutra = new Map<number, PublicCommentary[]>();
  for (const e of entries.sort((a, b) => typeOrder.get(a.commentaryTypeId)! - typeOrder.get(b.commentaryTypeId)!)) {
    if (!e.html.trim()) continue;
    const t = typeById.get(e.commentaryTypeId)!;
    const list = bySutra.get(e.sutraId) ?? [];
    list.push({ key: t.key, name: t.name, author: t.author, html: e.html });
    bySutra.set(e.sutraId, list);
  }

  const toPublic = (s: (typeof rows)[number]): PublicSutra => ({
    id: s.id,
    number: s.number,
    sanskrit: s.sanskrit,
    transliteration: s.transliteration,
    synonyms: s.synonyms,
    vrtti: s.vrtti,
    translation: s.translation,
    commentaries: bySutra.get(s.id) ?? [],
  });

  const sections: PublicSection[] = secs.map((sec) => ({
    slug: sec.slug,
    title: sec.title,
    sutras: rows.filter((r) => r.subchapterId === sec.id).map(toPublic),
  }));
  const loose = rows.filter((r) => r.subchapterId === null || !secs.some((s) => s.id === r.subchapterId));
  if (loose.length) sections.push({ slug: "other", title: "Other sūtras", sutras: loose.map(toPublic) });

  return {
    slug: ch.slug,
    number: ch.number,
    title: ch.title,
    titleEn: ch.titleEn,
    summary: ch.summary,
    kind: ch.kind,
    rangeLabel: label(ch.kind, ch.rangeLabel, rows.map((r) => r.number)),
    sutraCount: rows.length,
    sections,
  };
}

/** Published chapters of an edition, in order. [] when the edition is unpublished or empty. */
export function getChapterList(edition: string): Promise<ChapterSummary[]> {
  return unstable_cache(() => readChapterList(edition), ["hnv:chapters:v1", edition], {
    tags: [tags.hnvAll],
    revalidate: 86400,
  })();
}

/** One chapter with its sections, sūtras and commentaries; null if not found. */
export function getPublicChapter(edition: string, slug: string): Promise<PublicChapter | null> {
  return unstable_cache(() => readChapter(edition, slug), ["hnv:chapter:v1", edition, slug], {
    tags: [tags.hnvAll, tags.hnvChapter(edition, slug)],
    revalidate: 86400,
  })();
}
