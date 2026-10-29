"use client";

import { AArrowDown, AArrowUp, Headphones, Languages } from "lucide-react";
import { RichIn, VerseLinesIn } from "@/components/scriptures/ScriptText";
import Select from "@/components/ui/Select";
import type { ReaderPrefs } from "@/components/scriptures/prefs";
import SynonymsBlock from "@/components/scriptures/SynonymsBlock";
import { SCRIPT_LABELS, type CommentaryType, type ScriptName, type VerseData } from "@/lib/scriptures/core";

type SetPrefs = (p: Partial<ReaderPrefs>) => void;

const SCRIPT_OPTS = [
  { value: "iast", label: "IAST", short: "IAST", sub: "Roman transliteration · kṛṣṇa" },
  { value: "devanagari", label: "देवनागरी", short: "देवनागरी", sub: "Devanagari · कृष्ण" },
  { value: "bengali", label: "বাংলা", short: "বাংলা", sub: "Bengali · কৃষ্ণ" },
  { value: "oriya", label: "ଓଡ଼ିଆ", short: "ଓଡ଼ିଆ", sub: "Odia · କୃଷ୍ଣ" },
];

export function ScriptPicker({ prefs, setPrefs }: { prefs: ReaderPrefs; setPrefs: SetPrefs; compact?: boolean }) {
  return (
    <Select
      value={prefs.script}
      onChange={(v) => setPrefs({ script: v as ScriptName })}
      options={SCRIPT_OPTS}
      icon={<Languages size={15} />}
      width={240}
      align="right"
      title="Script — English is never changed"
      searchable={false}
    />
  );
}

/** A− / A+ for one side; each side (verse / commentary) has its own. */
export function SizeControl({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const step = (d: number) => onChange(Math.min(1.6, Math.max(0.8, Math.round((value + d) * 100) / 100)));
  return (
    <span className="ui-seg" role="group" aria-label={`${label} text size`}>
      <button type="button" onClick={() => step(-0.06)} aria-label={`Smaller ${label} text`} title={`Smaller ${label} text`} className="!px-2">
        <AArrowDown size={15} />
      </button>
      <button type="button" onClick={() => onChange(1)} className="!px-1.5 tabular-nums !text-[11px]" title="Reset to 100%">
        {Math.round(value * 100)}%
      </button>
      <button type="button" onClick={() => step(0.06)} aria-label={`Larger ${label} text`} title={`Larger ${label} text`} className="!px-2">
        <AArrowUp size={15} />
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
        <span className="text-[0.8rem] font-medium">{type.name} <span className="font-normal text-[var(--fg-muted)]">· prose order</span></span>
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

/** Everything that belongs WITH the verse (not commentaries), always in this order: synonyms (word-for-word), Anvaya, Translation. */
const COMPANION_ORDER: Record<string, number> = { verse: 0, anvaya: 1, translation: 2 };
export function VerseCompanions({ types, c, script, compact = false }: { types: CommentaryType[]; c: Record<number, string>; script: ScriptName; compact?: boolean }) {
  return (
    <>
      {types
        .filter((t) => t.appliesTo !== "division" && t.pane !== "commentary")
        .map((t, i) => ({ t, i }))
        .sort((a, b) => (COMPANION_ORDER[a.t.pane] ?? 0) - (COMPANION_ORDER[b.t.pane] ?? 0) || a.i - b.i)
        .map(({ t }) =>
          t.pane === "anvaya" ? (
            <AnvayaBlock key={t.id} type={t} html={c[t.id]} script={script} compact={compact} />
          ) : t.pane === "translation" ? (
            <TranslationBlock key={t.id} type={t} html={c[t.id]} script={script} compact={compact} />
          ) : c[t.id] ? (
            <SynonymsBlock key={t.id} type={t} html={c[t.id]} script={script} compact={compact} />
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
  return (
    <div>
      <p className="mb-4 text-[0.85rem] font-semibold tabular-nums text-[var(--color-saffron)]">{refLabel}</p>
      {verse.speaker && <p className="mb-2 text-sm italic text-[var(--fg-muted)]">{verse.speaker}</p>}
      {hasText ? (
        <VerseLinesIn sanskrit={verse.language === "sanskrit"}
          devanagari={verse.devanagari}
          iast={verse.iast}
          script={prefs.script}
          size={big ? "lg" : "md"}
          lineClass="py-0.5"
        />
      ) : (
        <p className="text-[var(--fg-muted)]">The verse text hasn't been added yet.</p>
      )}
      <VerseCompanions types={types} c={verse.c} script={prefs.script} />
    </div>
  );
}

