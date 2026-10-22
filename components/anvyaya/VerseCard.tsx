"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VerseLines from "@/components/VerseLines";
import type { Verse } from "@/lib/anvyayaTypes";

export default function VerseCard({
  verse,
  href,
  forceOpen,
}: {
  verse: Verse;
  /** Permalink of this verse, e.g. /anvyaya/SB/1/12/1 */
  href: string;
  /** When set (true/false), overrides the card's own open/closed state. */
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen);
  }, [forceOpen]);

  const isOpen = forceOpen !== undefined ? forceOpen : open;

  return (
    <div id={`v-${verse.verseNo}`} className="anv-verse scroll-mt-40" data-open={isOpen}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-4 p-4 sm:p-5 text-left"
        aria-expanded={isOpen}
      >
        <span className="sutra-number shrink-0 mt-0.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-vermillion)] text-white">
          {verse.verseNo}
        </span>
        <VerseLines
          text={verse.iast}
          className="flex-1 block italic text-[15px] sm:text-base leading-relaxed text-[var(--fg)]"
        />
        <span
          className={`shrink-0 mt-0.5 text-lg leading-none text-[var(--accent)] transition-transform duration-200 ${
            isOpen ? "rotate-45" : ""
          }`}
          aria-hidden
        >
          +
        </span>
      </button>

      {isOpen && (
        <div className="anv-fade px-4 sm:px-5 pb-6 pt-4 space-y-5 border-t border-[var(--border)]">
          {verse.devanagari && (
            <div className="anv-deva rounded-xl px-4 py-5 text-center">
              <p className="anv-label mb-3">देवनागरी</p>
              <VerseLines
                text={verse.devanagari}
                className="block font-devanagari text-xl sm:text-2xl leading-[1.9]"
              />
            </div>
          )}

          {verse.anvyaya && (
            <div>
              <p className="anv-label mb-2">Anvyaya · Prose order</p>
              <p className="leading-relaxed">{verse.anvyaya}</p>
            </div>
          )}

          {verse.translation && (
            <div>
              <p className="anv-label mb-2">Translation</p>
              <p className="leading-relaxed text-[var(--fg)]">{verse.translation}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href={verse.vedabaseLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] text-[var(--color-ink)] px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Śrīla Prabhupāda&apos;s Translation &amp; Purport (Vedabase) <span aria-hidden>↗</span>
            </a>
            <Link
              href={href}
              className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
            >
              Open verse page →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
