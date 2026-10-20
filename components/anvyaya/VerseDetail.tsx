import Link from "next/link";
import VerseLines from "@/components/VerseLines";
import CreditBox from "@/components/anvyaya/CreditBox";
import Breadcrumbs, { type Crumb } from "@/components/anvyaya/Breadcrumbs";
import type { BookConfig } from "@/lib/anvyayaBooks";
import type { Verse } from "@/lib/anvyayaTypes";

type Nav = { label: string; href: string } | null;

/** The full page for one verse, e.g. /anvyaya/SB/1/12/1 or /anvyaya/BG/18/6 */
export default function VerseDetail({
  book,
  verse,
  crumbs,
  prev,
  next,
  chapterHref,
  chapterLabel,
}: {
  book: BookConfig;
  verse: Verse;
  crumbs: Crumb[];
  prev: Nav;
  next: Nav;
  chapterHref: string;
  chapterLabel: string;
}) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="anv-hero-bg absolute inset-0" aria-hidden />
        <div className="relative max-w-3xl mx-auto px-5 pt-10 pb-14">
          <Breadcrumbs items={crumbs} />

          <div className="text-center mt-10">
            <span className="sutra-number inline-block text-sm font-medium px-4 py-1.5 rounded-full bg-[var(--color-vermillion)] text-white">
              {book.code} {verse.verseNo}
            </span>
            <p className="mt-4 text-sm text-[var(--fg-muted)]">{verse.chapterName}</p>

            <div className="anv-ornament my-7" aria-hidden>◆</div>

            <VerseLines
              text={verse.iast}
              className="block italic text-lg sm:text-xl leading-relaxed text-[var(--fg)]"
            />
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-5 py-12 space-y-8">
        {verse.devanagari && (
          <div className="anv-deva rounded-2xl px-5 py-8 text-center">
            <p className="anv-label mb-4">देवनागरी</p>
            <VerseLines
              text={verse.devanagari}
              className="block font-devanagari text-2xl sm:text-3xl leading-[1.9]"
            />
          </div>
        )}

        {verse.anvyaya && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-6">
            <p className="anv-label mb-3">Anvyaya · Prose order</p>
            <p className="leading-relaxed text-lg">{verse.anvyaya}</p>
          </div>
        )}

        {verse.translation && (
          <div className="rounded-2xl border border-[var(--border)] border-l-[3px] border-l-[var(--color-vermillion)] bg-[var(--bg-2)] p-6">
            <p className="anv-label mb-3">Translation</p>
            <p className="leading-relaxed text-lg">{verse.translation}</p>
          </div>
        )}

        <div className="text-center">
          <a
            href={verse.vedabaseLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] text-[var(--color-ink)] px-6 py-3 font-medium hover:opacity-90 transition-opacity"
          >
            Śrīla Prabhupāda&apos;s Translation &amp; Purport (Vedabase) <span aria-hidden>↗</span>
          </a>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-4">
          {prev ? (
            <Link href={prev.href} className="anv-card px-5 py-4">
              <span className="anv-label block mb-1">← Previous</span>
              <span className="sutra-number">{prev.label}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={next.href} className="anv-card px-5 py-4 sm:text-right">
              <span className="anv-label block mb-1">Next →</span>
              <span className="sutra-number">{next.label}</span>
            </Link>
          ) : (
            <span />
          )}
        </div>

        <div className="text-center">
          <Link href={chapterHref} className="text-sm text-[var(--color-vermillion)] hover:underline">
            ← All verses of {chapterLabel}
          </Link>
        </div>

        <CreditBox book={book} />
      </div>
    </>
  );
}
