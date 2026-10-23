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
  /** Cross-edition links: Madhyama → its Bṛhat sūtra (B_SN), Bṛhat → the Madhyama sūtras that point to it. */
  links: { label: string; href: string | null }[];
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

  // ---- cross-edition links (B_SN)
  const linkMap = new Map<number, { label: string; href: string | null }[]>();
  const addLink = (id: number, l: { label: string; href: string | null }) => linkMap.set(id, [...(linkMap.get(id) ?? []), l]);
  if (edition !== "brhat") {
    const wanted = [...new Set(rows.map((r) => r.brhatNumber.trim()).filter(Boolean))];
    if (wanted.length) {
      const bid = await editionId("brhat");
      const targets = bid
        ? await db
            .select({ number: sutras.number, slug: chapters.slug })
            .from(sutras)
            .innerJoin(chapters, eq(chapters.id, sutras.chapterId))
            .where(and(eq(sutras.editionId, bid), inArray(sutras.number, wanted), eq(sutras.status, "published"), eq(chapters.status, "published")))
        : [];
      const at = new Map(targets.map((t) => [t.number, t.slug]));
      for (const r of rows) {
        const n = r.brhatNumber.trim();
        if (!n) continue;
        const slug = at.get(n);
        addLink(r.id, { label: `Bṛhat ${n}`, href: slug ? `/brhat/chapters/${slug}#${encodeURIComponent(n)}` : null });
      }
    }
  } else if (rows.length) {
    const mid = await editionId("madhyama");
    const back = mid
      ? await db
          .select({ number: sutras.number, brhat: sutras.brhatNumber, slug: chapters.slug })
          .from(sutras)
          .innerJoin(chapters, eq(chapters.id, sutras.chapterId))
          .where(and(eq(sutras.editionId, mid), inArray(sutras.brhatNumber, rows.map((r) => r.number)), eq(sutras.status, "published"), eq(chapters.status, "published")))
      : [];
    for (const r of rows)
      for (const b of back.filter((x) => x.brhat === r.number)) addLink(r.id, { label: `Madhyama ${b.number}`, href: `/chapters/${b.slug}#${encodeURIComponent(b.number)}` });
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
    links: linkMap.get(s.id) ?? [],
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
  return unstable_cache(() => readChapter(edition, slug), ["hnv:chapter:v2", edition, slug], {
    tags: [tags.hnvAll, tags.hnvChapter(edition, slug)],
    revalidate: 86400,
  })();
}

/** Sūtra number → chapter slug, for one edition (powers the per-sūtra pages). */
async function readSutraIndex(edition: string): Promise<Record<string, string>> {
  if (!isDbConfigured) return {};
  const eid = await editionId(edition);
  if (!eid) return {};
  const rows = await getDb()
    .select({ number: sutras.number, slug: chapters.slug })
    .from(sutras)
    .innerJoin(chapters, and(eq(chapters.id, sutras.chapterId), eq(chapters.status, "published")))
    .where(and(eq(sutras.editionId, eid), eq(sutras.status, "published")));
  return Object.fromEntries(rows.map((r) => [r.number, r.slug]));
}

export function getSutraIndex(edition: string): Promise<Record<string, string>> {
  return unstable_cache(() => readSutraIndex(edition), ["hnv:sutra-index:v1", edition], { tags: [tags.hnvAll], revalidate: 86400 })();
}

/** One sūtra with its chapter and neighbours. */
export async function getSutraPage(edition: string, number: string) {
  const slug = (await getSutraIndex(edition))[number];
  if (!slug) return null;
  const chapter = await getPublicChapter(edition, slug);
  if (!chapter) return null;
  const all = chapter.sections.flatMap((s) => s.sutras.map((x) => ({ sutra: x, section: s.title })));
  const i = all.findIndex((x) => x.sutra.number === number);
  if (i < 0) return null;
  return { chapter, section: all[i].section, sutra: all[i].sutra, prev: all[i - 1]?.sutra ?? null, next: all[i + 1]?.sutra ?? null };
}
