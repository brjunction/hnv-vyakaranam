"use client";

import { useEffect, useState } from "react";
import type { Sutra } from "@/lib/content";
import VerseLines from "@/components/VerseLines";

export type SutraWithNotes = Sutra & { notesHtml?: string };

export default function SutraCard({
  sutra,
  forceOpen,
  showNotes,
  notesScopeClass,
}: {
  sutra: SutraWithNotes;
  /** When set (true/false), overrides the card's own open/closed state. */
  forceOpen?: boolean;
  /** Whether the notes block should render when the card is open. */
  showNotes: boolean;
  /** Wrapper class that applies the Google Doc's own formatting (colors, alignment, etc.). */
  notesScopeClass: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen);
  }, [forceOpen]);

  const isOpen = forceOpen !== undefined ? forceOpen : open;

  return (
    <div
      id={sutra.number}
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] overflow-hidden scroll-mt-24"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-4 p-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="sutra-number shrink-0 text-xs px-2 py-1 rounded-full border border-[var(--accent)] text-[var(--accent)]">
          {sutra.number}
        </span>
        <span className="flex-1">
          <VerseLines text={sutra.sutraSanskrit} className="block font-devanagari text-lg leading-snug" />
          <VerseLines
            text={sutra.sutraTransliteration}
            className="block text-sm italic text-[var(--fg-muted)] mt-0.5"
          />
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {sutra.notesHtml && (
            <span
              className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-[var(--color-saffron)] text-[var(--color-saffron)]"
              title="Notes available"
            >
              Notes
            </span>
          )}
          <span
            className={`mt-1 text-[var(--accent)] transition-transform ${isOpen ? "rotate-45" : ""}`}
            aria-hidden
          >
            +
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pb-5 pt-1 border-t border-[var(--border)] space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--color-saffron)] mb-1">Vṛtti</p>
            <p className="font-devanagari text-base leading-relaxed">
              <VerseLines text={sutra.vrtti} />
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--color-saffron)] mb-1">Translation</p>
            <p className="leading-relaxed">{sutra.translation}</p>
          </div>
          {showNotes && sutra.notesHtml && (
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--color-saffron)] mb-2">Notes</p>
              {/*
                Rendered exactly as formatted in the Google Doc: the scoped
                <style> block emitted alongside this page supplies the real
                colors/alignment/fonts for the classes Google Docs assigns.
              */}
              <div
                className={`gdoc-content ${notesScopeClass}`}
                dangerouslySetInnerHTML={{ __html: sutra.notesHtml }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
