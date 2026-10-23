import Link from "next/link";
import ChapterView from "@/components/ChapterView";
import type { PublicChapter } from "@/lib/data/hnv";

/** One chapter page: heading, then every section and sūtra. */
export default function ChapterReader({ chapter, backHref }: { chapter: PublicChapter; backHref: string }) {
  return (
    <div className="max-w-4xl mx-auto px-5 py-16">
      <Link href={backHref} className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]">
        ← Table of contents
      </Link>

      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mt-6 mb-3">
        {chapter.number === null ? "" : `Chapter ${chapter.number}`}
      </p>
      <h1 className="font-devanagari text-3xl sm:text-4xl mb-2">{chapter.title}</h1>
      <p className="text-lg text-[var(--fg-muted)] mb-4">{chapter.titleEn}</p>
      <p className="text-[var(--fg-muted)] max-w-2xl leading-relaxed mb-4">{chapter.summary}</p>
      {chapter.rangeLabel && (
        <p className="sutra-number text-sm text-[var(--accent)] mb-12">
          {chapter.kind === "verses" ? chapter.rangeLabel : `Sūtras ${chapter.rangeLabel}`}
        </p>
      )}

      <ChapterView chapter={chapter} />
    </div>
  );
}
