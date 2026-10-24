"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flame, Gauge, Leaf, RotateCcw, Timer } from "lucide-react";
import { shuffle, type Difficulty, type Question } from "@/lib/practiceData";

// Sandhi Match — flip two cards: a pair "word + word" and the joined form
// (or a joined form and its split). Match every pair before time runs out.

const LEVELS: Record<Difficulty, { label: string; pairs: number; secs: number; icon: typeof Leaf; pool: Difficulty[] }> = {
  easy: { label: "Easy", pairs: 4, secs: 90, icon: Leaf, pool: ["easy"] },
  medium: { label: "Medium", pairs: 6, secs: 90, icon: Gauge, pool: ["easy", "medium"] },
  hard: { label: "Hard", pairs: 8, secs: 75, icon: Flame, pool: ["easy", "medium", "hard"] },
};

type Card = { id: string; pair: number; text: string };

export default function SandhiMatch({ questions }: { questions: Question[] }) {
  const [level, setLevel] = useState<Difficulty | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [pairs, setPairs] = useState<Question[]>([]);
  const [up, setUp] = useState<string[]>([]);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [miss, setMiss] = useState<string[]>([]);
  const [left, setLeft] = useState(0);
  const [moves, setMoves] = useState(0);

  function start(d: Difficulty) {
    const L = LEVELS[d];
    let pool = questions.filter((q) => L.pool.includes(q.difficulty));
    if (pool.length < 2) pool = questions;
    // one card per distinct text
    const seen = new Set<string>();
    const chosen = shuffle(pool).filter((q) => {
      const a = q.prompt, b = q.options[q.correctIndex];
      if (seen.has(a) || seen.has(b)) return false;
      seen.add(a); seen.add(b);
      return true;
    }).slice(0, L.pairs);
    setPairs(chosen);
    setCards(shuffle(chosen.flatMap((q, i) => [
      { id: `${i}a`, pair: i, text: q.prompt },
      { id: `${i}b`, pair: i, text: q.options[q.correctIndex] },
    ])));
    setUp([]); setDone(new Set()); setMiss([]); setMoves(0);
    setLeft(L.secs);
    setLevel(d);
  }

  const finished = level && (done.size === pairs.length || left <= 0);
  useEffect(() => {
    if (!level || finished) return;
    const t = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(t);
  }, [level, finished]);

  function flip(c: Card) {
    if (finished || done.has(c.pair) || up.includes(c.id) || up.length === 2) return;
    const next = [...up, c.id];
    setUp(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((id) => cards.find((x) => x.id === id)!);
      if (a.pair === b.pair) {
        setTimeout(() => { setDone((d) => new Set(d).add(a.pair)); setUp([]); }, 350);
      } else {
        setMiss(next);
        setTimeout(() => { setUp([]); setMiss([]); }, 900);
      }
    }
  }

  if (!questions.length) {
    return <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">The Sandhi questions are being added — please come back soon.</p>;
  }

  const LevelButtons = (
    <div className="flex flex-wrap justify-center gap-2">
      {(Object.keys(LEVELS) as Difficulty[]).map((d) => {
        const L = LEVELS[d];
        return (
          <button key={d} type="button" onClick={() => start(d)} className="rr-level">
            <L.icon size={15} /> {L.label} <span className="opacity-70">· {L.pairs} pairs</span>
          </button>
        );
      })}
    </div>
  );

  if (!level) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-8 text-center">
        <p className="font-devanagari text-2xl">सन्धि-युग्मम्</p>
        <p className="mx-auto mb-5 mt-1 max-w-md text-sm text-[var(--fg-muted)]">Flip two cards at a time. Pair each “word + word” with its joined form before the time runs out.</p>
        {LevelButtons}
      </div>
    );
  }

  const won = done.size === pairs.length;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${left <= 10 ? "text-[var(--color-vermillion)]" : ""}`}><Timer size={15} /> {Math.max(left, 0)}s</span>
        <span className="text-[var(--fg-muted)]">{done.size}/{pairs.length} pairs · {moves} moves</span>
        <button type="button" onClick={() => start(level)} className="ui-btn ui-btn-sm ml-auto"><RotateCcw size={14} /> Restart</button>
      </div>
      <div className={`grid gap-3 ${cards.length > 12 ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4"}`}>
        {cards.map((c) => {
          const isUp = up.includes(c.id) || done.has(c.pair) || !!finished;
          return (
            <button key={c.id} type="button" onClick={() => flip(c)} className={`sm-card ${isUp ? "up" : ""} ${done.has(c.pair) ? "done" : ""} ${miss.includes(c.id) ? "miss" : ""}`} aria-label={isUp ? c.text : "Hidden card"}>
              <span className="sm-inner">
                <span className="sm-face sm-back">ॐ</span>
                <span className="sm-face sm-front">{c.text}</span>
              </span>
            </button>
          );
        })}
      </div>
      {finished && (
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-5">
          <p className="text-lg font-semibold">{won ? `All pairs matched in ${moves} moves!` : "Time is up"}</p>
          <ul className="mt-3 grid gap-2 text-sm">
            {pairs.map((q, i) => (
              <li key={i}>
                <span className="font-devanagari text-base">{q.prompt} → {q.options[q.correctIndex]}</span>{" "}
                {q.sutraRefs.map((n) => <Link key={n} href={`/sutras/${encodeURIComponent(n)}`} className="sutra-xref ml-1">Sūtra {n}</Link>)}
              </li>
            ))}
          </ul>
          <div className="mt-4">{LevelButtons}</div>
        </div>
      )}
    </div>
  );
}
