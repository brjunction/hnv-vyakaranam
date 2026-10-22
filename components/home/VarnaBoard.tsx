"use client";

import Link from "next/link";
import { useState } from "react";

// HNV's alphabet with its own technical names — every name is a name of
// Hari. Names, sūtra numbers, glosses and Pāṇinian equivalents are taken
// from the HNV-Wiki (public/hnv-wiki.html, Saṁjñā sūtras 1–25). Nothing here
// is invented: a group without a gloss in the source simply has none.

type Group = {
  id: string;
  name: string; // IAST
  sutra: number;
  gloss?: string;
  paninian: string;
  letters: string[];
};

const VOWELS: Group = {
  id: "sarvesvara",
  name: "sarveśvara",
  sutra: 2,
  paninian: "the fourteen vowels",
  letters: ["अ", "आ", "इ", "ई", "उ", "ऊ", "ऋ", "ॠ", "ऌ", "ॡ", "ए", "ऐ", "ओ", "औ"],
};

const MARKS: Group[] = [
  { id: "visnucakra", name: "viṣṇucakra", sutra: 13, paninian: "anusvāra", letters: ["अं"] },
  { id: "visnucapa", name: "viṣṇucāpa", sutra: 14, paninian: "anunāsika, pronounced in the nose", letters: ["अँ"] },
  { id: "visnusarga", name: "viṣṇusarga", sutra: 15, paninian: "visarga", letters: ["अः"] },
];

const VARGA_ROWS = [
  ["क", "ख", "ग", "घ", "ङ"],
  ["च", "छ", "ज", "झ", "ञ"],
  ["ट", "ठ", "ड", "ढ", "ण"],
  ["त", "थ", "द", "ध", "न"],
  ["प", "फ", "ब", "भ", "म"],
];

const COLUMNS: Group[] = [
  { id: "harikamala", name: "harikamala", sutra: 18, gloss: "the lotus of Hari", paninian: "voiceless unaspirated stops", letters: VARGA_ROWS.map((r) => r[0]) },
  { id: "harikhadga", name: "harikhaḍga", sutra: 19, gloss: "the sword of Hari", paninian: "voiceless aspirated stops", letters: VARGA_ROWS.map((r) => r[1]) },
  { id: "harigada", name: "harigadā", sutra: 20, gloss: "the club of Hari", paninian: "voiced unaspirated stops", letters: VARGA_ROWS.map((r) => r[2]) },
  { id: "harighosa", name: "harighoṣa", sutra: 21, gloss: "the conchshell of Hari", paninian: "voiced aspirated stops", letters: VARGA_ROWS.map((r) => r[3]) },
  { id: "harivenu", name: "hariveṇu", sutra: 22, gloss: "the flute of Hari", paninian: "nasals", letters: VARGA_ROWS.map((r) => r[4]) },
];

const TAIL: Group[] = [
  { id: "harimitra", name: "harimitra", sutra: 24, gloss: "the friends of Hari", paninian: "semivowels", letters: ["य", "र", "ल", "व"] },
  { id: "harigotra", name: "harigotra", sutra: 25, gloss: "the family of Hari", paninian: "sibilants and ha", letters: ["श", "ष", "स", "ह"] },
];

const CONSONANTS: Group = {
  id: "visnujana",
  name: "viṣṇujana",
  sutra: 16,
  paninian: "consonants — every letter from ka onward",
  letters: [...VARGA_ROWS.flat(), ...TAIL.flatMap((t) => t.letters)],
};

const VARGAS: Group = {
  id: "visnuvarga",
  name: "viṣṇuvarga",
  sutra: 17,
  paninian: "the five groups of five, ka to ma",
  letters: VARGA_ROWS.flat(),
};

const ALL: Group[] = [VOWELS, ...MARKS, CONSONANTS, VARGAS, ...COLUMNS, ...TAIL];
const byId = Object.fromEntries(ALL.map((g) => [g.id, g]));

/** The most specific group a single letter belongs to (for tap-on-letter). */
function groupForLetter(letter: string): Group {
  return [...MARKS, ...COLUMNS, ...TAIL, VOWELS].find((g) => g.letters.includes(letter)) ?? CONSONANTS;
}

const sutraHref = (n: number) => `/chapters/samjna-sandhi-prakarana#${n}`;

