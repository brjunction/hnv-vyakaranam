"use client";

import { useEffect, useState } from "react";
import { Flame, GraduationCap, Gauge, Leaf, RotateCcw, Timer } from "lucide-react";
import { Formula, RuleCard, Stars } from "@/components/games/shared";
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
  const [timed, setTimed] = useState(false);
  const [lastPair, setLastPair] = useState<number | null>(null);

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
    setLastPair(null);
    setLevel(d);
  }

  const finished = level && (done.size === pairs.length || (timed && left <= 0));
  useEffect(() => {
    if (!level || finished || !timed) return;
    const t = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(t);
  }, [level, finished, timed]);

  function flip(c: Card) {
    if (finished || done.has(c.pair) || up.includes(c.id) || up.length === 2) return;
    const next = [...up, c.id];
    setUp(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((id) => cards.find((x) => x.id === id)!);
      if (a.pair === b.pair) {
        setTimeout(() => { setDone((d) => new Set(d).add(a.pair)); setLastPair(a.pair); setUp([]); }, 350);
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
        <div className="mx-auto mb-5 grid max-w-md gap-2 sm:grid-cols-2">
          {([[false, "Study", "No clock. Every pair you match shows its rule and sūtra."], [true, "Timed", "Beat the clock. Rules are shown at the end."]] as const).map(([t, name, text]) => (
            <button key={name} type="button" onClick={() => setTimed(t)} className={`rounded-xl border p-3 text-left text-sm transition-colors ${timed === t ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)]"}`}>
              <b className="flex items-center gap-1.5">{t ? <Timer size={15} /> : <GraduationCap size={15} />} {name}</b>
              <span className="text-xs text-[var(--fg-muted)]">{text}</span>
            </button>
          ))}
        </div>
        {LevelButtons}
      </div>
    );
  }

  const won = done.size === pairs.length;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        {timed && <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${left <= 10 ? "text-[var(--color-vermillion)]" : ""}`}><Timer size={15} /> {Math.max(left, 0)}s</span>}
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
      {!finished && lastPair !== null && pairs[lastPair] && (
        <div className="mt-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-saffron)]">You matched</p>
          <Formula q={pairs[lastPair]} answer={pairs[lastPair].options[pairs[lastPair].correctIndex]} big={false} />
          <RuleCard q={pairs[lastPair]} ok picked={null} plain />
        </div>
      )}
      {finished && (
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-5">
          <p className="text-lg font-semibold">{won ? `All pairs matched in ${moves} moves!` : "Time is up"}</p>
          <div className="mt-2"><Stars n={won ? (moves <= pairs.length + 3 ? 3 : moves <= pairs.length * 2 ? 2 : 1) : 0} /></div>
          <p className="mb-2 mt-4 text-sm font-semibold">The rules behind every pair</p>
          <div className="grid gap-4">
            {pairs.map((q, i) => (
              <div key={i}>
                <div className="mb-1"><Formula q={q} answer={q.options[q.correctIndex]} big={false} /></div>
                <RuleCard q={q} ok picked={null} plain />
              </div>
            ))}
          </div>
          <div className="mt-4">{LevelButtons}</div>
        </div>
      )}
    </div>
  );
}
