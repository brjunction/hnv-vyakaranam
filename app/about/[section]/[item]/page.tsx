import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMoreItem, getMoreSections } from "@/lib/data/more";
import PageHead from "@/components/PageHead";
import RichText from "@/components/RichText";

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getMoreSections())
    .filter((s) => s.key.startsWith("about-"))
    .flatMap((s) => s.items.filter((i) => i.bodyHtml.trim()).map((i) => ({ section: s.key.slice(6), item: i.slug })));
}

type P = { params: Promise<{ section: string; item: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await params;
  const r = await getMoreItem(`about-${p.section}`, p.item);
  if (!r) return {};
  return { title: r.item.title, description: r.item.subtitle || r.section.title, alternates: { canonical: `/about/${p.section}/${p.item}` } };
}

export default async function AboutItem({ params }: P) {
  const p = await params;
  const r = await getMoreItem(`about-${p.section}`, p.item);
  if (!r || !r.item.bodyHtml.trim()) notFound();
  const { item, section } = r;
  return (
    <>
      <PageHead eyebrow={section.title} title={item.title} intro={item.subtitle || undefined} />
      <div className="mx-auto max-w-3xl px-5 pb-16 pt-6">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.title} className="mb-6 max-h-[28rem] rounded-2xl object-cover" />
        )}
        <RichText value={item.bodyHtml} className="leading-relaxed" />
        <p className="mt-10">
          <Link href={`/about/${p.section}`} className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]">← {section.title}</Link>
        </p>
      </div>
    </>
  );
}
