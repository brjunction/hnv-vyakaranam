"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sanscript from "@indic-transliteration/sanscript";
import { joinWords, splitWord, SUTRAS, type Step } from "@/lib/grammar/sandhi";

// Sandhi Joiner & Splitter. Input in IAST or Devanagari; results in both.
const isDeva = (s: string) => /[ऀ-ॿ]/.test(s);
const toIast = (s: string) => (isDeva(s) ? Sanscript.t(s, "devanagari", "iast") : s).normalize("NFC").replace(/ṃ/g, "ṁ");
const deva = (s: string) => Sanscript.t(s.replace(/ṁ/g, "ṃ").replace(/m̐/g, "m~").replace(/l̐/g, "l~"), "iast", "devanagari");

function Steps({ steps }: { steps: Step[] }) {
  if (!steps.length) return <p className="text-sm text-[var(--fg-muted)]">No sandhi: the words stay as they are.</p>;
  return (
    <ol className="mt-2 grid gap-1.5 text-sm">
      {steps.map((s, i) => (
        <li key={i} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
          <span className="font-medium">{s.change}</span>
          {s.optional && <span className="ml-2 rounded-full bg-[var(--accent)]/15 px-2 text-xs text-[var(--accent)]">optional</span>}
          <span className="mt-0.5 block text-[var(--fg-muted)]">
            <Link href={`/sutras/${s.sutra}`} className="font-medium text-[var(--accent)] hover:underline">Sūtra {s.sutra}</Link>: <i>{SUTRAS[s.sutra]?.t}</i>
            {SUTRAS[s.sutra]?.p && <span className="block text-xs">Pāṇini {SUTRAS[s.sutra].p}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Stems to look up for a word ("rāmaḥ" → rāmaḥ, rāma …). */
const stems = (w: string) => [w, w.replace(/ḥ$/, ""), w.replace(/(aḥ|am)$/, "a"), w.replace(/(āḥ|ām)$/, "ā"), w.replace(/[iu]ḥ$/, (m) => m[0])].filter((x, i, a) => x.length > 1 && a.indexOf(x) === i);

export default function SandhiTool() {
  const [mode, setMode] = useState<"join" | "split">("join");
  const [q, setQ] = useState("");
  const [dual, setDual] = useState(false);
  const [known, setKnown] = useState<Record<string, boolean>>({});
  const iast = toIast(q.trim());

  const joined = useMemo(() => (mode === "join" && iast.split(/[\s+]+/).filter(Boolean).length > 1 ? joinWords(iast.split(/[\s+]+/).filter(Boolean), { dual }) : []), [iast, mode, dual]);
  const splits = useMemo(() => (mode === "split" && iast.length > 2 ? splitWord(iast) : []), [iast, mode]);

  // which split words are real words? (the site's dictionaries)
  useEffect(() => {
    if (mode !== "split" || !splits.length) return;
    const words = [...new Set(splits.slice(0, 16).flatMap((s) => [s.left, s.right]))].filter((w) => !(w in known));
    if (!words.length) return;
    let live = true;
    Promise.all(
      words.map(async (w) => {
        for (const st of stems(w)) {
          const r = await fetch(`/api/dict/entry?h=${encodeURIComponent(st)}`).then((x) => x.json()).catch(() => null);
          if (r?.entries?.length) return [w, true] as const;
        }
        return [w, false] as const;
      })
    ).then((res) => live && setKnown((k) => ({ ...k, ...Object.fromEntries(res) })));
    return () => {
      live = false;
    };
  }, [splits, mode, known]);

  const ranked = useMemo(
    () => [...splits].map((s) => ({ ...s, real: (known[s.left] ? 1 : 0) + (known[s.right] ? 1 : 0) })).sort((a, b) => b.real - a.real || b.score - a.score),
    [splits, known]
  );

  return (
    <div>
      <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1 text-sm">
        {(["join", "split"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-lg px-4 py-1.5 ${mode === m ? "bg-[var(--accent)] font-medium text-[var(--color-ink)]" : "text-[var(--fg-muted)]"}`}>
            {m === "join" ? "Join words" : "Split a form"}
          </button>
        ))}
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={mode === "join" ? "rāmaḥ atra  ·  tat śivam  ·  deva ālaya" : "devālaya  ·  harir atra  ·  vāgīśaḥ"}
        className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-lg shadow-sm"
        lang="sa"
        autoFocus
      />
      <p className="mt-1.5 text-xs text-[var(--fg-muted)]">IAST or Devanagari. {mode === "join" ? "Separate the words with spaces." : "Type the joined form."} Shift after a letter adds its diacritic.</p>
      {mode === "join" && (
        <label className="mt-2 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={dual} onChange={(e) => setDual(e.target.checked)} /> The first word is a dual in ī, ū or e (Sūtra 60)
        </label>
      )}

      {mode === "join" &&
        joined.map((v, i) => (
          <section key={v.text} className={`mt-5 rounded-2xl border p-4 sm:p-5 ${i === 0 ? "border-[var(--accent)]/60 bg-[var(--bg-2)]" : "border-[var(--border)]"}`}>
            <p className="text-2xl font-semibold" lang="sa">{v.text}</p>
            <p className="font-devanagari text-xl text-[var(--fg-muted)]" lang="sa-Deva">{deva(v.text)}</p>
            <Steps steps={v.steps} />
          </section>
        ))}

      {mode === "split" && iast.length > 2 && !ranked.length && <p className="mt-5 text-sm text-[var(--fg-muted)]">No sandhi found that gives this form.</p>}
      {mode === "split" &&
        ranked.slice(0, 12).map((s) => (
          <section key={`${s.left}+${s.right}`} className={`mt-4 rounded-2xl border p-4 ${s.real === 2 ? "border-[var(--accent)]/60 bg-[var(--bg-2)]" : "border-[var(--border)]"}`}>
            <p className="text-xl font-semibold" lang="sa">
              {s.left} <span className="text-[var(--fg-muted)]">+</span> {s.right}
              {s.real === 2 && <span className="ml-2 align-middle text-xs font-normal text-[var(--accent)]">both words in the dictionaries</span>}
            </p>
            <p className="font-devanagari text-lg text-[var(--fg-muted)]" lang="sa-Deva">{deva(s.left)} + {deva(s.right)}</p>
            <Steps steps={s.steps} />
          </section>
        ))}
    </div>
  );
}
