"use client";

import { AArrowDown, AArrowUp, ChevronDown, Headphones, Languages } from "lucide-react";
import { RichIn, VerseLinesIn } from "@/components/scriptures/ScriptText";
import type { ReaderPrefs } from "@/components/scriptures/prefs";
import { SCRIPT_LABELS, type CommentaryType, type ScriptName, type VerseData } from "@/lib/scriptures/core";

type SetPrefs = (p: Partial<ReaderPrefs>) => void;

export function ScriptPicker({ prefs, setPrefs, compact = false }: { prefs: ReaderPrefs; setPrefs: SetPrefs; compact?: boolean }) {
  return (
    <label className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] text-sm ${compact ? "h-9 px-2.5" : "h-10 px-3"}`} title="Script">
      <Languages size={15} className="text-[var(--fg-muted)]" aria-hidden />
      <span className="sr-only">Script</span>
      <select
        value={prefs.script}
        onChange={(e) => setPrefs({ script: e.target.value as ScriptName })}
        className="cursor-pointer bg-transparent pr-1 outline-none"
      >
        {(Object.keys(SCRIPT_LABELS) as ScriptName[]).map((s) => (
          <option key={s} value={s}>
            {SCRIPT_LABELS[s]}
          </option>
        ))}
      </select>
    </label>
  );
}

/** A− / A+ for one side; each side (verse / commentary) has its own. */
export function SizeControl({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const step = (d: number) => onChange(Math.min(1.6, Math.max(0.8, Math.round((value + d) * 100) / 100)));
  return (
    <span className="inline-flex h-7 items-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)]" role="group" aria-label={`${label} text size`}>
      <button type="button" onClick={() => step(-0.06)} className="px-2 hover:text-[var(--fg)]" aria-label={`Smaller ${label} text`} title={`Smaller ${label} text`}>
        <AArrowDown size={14} />
      </button>
      <button type="button" onClick={() => onChange(1)} className="min-w-[2.6rem] border-x border-[var(--border)] px-1 text-[10px] tabular-nums hover:text-[var(--fg)]" title="Reset">
        {Math.round(value * 100)}%
      </button>
      <button type="button" onClick={() => step(0.06)} className="px-2 hover:text-[var(--fg)]" aria-label={`Larger ${label} text`} title={`Larger ${label} text`}>
        <AArrowUp size={14} />
      </button>
    </span>
  );
}

export function AudioList({ audio }: { audio: VerseData["audio"] }) {
  if (!audio.length) return null;
  return (
    <ul className="mt-5 grid gap-1.5">
      {audio.map((a, i) => (
        <li key={i}>
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]">
            <Headphones size={15} className="text-[var(--accent)]" />
            <span>{a.title}</span>
            {a.speaker && <span className="text-[var(--fg-muted)]">· {a.speaker}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * The Anvaya — the prose order of the verse. Not a commentary: it belongs to
 * the verse, so it sits right under it, in its own design.
 */
export function AnvayaBlock({ type, html, script, compact = false }: { type: CommentaryType; html?: string; script: ScriptName; compact?: boolean }) {
  return (
    <section className={`anvaya-block ${compact ? "mt-4" : "mt-7"}`} aria-label={type.name}>
      <header className="anvaya-head">
        <span className="font-devanagari text-[1.05em] leading-none">{type.nameDeva || "अन्वयः"}</span>
        <span className="anvaya-rule" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em]">{type.name} · prose order</span>
      </header>
      {html ? (
        <RichIn html={html} english={type.language === "english"} script={script} className="anvaya-body" />
      ) : (
        <p className="text-sm italic text-[var(--fg-muted)]">The anvaya for this verse hasn&apos;t been added yet.</p>
      )}
      {type.author && !compact && <p className="mt-2 text-right text-[11px] text-[var(--fg-muted)]">{type.author}</p>}
    </section>
  );
}

/** The translation — part of the verse, not a commentary: its own clear design. */
export function TranslationBlock({ type, html, script, compact = false }: { type: CommentaryType; html?: string; script: ScriptName; compact?: boolean }) {
  return (
    <section className={`translation-block ${compact ? "mt-5" : "mt-8"}`} aria-label={type.name}>
      <h3 className="translation-head">
        <span>{type.name}</span>
      </h3>
      {html ? (
        <RichIn html={html} english={type.language === "english"} script={script} className="translation-body" />
      ) : (
        <p className="text-sm italic text-[var(--fg-muted)]">The translation of this verse hasn&apos;t been added yet.</p>
      )}
    </section>
  );
}

/** Everything that belongs WITH the verse (not commentaries), in the admin’s order: word-for-word, Anvaya, Translation. */
export function VerseCompanions({ types, c, script, compact = false }: { types: CommentaryType[]; c: Record<number, string>; script: ScriptName; compact?: boolean }) {
  return (
    <>
      {types
        .filter((t) => t.appliesTo !== "division" && t.pane !== "commentary")
        .map((t) =>
          t.pane === "anvaya" ? (
            <AnvayaBlock key={t.id} type={t} html={c[t.id]} script={script} compact={compact} />
          ) : t.pane === "translation" ? (
            <TranslationBlock key={t.id} type={t} html={c[t.id]} script={script} compact={compact} />
          ) : c[t.id] ? (
            <section key={t.id} className={`${compact ? "mt-4" : "mt-6"} border-t border-[var(--border)] pt-4`}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">{t.name}</h3>
              <RichIn html={c[t.id]} english={t.language === "english"} script={script} className="text-[0.95em]" />
            </section>
          ) : null
        )}
    </>
  );
}

/** The verse itself: number, speaker, text in the chosen script, "Show Devanagari", verse-side fields, audio. */
export function VersePane({
  verse,
  refLabel,
  types,
  prefs,
  setPrefs,
  big = true,
}: {
  verse: VerseData;
  refLabel: string;
  types: CommentaryType[];
  prefs: ReaderPrefs;
  setPrefs: SetPrefs;
  big?: boolean;
}) {
  const hasText = verse.iast || verse.devanagari;
  const second = prefs.script === "iast" && verse.devanagari && verse.iast;
  return (
    <div>
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-saffron)]">{refLabel}</p>
      {verse.speaker && <p className="mb-2 text-sm italic text-[var(--fg-muted)]">{verse.speaker}</p>}
      {hasText ? (
        <VerseLinesIn
          devanagari={verse.devanagari}
          iast={verse.iast}
          script={prefs.script}
          size={big ? "lg" : "md"}
          lineClass="py-0.5"
        />
      ) : (
        <p className="text-[var(--fg-muted)]">The verse text hasn't been added yet.</p>
      )}
      {second && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setPrefs({ showDeva: !prefs.showDeva })}
            aria-expanded={prefs.showDeva}
            className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            <ChevronDown size={15} className={`transition-transform ${prefs.showDeva ? "" : "-rotate-90"}`} />
            {prefs.showDeva ? "Hide Devanagari" : "Show Devanagari"}
          </button>
          {prefs.showDeva && (
            <VerseLinesIn devanagari={verse.devanagari} iast="" script="devanagari" size={big ? "lg" : "md"} className="mt-2" />
          )}
        </div>
      )}
      <VerseCompanions types={types} c={verse.c} script={prefs.script} />
    </div>
  );
}

