"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { shuffle } from "@/lib/practiceData";

// Tap-in-order engine, used by Varṇa Order and Sūtra Order. Tiles lie in a
// shuffled heap; tap the one that comes next. A right tile joins the line
// (and shows its caption); a wrong one costs a mistake and shakes.

export type OrderItem = { id: string; main: string; sub?: string; caption?: string };

export type RoundResult = { mistakes: number; seconds: number; score: number; stars: number };

export function roundScore(n: number, mistakes: number, seconds: number): RoundResult {
  const par = n * 2.2; // seconds a calm player needs
  const score = Math.max(0, Math.round(n * 40 - mistakes * 45 - Math.max(0, seconds - par) * 3));
  const stars = mistakes === 0 && seconds <= par * 1.6 ? 3 : mistakes <= 2 ? 2 : 1;
  return { mistakes, seconds, score, stars };
}

export default function OrderRound({
  items,
  wide = false,
  onDone,
}: {
  /** In the CORRECT order. */
  items: OrderItem[];
  /** Wide cards (sūtra text) instead of small letter tiles. */
  wide?: boolean;
  onDone: (r: RoundResult) => void;
}) {
  const heap = useMemo(() => shuffle(items.map((_, i) => i)), [items]);
  const [placed, setPlaced] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [shake, setShake] = useState<number | null>(null);
  const [secs, setSecs] = useState(0);
  const start = useRef(Date.now());
  const done = placed >= items.length;

  useEffect(() => {
    start.current = Date.now();
    setSecs(0);
  }, [items]);
  useEffect(() => {
    if (done) return;
    const t = window.setInterval(() => setSecs(Math.floor((Date.now() - start.current) / 1000)), 500);
    return () => window.clearInterval(t);
  }, [done, items]);
  useEffect(() => {
    if (done && items.length) onDone(roundScore(items.length, mistakes, (Date.now() - start.current) / 1000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function tap(i: number) {
    if (done) return;
    if (i === placed) setPlaced(placed + 1);
    else {
      setMistakes((m) => m + 1);
      setShake(i);
      window.setTimeout(() => setShake(null), 380);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-[var(--fg-muted)]">
        <span>
          Placed <b className="text-[var(--fg)]">{placed}</b> / {items.length}
        </span>
        <span>
          Mistakes <b className="text-[var(--fg)]">{mistakes}</b> · {secs}s
        </span>
      </div>

      <div className={`mb-5 flex min-h-[4.5rem] flex-wrap gap-2 rounded-2xl border border-dashed border-[var(--border)] p-3 ${wide ? "flex-col" : ""}`} aria-label="Your line">
        {items.slice(0, placed).map((it, i) => (
          <div key={it.id} className={`rounded-xl border border-[var(--accent)] bg-[var(--bg-2)] px-3 py-2 ${wide ? "text-left" : "min-w-[3.2rem] text-center"}`}>
            <div className={`font-devanagari ${wide ? "text-base" : "text-2xl"}`}>{it.main}</div>
            {(it.caption || it.sub) && <div className="text-[11px] text-[var(--fg-muted)]">{it.caption ?? it.sub}</div>}
            <span className="sr-only">{i + 1}</span>
          </div>
        ))}
        {placed === 0 && <p className="self-center text-sm text-[var(--fg-faint)]">Tap the tile that comes first…</p>}
      </div>

      <div className={wide ? "grid gap-2" : "flex flex-wrap gap-2"}>
        {heap.map((i) =>
          i < placed ? null : (
            <button
              key={items[i].id}
              type="button"
              onClick={() => tap(i)}
              className={`rounded-xl border bg-[var(--bg-2)] px-3 py-2 transition-transform hover:-translate-y-0.5 active:scale-95 ${
                shake === i ? "border-red-500 [animation:gm-shake_.38s]" : "border-[var(--border)]"
              } ${wide ? "text-left" : "min-w-[3.2rem] text-center"}`}
            >
              <span className={`font-devanagari ${wide ? "text-base" : "text-2xl"}`}>{items[i].main}</span>
              {items[i].sub && !wide && <span className="block text-[11px] text-[var(--fg-muted)]">{items[i].sub}</span>}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export function ResultBar({ r, onAgain, onMenu, label }: { r: RoundResult; onAgain: () => void; onMenu: () => void; label?: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-5 text-center">
      <p className="text-2xl">{"★".repeat(r.stars)}<span className="opacity-25">{"★".repeat(3 - r.stars)}</span></p>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">
        {label ?? "Done"} · {r.mistakes} mistake{r.mistakes === 1 ? "" : "s"} · {Math.round(r.seconds)}s · <b className="text-[var(--fg)]">{r.score}</b> points
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <button type="button" onClick={onAgain} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--color-ink)]">
          <RotateCcw size={14} /> Again
        </button>
        <button type="button" onClick={onMenu} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm">Menu</button>
      </div>
    </div>
  );
}
