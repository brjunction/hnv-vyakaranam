import "server-only";
import type { Metadata } from "next";
import { getChapterList, getPublicChapter } from "@/lib/data/hnv";
import type { EditionSlug } from "@/lib/editions";

// Shared pieces of the /chapters/[slug], /brhat/chapters/[slug] and
// /laghu/chapters/[slug] routes.

export async function chapterParams(edition: EditionSlug) {
  const list = await getChapterList(edition);
  return list.map((c) => ({ slug: c.slug }));
}

export async function chapterMetadata(edition: EditionSlug, slug: string): Promise<Metadata> {
  const ch = await getPublicChapter(edition, slug);
  if (!ch) return {};
  const range = ch.rangeLabel ? (ch.kind === "verses" ? ` ${ch.rangeLabel}.` : ` Sūtras ${ch.rangeLabel}.`) : "";
  return {
    title: `${ch.title} — ${ch.titleEn}`,
    description: `${ch.summary}${range} Hari-nāmāmṛta Vyākaraṇa.`.trim(),
    alternates: { canonical: `${edition === "madhyama" ? "" : `/${edition}`}/chapters/${slug}` },
  };
}
