import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMoreSection, getMoreSections } from "@/lib/data/more";
import PageHead from "@/components/PageHead";
import RichText from "@/components/RichText";
import AcaryaList from "@/components/about/AcaryaList";

// /about/acaryas, /about/places, /about/acknowledgements — edited in
// Admin → More & About pages (sections whose key starts with "about-").

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getMoreSections()).filter((s) => s.key.startsWith("about-")).map((s) => ({ section: s.key.slice(6) }));
}

type P = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const key = (await params).section;
  const s = await getMoreSection(`about-${key}`);
  if (!s) return {};
  return { title: s.title, description: s.intro || undefined, alternates: { canonical: `/about/${key}` } };
}

const PRAYER =
  "We heartily pray to all the Vaishnavas who are seeing this now, to bless us, and pray for us, to Guru Gauranga, so that these fallen souls may be able to contribute in their pleasure, someday. We don't want anything else, except it. Hare Krsna.";

export default async function AboutSection({ params }: P) {
  const key = (await params).section;
  const s = await getMoreSection(`about-${key}`);
  if (!s) notFound();
  const items = [...s.items];
  const base = `/about/${key}`;
  return (
    <>
      <PageHead eyebrow="About" title={s.title} intro={s.intro || undefined} />
      <div className="mx-auto max-w-4xl px-5 pb-16 pt-6">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">This page is being prepared.</p>
        ) : key === "acaryas" ? (
          <AcaryaList items={items} base={base} />
        ) : (
          <div className="grid gap-3">
            {items.map((i) => (
              <article key={i.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold">{i.title}</h2>
                  {i.subtitle && <p className="text-sm text-[var(--accent)]">{i.subtitle}</p>}
                </div>
                {i.bodyHtml.trim() && <RichText value={i.bodyHtml} className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]" />}
                {i.url && (
                  <a href={i.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline">
                    {i.linkLabel || "Visit"} ↗
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
        {key === "acknowledgements" && (
          <blockquote className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-6 text-center sm:p-8">
            <p className="text-lg leading-relaxed sm:text-xl">{PRAYER}</p>
          </blockquote>
        )}
        <p className="mt-10">
          <Link href="/about" className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]">← About</Link>
        </p>
      </div>
    </>
  );
}