export default function VarnaBoard() {
  const [focus, setFocus] = useState<string | null>(null);
  const group = focus ? byId[focus] : null;
  const active = new Set(group?.letters ?? []);
  let i = 0; // stagger index for the one-time ink-in animation

  // Plain render helpers (not components) so tiles keep their identity
  // across re-renders and the ink-in animation runs only once.
  const tile = (l: string, wide = false) => {
    const delay = `${Math.min(i++ * 18, 900)}ms`;
    const g = groupForLetter(l);
    return (
      <button
        key={l}
        type="button"
        className={`varna-tile varna-ink ${wide ? "varna-wide" : ""}`}
        style={{ animationDelay: delay }}
        data-active={active.has(l) || undefined}
        aria-pressed={active.has(l)}
        aria-label={`${l} — ${g.name}`}
        onClick={() => setFocus(g.id)}
        onMouseEnter={() => setFocus(g.id)}
        onFocus={() => setFocus(g.id)}
      >
        <span lang="sa-Deva">{l}</span>
      </button>
    );
  };

  const label = (g: Group, className = "") => (
    <button
      key={g.id}
      type="button"
      onClick={() => setFocus(g.id)}
      onMouseEnter={() => setFocus(g.id)}
      onFocus={() => setFocus(g.id)}
      className={`text-left text-[0.8rem] leading-tight transition-colors ${
        focus === g.id ? "text-[var(--color-vermillion)] dark:text-[var(--color-gold-light)] font-semibold" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
      } ${className}`}
    >
      <span className="italic">{g.name}</span>
      <span className="opacity-60"> {g.sutra}</span>
    </button>
  );

  return (
    <div
      className="varna-board relative"
      data-focus={focus ?? undefined}
      onMouseLeave={() => setFocus(null)}
    >
      {/* vowels */}
      <div className="flex items-baseline justify-between mb-2">
        {label(VOWELS)}
        <span className="text-[0.75rem] text-[var(--fg-muted)]">14 letters</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-4">
        {VOWELS.letters.map((l) => tile(l))}
      </div>

      {/* anusvāra / anunāsika / visarga */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-5">
        {MARKS.map((g) => (
          <div key={g.id} className="contents">
            {tile(g.letters[0])}
            <div className="col-span-1 flex items-center last:col-span-1">{label(g, "!text-[0.7rem] sm:!text-[0.78rem]")}</div>
          </div>
        ))}
      </div>

      {/* the five vargas with their column names */}
      <div className="flex items-baseline justify-between mb-2">
        {label(VARGAS)}
        {label(CONSONANTS)}
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {VARGA_ROWS.flat().map((l) => tile(l, true))}
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mt-2 mb-5">
        {COLUMNS.map((g) => label(g, "text-center !text-[0.7rem] sm:!text-[0.78rem]"))}
      </div>

      {/* semivowels & sibilants */}
      <div className="grid grid-cols-2 gap-4">
        {TAIL.map((g) => (
          <div key={g.id}>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-2">{g.letters.map((l) => tile(l))}</div>
            {label(g)}
          </div>
        ))}
      </div>

      {/* explanation of the focused group */}
      <div className="mt-6 min-h-[5.5rem] rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4" aria-live="polite">
        {group ? (
          <>
            <p className="font-semibold text-xl font-semibold leading-tight">
              <span className="italic">{group.name}</span>
              {group.gloss && <span className="text-[var(--fg-muted)] font-normal"> — {group.gloss}</span>}
            </p>
            <p className="text-sm text-[var(--fg-muted)] mt-1">
              In Pāṇini&apos;s terms: {group.paninian}.{" "}
              <Link href={sutraHref(group.sutra)} className="text-[var(--color-vermillion)] dark:text-[var(--color-gold-light)] underline underline-offset-2">
                Read sūtra {group.sutra}
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="font-devanagari text-xl" lang="sa-Deva">
              नारायणादुद्भूतोऽयं वर्णक्रमः
            </p>
            <p className="text-sm text-[var(--fg-muted)] mt-1">
              <span className="italic">nārāyaṇād udbhūto &apos;yaṁ varṇa-kramaḥ</span> — this series of letters appeared
              from Nārāyaṇa.{" "}
              <Link href={sutraHref(1)} className="text-[var(--color-vermillion)] dark:text-[var(--color-gold-light)] underline underline-offset-2">
                Sūtra 1
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
