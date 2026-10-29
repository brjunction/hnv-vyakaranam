"use client";

import { useMemo, useState } from "react";
import OrderRound, { ResultBar, type OrderItem, type RoundResult } from "@/components/games/OrderGame";
import { Stars, useBest } from "@/components/games/shared";
import type { SutraLine } from "@/lib/practiceData";

// Sūtra Order — a few consecutive sūtras of the chosen prakaraṇa lie in a
// heap. Tap them in the order the grammar gives them: the sūtras follow each
// other for a reason, and knowing the sequence is knowing the text.
// The sūtras come straight from the database; nothing is made up.

const SIZE = { easy: 4, medium: 5, hard: 7 } as const;
type Lv = keyof typeof SIZE;

const clean = (s: string) => s.length >= 6 && s.length <= 90 && !/[<>{}[\]\d]{3,}/.test(s);

export const orderable = (lines: SutraLine[]) => lines.filter((l) => clean(l.iast)).length >= 8;

export default function SutraOrder({ lines }: { lines: SutraLine[] }) {
  const usable = useMemo(() => lines.filter((l) => clean(l.iast)), [lines]);
  const [lv, setLv] = useState<Lv | null>(null);
  const [round, setRound] = useState(0);
  const [res, setRes] = useState<RoundResult | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const { best, submit } = useBest(`sutra-order:${lv ?? ""}`);

  function next(level: Lv) {
    const n = Math.min(SIZE[level], usable.length);
    // a run of neighbours in the text, starting at a random place
    const start = Math.floor(Math.random() * (usable.length - n + 1));
    const run = usable.slice(start, start + n);
    setItems(run.map((l) => ({ id: l.number, main: l.iast, caption: `Sūtra ${l.number} · ${l.iast}` })));
    setRes(null);
    setLv(level);
    setRound((r) => r + 1);
  }

  if (!lv)
    return (
      <div>
        <p className="mb-4 text-sm text-[var(--fg-muted)]">Some sūtras lie in a heap. Tap them in the order the text gives them.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(SIZE) as Lv[]).map((k) => (
            <button key={k} type="button" onClick={() => next(k)} className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-4 text-left hover:border-[var(--accent)]">
              <span className="font-medium capitalize">{k}</span>
              <span className="block text-sm text-[var(--fg-muted)]">{SIZE[k]} sūtras in a row</span>
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <div>
      <OrderRound key={round} items={items} wide onDone={(r) => { setRes(r); submit(r.score); }} />
      {res && (
        <>
          <p className="mt-4 text-center text-sm text-[var(--fg-muted)]">The numbers: {items.map((i) => i.id).join(" → ")}</p>
          <ResultBar r={res} label="In order" onAgain={() => next(lv)} onMenu={() => setLv(null)} />
          <p className="mt-2 text-center text-xs text-[var(--fg-muted)]">Best here: {best ?? res.score} <Stars n={res.stars} /></p>
        </>
      )}
      {!res && <button type="button" onClick={() => setLv(null)} className="mt-6 text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]">← Change level</button>}
    </div>
  );
}
