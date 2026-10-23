"use client";

import { useEffect, useState } from "react";
import type { PublicSutra } from "@/lib/data/hnv";
import VerseLines from "@/components/VerseLines";
import RichText from "@/components/RichText";

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-[var(--color-saffron)] mb-1">{label}</p>
      {children}
    </div>
  );
}

export default function SutraCard({
  sutra,
  forceOpen,
  showNotes,
}: {
  sutra: PublicSutra;
  /** When set (true/false), overrides the card's own open/closed state. */
  forceOpen?: boolean;
  /** Whether commentaries render when the card is open. */
  showNotes: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen);
  }, [forceOpen]);

  const isOpen = forceOpen !== undefined ? forceOpen : open;
  const hasCommentary = sutra.commentaries.length > 0;

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
          <VerseLines text={sutra.sanskrit} className="block font-devanagari text-lg leading-snug" />
          <VerseLines text={sutra.transliteration} className="block text-sm italic text-[var(--fg-muted)] mt-0.5" />
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {hasCommentary && (
            <span
              className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-[var(--color-saffron)] text-[var(--color-saffron)]"
              title={sutra.commentaries.map((c) => c.name).join(", ")}
            >
              {sutra.commentaries.length === 1 ? sutra.commentaries[0].name : `${sutra.commentaries.length} commentaries`}
            </span>
          )}
          <span className={`mt-1 text-[var(--accent)] transition-transform ${isOpen ? "rotate-45" : ""}`} aria-hidden>
            +
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pb-5 pt-1 border-t border-[var(--border)] space-y-4">
          {sutra.synonyms.trim() && (
            <Block label="Synonyms">
              <RichText value={sutra.synonyms} className="leading-relaxed" />
            </Block>
          )}
          <Block label="Vṛtti">
            {sutra.vrtti.trim() ? (
              <RichText value={sutra.vrtti} className="font-devanagari text-base leading-relaxed" />
            ) : (
              <p className="text-sm text-[var(--fg-muted)]">—</p>
            )}
          </Block>
          <Block label="Translation">
            {sutra.translation.trim() ? (
              <RichText value={sutra.translation} className="leading-relaxed" />
            ) : (
              <p className="text-sm text-[var(--fg-muted)]">—</p>
            )}
          </Block>
          {showNotes &&
            sutra.commentaries.map((c) => (
              <Block key={c.key} label={c.author ? `${c.name} · ${c.author}` : c.name}>
                <RichText value={c.html} />
              </Block>
            ))}
        </div>
      )}
    </div>
  );
}
