import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSutraPage } from "@/lib/data/hnv";
import SutraCard from "@/components/SutraCard";
import type { EditionSlug } from "@/lib/editions";

// One page per sūtra (/sutras/42, /brhat/sutras/…, /laghu/sutras/…), so every
// sūtra can be found on its own in search engines.

const NAME: Record<EditionSlug, string> = { madhyama: "", brhat: "Bṛhat ", laghu: "Laghu " } as Record<EditionSlug, string>;
export const sutraBase = (e: EditionSlug) => (e === "madhyama" ? "/sutras" : `/${e}/sutras`);
const chapterBase = (e: EditionSlug) => (e === "madhyama" ? "/chapters" : `/${e}/chapters`);
const plain = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export async function sutraMetadata(edition: EditionSlug, number: string): Promise<Metadata> {
  const p = await getSutraPage(edition, decodeURIComponent(number));
  if (!p) return {};
  const s = p.sutra;
  const head = s.transliteration || s.sanskrit;
  const body = plain(s.translation) || plain(s.vrtti);
  return {
    title: `${NAME[edition]}Sūtra ${s.number}: ${plain(head).slice(0, 70)}`,
    description: `${plain(s.sanskrit)} — ${body}`.slice(0, 300) + ` Hari-nāmāmṛta-vyākaraṇa, ${p.chapter.titleEn}.`,
    alternates: { canonical: `${sutraBase(edition)}/${encodeURIComponent(s.number)}` },
  };
}

export async function SutraPage({ edition, number }: { edition: EditionSlug; number: string }) {
  const p = await getSutraPage(edition, decodeURIComponent(number));
  if (!p) notFound();
  const base = sutraBase(edition);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `Sūtra ${p.sutra.number} — Hari-nāmāmṛta-vyākaraṇa`,
    text: plain(p.sutra.sanskrit),
    author: { "@type": "Person", name: "Śrīla Jīva Gosvāmī" },
    isPartOf: { "@type": "Book", name: `Hari-nāmāmṛta-vyākaraṇa — ${p.chapter.titleEn}` },
    inLanguage: ["sa", "en"],
  };
  return (
    <div className="mx-auto max-w-3xl px-5 py-6 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="text-sm text-[var(--fg-muted)]" aria-label="Breadcrumb">
        <Link href={chapterBase(edition)} className="hover:text-[var(--accent)]">Chapters</Link> ›{" "}
        <Link href={`${chapterBase(edition)}/${p.chapter.slug}#${encodeURIComponent(p.sutra.number)}`} className="hover:text-[var(--accent)]">
          {p.chapter.titleEn}
        </Link>
      </nav>
      <h1 className="mb-1 mt-4 text-2xl font-semibold sm:text-3xl">
        {NAME[edition]}Sūtra {p.sutra.number}
      </h1>
      <p className="mb-6 text-sm text-[var(--fg-muted)]">
        <span className="font-devanagari">{p.chapter.title}</span>
        {p.section ? ` · ${p.section}` : ""}
      </p>
      <SutraCard sutra={p.sutra} forceOpen showNotes />
      <div className="mt-6 flex justify-between gap-3 text-sm">
        {p.prev ? (
          <Link href={`${base}/${encodeURIComponent(p.prev.number)}`} className="ui-btn">← Sūtra {p.prev.number}</Link>
        ) : <span />}
        {p.next && (
          <Link href={`${base}/${encodeURIComponent(p.next.number)}`} className="ui-btn">Sūtra {p.next.number} →</Link>
        )}
      </div>
    </div>
  );
}
