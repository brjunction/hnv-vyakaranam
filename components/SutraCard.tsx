"use client";

import { useEffect, useState } from "react";
import type { PublicSutra } from "@/lib/data/hnv";
import Link from "next/link";
import RichText, { isHtml } from "@/components/RichText";
import { RichIn, VerseLinesIn } from "@/components/scriptures/ScriptText";
import { detectScript, type ScriptName } from "@/lib/scriptures/core";

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
  script = "devanagari",
}: {
  sutra: PublicSutra;
  /** When set (true/false), overrides the card's own open/closed state. */
  forceOpen?: boolean;
  /** Whether commentaries render when the card is open. */
  showNotes: boolean;
  /** Reader's script (Devanagari / IAST / Bengali / Odia). */
  script?: ScriptName;
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
          <VerseLinesIn devanagari={sutra.sanskrit} iast={sutra.transliteration} script={script} className="sutra-main" />
          <VerseLinesIn
            devanagari={sutra.sanskrit}
            iast={sutra.transliteration}
            script={script === "iast" ? detectScript(sutra.sanskrit) ?? "devanagari" : "iast"}
            className="sutra-second mt-0.5"
          />
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
      {sutra.links.length > 0 && (
        <div className="-mt-2 flex flex-wrap gap-1.5 pb-3 pl-[4.25rem] pr-4">
          {sutra.links.map((l) =>
            l.href ? (
              <Link key={l.label} href={l.href} className="sutra-xref" title={`Open ${l.label}`}>
                {l.label} →
              </Link>
            ) : (
              <span key={l.label} className="sutra-xref opacity-70" title="That edition is not published yet">
                {l.label}
              </span>
            )
          )}
        </div>
      )}

      {/* Always rendered (hidden when closed) so search engines index the full text. */}
      {(
        <div hidden={!isOpen} className="px-4 pb-5 pt-1 border-t border-[var(--border)] space-y-4">
          {sutra.synonyms.trim() && (
            <Block label="Synonyms">
              {isHtml(sutra.synonyms) ? <RichIn html={sutra.synonyms} english script={script} className="leading-relaxed" /> : <RichText value={sutra.synonyms} className="leading-relaxed" />}
            </Block>
          )}
          <Block label="Vṛtti">
            {sutra.vrtti.trim() ? (
              isHtml(sutra.vrtti) ? (
                <RichIn html={sutra.vrtti} english={false} script={script} className="text-base leading-relaxed" />
              ) : (
                <VerseLinesIn
                  devanagari={detectScript(sutra.vrtti) ? sutra.vrtti : ""}
                  iast={detectScript(sutra.vrtti) ? "" : sutra.vrtti}
                  script={script}
                  className="!text-base !leading-relaxed"
                />
              )
            ) : (
              <p className="text-sm text-[var(--fg-muted)]">—</p>
            )}
          </Block>
          <Block label="Translation">
            {sutra.translation.trim() ? (
              isHtml(sutra.translation) ? <RichIn html={sutra.translation} english script={script} className="leading-relaxed" /> : <RichText value={sutra.translation} className="leading-relaxed" />
            ) : (
              <p className="text-sm text-[var(--fg-muted)]">—</p>
            )}
          </Block>
          {showNotes &&
            sutra.commentaries.map((c) => (
              <Block key={c.key} label={c.author ? `${c.name} · ${c.author}` : c.name}>
                {isHtml(c.html) ? <RichIn html={c.html} english script={script} /> : <RichText value={c.html} />}
              </Block>
            ))}
        </div>
      )}
    </div>
  );
}
