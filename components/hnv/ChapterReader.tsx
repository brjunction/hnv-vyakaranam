import Link from "next/link";
import ChapterView from "@/components/ChapterView";
import type { PublicChapter } from "@/lib/data/hnv";

/** One chapter page: heading, then every section and sūtra. */
export default function ChapterReader({ chapter, backHref }: { chapter: PublicChapter; backHref: string }) {
  return (
    <div className="max-w-4xl mx-auto px-5 py-6 sm:py-8">
      <Link href={backHref} className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]">
        ← Table of contents
      </Link>

      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mt-4 mb-1">
        {chapter.number === null ? "" : `Chapter ${chapter.number}`}
      </p>
      <h1 className="font-devanagari text-2xl sm:text-3xl mb-1">{chapter.title}</h1>
      <p className="text-base text-[var(--fg-muted)] mb-2">{chapter.titleEn}</p>
      <p className="text-sm text-[var(--fg-muted)] max-w-2xl leading-relaxed mb-2">{chapter.summary}</p>
      {chapter.rangeLabel && (
        <p className="sutra-number text-sm text-[var(--accent)] mb-8">
          {chapter.kind === "verses" ? chapter.rangeLabel : `Sūtras ${chapter.rangeLabel}`}
        </p>
      )}

      <ChapterView chapter={chapter} />
    </div>
  );
}
