import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChapterPractice from "@/components/practice/ChapterPractice";
import { getPracticeData } from "@/lib/data/practice";
import { SECTIONS, sectionFor } from "@/lib/practice/sections";

export const revalidate = 86400;
export const dynamicParams = true;

export const generateStaticParams = () => SECTIONS.map((s) => ({ chapter: s.slug }));

export async function generateMetadata({ params }: { params: Promise<{ chapter: string }> }): Promise<Metadata> {
  const slug = (await params).chapter;
  const s = SECTIONS.find((x) => x.slug === slug);
  if (!s) return {};
  return {
    title: `${s.short} practice`,
    description: `${s.tagline} Practise ${s.short} from Hari-nāmāmṛta-vyākaraṇa — easy, medium and hard, every answer with its sūtra.`,
    alternates: { canonical: `/practice/${slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ chapter: string }> }) {
  const slug = (await params).chapter;
  if (!SECTIONS.some((s) => s.slug === slug)) notFound();
  const data = await getPracticeData();
  const ch = data.chapters.find((c) => c.slug === slug);
  if (!ch || !ch.available) notFound();
  const sec = sectionFor(slug);
  return (
    <ChapterPractice
      slug={slug}
      title={ch.title}
      titleEn={ch.titleEn || sec.short}
      topics={ch.topics.map((t) => ({ slug: t.slug, title: t.title, subtitle: t.subtitle }))}
      questions={data.questions.filter((q) => q.chapter === slug)}
    />
  );
}
