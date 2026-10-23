import { notFound } from "next/navigation";
import ChapterReader from "@/components/hnv/ChapterReader";
import { getPublicChapter } from "@/lib/data/hnv";
import { chapterMetadata, chapterParams } from "@/lib/hnv/chapterRoute";

// Static pages, rebuilt the moment an editor saves (tag revalidation).
export const revalidate = 86400;
export const dynamicParams = true;

export const generateStaticParams = () => chapterParams("madhyama");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return chapterMetadata("madhyama", (await params).slug);
}

export default async function ChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const chapter = await getPublicChapter("madhyama", (await params).slug);
  if (!chapter) notFound();
  return <ChapterReader chapter={chapter} backHref="/chapters" />;
}
