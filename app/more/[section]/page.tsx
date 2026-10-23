import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMoreSection, getMoreSections } from "@/lib/data/more";
import PageHead from "@/components/PageHead";
import { SectionBody } from "@/components/more/Sections";

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getMoreSections()).filter((s) => !s.key.startsWith("about-")).map((s) => ({ section: s.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const s = await getMoreSection((await params).section);
  if (!s) return {};
  return { title: s.title, description: s.intro || undefined, alternates: { canonical: `/more/${s.key}` } };
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const s = await getMoreSection((await params).section);
  if (!s) notFound();
  return (
    <>
      <PageHead eyebrow="More" title={s.title} intro={s.intro || undefined} />
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-6">
        <SectionBody s={s} />
        <p className="mt-10">
          <Link href="/more" className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]">
            ← All of More
          </Link>
        </p>
      </div>
    </>
  );
}
