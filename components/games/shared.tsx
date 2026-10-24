"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Check, Lightbulb, Star, X } from "lucide-react";
import { typeInfo } from "@/lib/practice/sections";
import type { Question } from "@/lib/practiceData";

// Pieces shared by the games. The point of every game here is to LEARN the
// grammar: the question is shown as a formula with the junction marked, and
// after each answer a rule card shows the sūtra itself.

const seg = (s: string): string[] => {
  try {
    const S = (Intl as unknown as { Segmenter?: new (l: string, o: object) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
    if (S) return [...new S("hi", { granularity: "grapheme" }).segment(s)].map((x) => x.segment);
  } catch {}
  return [...s];
};

/** "कृष्णम् + नमामि" with the last letter of word 1 and first of word 2 marked. */
export function Formula({ q, answer, big = true }: { q: Question; answer?: string | null; big?: boolean }) {
  const parts = q.prompt.split(/\s*\+\s*/);
  const size = big ? "text-3xl sm:text-4xl" : "text-xl";
  if (q.type === "sandhi" && parts.length === 2) {
    const a = seg(parts[0]);
    const b = seg(parts[1]);
    const Word = ({ g, mark }: { g: string[]; mark: "end" | "start" }) => (
      <span className="font-devanagari">
        {g.map((x, i) => {
          const on = mark === "end" ? i === g.length - 1 : i === 0;
          return <span key={i} className={on ? "gm-junction" : ""}>{x}</span>;
        })}
      </span>
    );
    return (
      <div className={`gm-formula ${size}`}>
        <Word g={a} mark="end" />
        <span className="gm-plus">+</span>
        <Word g={b} mark="start" />
        {answer && (
          <>
            <span className="gm-plus">=</span>
            <span className="gm-result font-devanagari">{answer}</span>
          </>
        )}
      </div>
    );
  }
  return (
    <div className={`gm-formula ${size}`}>
      <span className="font-devanagari">{q.prompt}</span>
      {answer && (
        <>
          <span className="gm-plus">→</span>
          <span className="gm-result font-devanagari">{answer}</span>
        </>
      )}
    </div>
  );
}

export function QuestionHead({ q }: { q: Question }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-saffron)]">{typeInfo(q.type).verb}</p>
      {q.type === "sandhi" && <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">The two marked letters are the ones that meet.</p>}
    </div>
  );
}

/** The four answers, with 50:50 removal and the right / wrong colouring. */
export function Options({ q, hidden, picked, locked, onPick }: { q: Question; hidden: Set<number>; picked: number | null; locked: boolean; onPick: (i: number) => void }) {
  return (
    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
      {q.options.map((o, i) => {
        const st = picked !== null || locked ? (i === q.correctIndex ? "ok" : i === picked ? "bad" : "") : "";
        return (
          <button key={i} type="button" disabled={locked || hidden.has(i)} onClick={() => onPick(i)} className={`rr-opt ${st} ${hidden.has(i) ? "gm-gone" : ""}`}>
            <span className="rr-key">{i + 1}</span>
            <span className="font-devanagari text-xl">{o}</span>
          </button>
        );
      })}
    </div>
  );
}

/** What the player reads after answering: verdict, the rule, the sūtra's own text. */
export function RuleCard({ q, ok, picked, timedOut, onNext, last, plain }: { q: Question; ok: boolean; picked: number | null; timedOut?: boolean; onNext?: () => void; last?: boolean; plain?: boolean }) {
  return (
    <div className={`gm-rule ${ok ? "ok" : "bad"} pq-in`}>
      {!plain && (<div className="flex flex-wrap items-center gap-2">
        <span className="gm-verdict">{ok ? <Check size={15} /> : <X size={15} />}</span>
        <p className="font-semibold">{ok ? "Correct" : timedOut ? "Time ran out" : "Not quite"}</p>
        {!ok && (
          <p className="text-sm">
            {picked !== null && <span className="text-[var(--fg-muted)]">you chose <span className="font-devanagari">{q.options[picked]}</span> · </span>}
            right answer: <b className="font-devanagari text-base">{q.options[q.correctIndex]}</b>
          </p>
        )}
      </div>)}
      <p className={`${plain ? "" : "mt-3 "}text-[15px] leading-relaxed`}>{q.explanation}</p>
      {q.sutras && q.sutras.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {q.sutras.map((s) => (
            <div key={s.number} className="gm-sutra">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-saffron)]">
                <BookOpen size={13} /> Sūtra {s.number}
              </p>
              {s.sanskrit && <p className="font-devanagari text-lg leading-snug">{s.sanskrit}</p>}
              {s.iast && <p className="text-sm italic text-[var(--fg-muted)]">{s.iast}</p>}
              {s.translation && <p className="mt-1 text-sm">{s.translation}</p>}
              <Link href={`/sutras/${encodeURIComponent(s.number)}`} target="_blank" className="mt-1 inline-block text-xs text-[var(--accent)] hover:underline">Open the sūtra with its vṛtti →</Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm">
          {q.sutraRefs.map((r) => (
            <Link key={r} href={`/sutras/${encodeURIComponent(r)}`} target="_blank" className="sutra-xref mr-1">Sūtra {r}</Link>
          ))}
        </p>
      )}
      {onNext && (
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onNext} className="gm-next">{last ? "See the result" : "Continue"} <span aria-hidden>→</span> <kbd>Enter</kbd></button>
        </div>
      )}
    </div>
  );
}

export function PowerUp({ icon, label, left, onUse, disabled }: { icon: React.ReactNode; label: string; left: number; onUse: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onUse} disabled={disabled || left <= 0} className="gm-power" title={label}>
      {icon} <span>{label}</span> <b>{left}</b>
    </button>
  );
}
export const HintIcon = <Lightbulb size={14} />;

export function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className="inline-flex gap-1" aria-label={`${n} of ${of} stars`}>
      {Array.from({ length: of }, (_, i) => (
        <Star key={i} size={30} className={i < n ? "gm-star on" : "gm-star"} style={{ animationDelay: `${i * 0.25}s` }} fill={i < n ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

/** Best score, remembered in this browser only. */
export function useBest(key: string) {
  const [best, setBest] = useState<number | null>(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem(`hnv:best:${key}`);
      setBest(v ? Number(v) : null);
    } catch {}
  }, [key]);
  const submit = (score: number) => {
    if (best === null || score > best) {
      setBest(score);
      try {
        localStorage.setItem(`hnv:best:${key}`, String(score));
      } catch {}
      return true;
    }
    return false;
  };
  return { best, submit };
}

/** Points for a right answer: base + streak + speed. */
export const points = (streak: number, timeFrac: number) => 100 + 25 * Math.min(streak, 6) + Math.round(50 * Math.max(0, timeFrac));
