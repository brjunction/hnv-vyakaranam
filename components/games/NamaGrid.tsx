"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flame, Gauge, GraduationCap, Leaf, RotateCcw, Timer } from "lucide-react";
import { shuffle, type Difficulty, type Question } from "@/lib/practiceData";
import { RuleCard, Stars, useBest } from "@/components/games/shared";

// Nāma Grid. A noun's whole declension is an 8 × 3 table — eight cases, three
// numbers. The forms lie in a bank below; put each one in its place. Tap a form,
// then the cell it belongs to (or the cell first, then the form). A right form
// locks in; a wrong one tells you where it really belongs.
// The tables are the paradigms of the HNV Wiki (Nāma-prakaraṇa).
// A paradigm is stored like a question: prompt = the stem, promptSub = its kind,
// options = the 24 forms (case by case: eka, dvi, bahu), "" where a number is absent.

const CASES: [string, string][] = [
  ["Prathamā", "Nominative"],
  ["Dvitīyā", "Accusative"],
  ["Tṛtīyā", "Instrumental"],
  ["Caturthī", "Dative"],
  ["Pañcamī", "Ablative"],
  ["Ṣaṣṭhī", "Genitive"],
  ["Saptamī", "Locative"],
  ["Sambodhana", "Vocative"],
];
const NUMS = ["Eka-vacana", "Dvi-vacana", "Bahu-vacana"];
const NUM_SHORT = ["singular", "dual", "plural"];

const LEVELS: Record<Difficulty, { label: string; given: number; secs: number; lives: number; icon: typeof Leaf; pool: Difficulty[]; blurb: string }> = {
  easy: { label: "Easy", given: 9, secs: 150, lives: 6, icon: Leaf, pool: ["easy"], blurb: "Nine forms are already in place." },
  medium: { label: "Medium", given: 4, secs: 150, lives: 5, icon: Gauge, pool: ["easy", "medium"], blurb: "Four forms given; the rest are yours." },
  hard: { label: "Hard", given: 0, secs: 180, lives: 4, icon: Flame, pool: ["easy", "medium", "hard"], blurb: "An empty table — every form is yours." },
};
const SET = 3;
type Mode = "study" | "challenge";
type Phase = "menu" | "play" | "done";

type Tile = { id: number; t: string; used: boolean };

export default function NamaGrid({ paradigms }: { paradigms: Question[] }) {
  const valid = useMemo(() => paradigms.filter((p) => p.options.length === 24 && p.options.some(Boolean)), [paradigms]);
  const [mode, setMode] = useState<Mode>("study");
  const [level, setLevel] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<Phase>("menu");
  const [queue, setQueue] = useState<Question[]>([]);
  const [cur, setCur] = useState<Question | null>(null);
  const [cells, setCells] = useState<string[]>([]);
  const [fixed, setFixed] = useState<boolean[]>([]);
  const [bank, setBank] = useState<Tile[]>([]);
  const [selTile, setSelTile] = useState<number | null>(null);
  const [selCell, setSelCell] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ cell: number; tile: number } | null>(null);
  const [note, setNote] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [lives, setLives] = useState(5);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [tablesDone, setTablesDone] = useState(0);
  const [results, setResults] = useState<{ q: Question; mistakes: number }[]>([]);
  const [left, setLeft] = useState(0);
  const [over, setOver] = useState<"" | "time" | "lives">("");
  const [fresh, setFresh] = useState(false);
  const [setSize, setSetSize] = useState(SET);
  const clock = useRef(0);
  const cfg = LEVELS[level];
  const { best, submit } = useBest(`grid:${mode}:${level}`);

  const stopClock = useCallback(() => window.clearInterval(clock.current), []);
  useEffect(() => stopClock, [stopClock]);

  function load(q: Question, lv: Difficulty) {
    const forms = q.options;
    const filled: string[] = forms.map(() => "");
    const fx: boolean[] = forms.map(() => false);
    const real = forms.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
    shuffle(real).slice(0, Math.min(LEVELS[lv].given, Math.max(0, real.length - 6))).forEach((i) => {
      filled[i] = forms[i];
      fx[i] = true;
    });
    setCur(q);
    setCells(filled);
    setFixed(fx);
    setBank(shuffle(real.filter((i) => !fx[i]).map((i) => forms[i])).map((t, id) => ({ id, t, used: false })));
    setSelTile(null);
    setSelCell(null);
    setFlash(null);
    setNote("");
    setMistakes(0);
  }

  function begin(m: Mode, lv: Difficulty) {
    stopClock();
    const L = LEVELS[lv];
    let src = valid.filter((x) => L.pool.includes(x.difficulty));
    if (!src.length) src = valid;
    const set = shuffle(src).slice(0, SET);
    setMode(m);
    setLevel(lv);
    setLives(L.lives);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTablesDone(0);
    setResults([]);
    setOver("");
    setFresh(false);
    setLeft(L.secs);
    setSetSize(set.length);
    setQueue(set.slice(1));
    load(set[0], lv);
    setPhase("play");
  }

  const total = cur ? cur.options.filter(Boolean).length : 0;
  const filledCount = cells.filter(Boolean).length;
  const complete = !!cur && filledCount === total;

  // Challenge: one clock for the whole set of tables.
  useEffect(() => {
    stopClock();
    if (phase !== "play" || mode !== "challenge" || complete) return;
    clock.current = window.setInterval(() => setLeft((n) => n - 1), 1000);
    return stopClock;
  }, [phase, mode, complete, stopClock, cur]);
  useEffect(() => {
    if (phase === "play" && mode === "challenge" && left <= 0 && !complete) endSet("time");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  function endSet(why: "time" | "lives" | "" = "") {
    stopClock();
    if (mode === "challenge") setFresh(submit(score));
    setOver(why);
    setPhase("done");
  }

  function place(cell: number, tileId: number) {
    if (!cur || complete) return;
    const tile = bank.find((x) => x.id === tileId);
    if (!tile || tile.used || cells[cell]) return;
    if (cur.options[cell] === tile.t) {
      setCells((c) => c.map((v, i) => (i === cell ? tile.t : v)));
      setBank((b) => b.map((x) => (x.id === tileId ? { ...x, used: true } : x)));
      const s = streak + 1;
      setStreak(s);
      setBestStreak((b) => Math.max(b, s));
      setScore((v) => v + 10 + Math.min(s, 8) * 2);
      setNote("");
    } else {
      const homes = cur.options.map((f, i) => (f === tile.t ? i : -1)).filter((i) => i >= 0);
      const where = homes.map((i) => `${CASES[Math.floor(i / 3)][0]} ${NUM_SHORT[i % 3]}`);
      setNote(`${tile.t} does not go there — it is ${where.slice(0, 3).join(" / ")}${where.length > 3 ? " …" : ""}.`);
      setFlash({ cell, tile: tileId });
      window.setTimeout(() => setFlash(null), 450);
      setStreak(0);
      setMistakes((m) => m + 1);
      if (mode === "challenge") {
        const l = lives - 1;
        setLives(l);
        if (l <= 0) window.setTimeout(() => endSet("lives"), 500);
      }
    }
    setSelTile(null);
    setSelCell(null);
  }

  function pickTile(id: number) {
    if (selCell !== null) return place(selCell, id);
    setSelTile((s) => (s === id ? null : id));
  }
  function pickCell(i: number) {
    if (!cur || !cur.options[i] || cells[i]) return;
    if (selTile !== null) return place(i, selTile);
    setSelCell((s) => (s === i ? null : i));
  }

  // When a table is finished, remember how it went.
  const recorded = useRef<Question | null>(null);
  useEffect(() => {
    if (!complete || !cur || recorded.current === cur) return;
    recorded.current = cur;
    setResults((r) => [...r, { q: cur, mistakes }]);
    setScore((v) => v + (mistakes === 0 ? 100 : mistakes <= 2 ? 40 : 10) + (mode === "challenge" ? Math.max(0, left) : 0));
    setTablesDone((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, cur]);

  function nextTable() {
    if (!queue.length) return endSet("");
    const [n, ...rest] = queue;
    setQueue(rest);
    load(n, level);
  }

  if (!valid.length) {
    return <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">The declension tables for Nāma Grid are being added — please come back soon.</p>;
  }

  const sceneTop = (
    <div className="ng-head">
      <div>
        <p className="ng-kicker">Nāma · declension table</p>
        <p className="ng-title">{cur ? cur.prompt : ""}</p>
        <p className="ng-sub">{cur?.promptSub}</p>
      </div>
      {cur && (
        <div className="ng-ring" style={{ ["--p" as string]: `${total ? (filledCount / total) * 100 : 0}%` }} aria-label={`${filledCount} of ${total} forms placed`}>
          <b>{filledCount}</b><span>/ {total}</span>
        </div>
      )}
    </div>
  );

  if (phase === "menu") {
    return (
      <div className="ng-scene ng-idle">
        <div className="fg-menu">
          <p className="font-devanagari text-3xl">नाम-कोष्ठकम्</p>
          <p className="mx-auto mt-1 max-w-lg text-sm opacity-85">A noun has eight cases in three numbers. Fill the whole declension table from the bank of forms — and see where every form belongs.</p>
          <div className="rv-modes">
            <button type="button" onClick={() => setMode("study")} className={mode === "study" ? "on" : ""}>
              <GraduationCap size={18} /> <b>Study</b>
              <span>No clock. A wrong form tells you exactly where it belongs.</span>
            </button>
            <button type="button" onClick={() => setMode("challenge")} className={mode === "challenge" ? "on" : ""}>
              <Timer size={18} /> <b>Challenge</b>
              <span>One clock for {SET} tables, limited mistakes, a score to beat.</span>
            </button>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {(Object.keys(LEVELS) as Difficulty[]).map((k) => {
              const L = LEVELS[k];
              return (
                <button key={k} type="button" onClick={() => begin(mode, k)} className="rr-level" title={L.blurb}>
                  <L.icon size={15} /> {L.label}
                  {mode === "challenge" && <span className="opacity-70">· {L.secs}s</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs opacity-75">{cfg.blurb} · {Math.min(SET, valid.length)} tables per round</p>
          {mode === "challenge" && best !== null && <p className="mt-1 text-xs opacity-80">Your best on {cfg.label}: {best}</p>}
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const clean = results.filter((r) => r.mistakes === 0).length;
    const finished = results.length >= setSize;
    const stars = !finished ? 0 : clean === results.length ? 3 : results.every((r) => r.mistakes <= 2) ? 2 : 1;
    return (
      <div>
        <div className="ng-scene ng-idle">
          <div className="fg-menu">
            <p className="text-3xl font-semibold">{over === "time" ? "Time is up" : over === "lives" ? "Too many wrong forms" : "Tables complete!"}</p>
            <div className="my-2"><Stars n={stars} /></div>
            <p className="text-sm opacity-90">{results.length} table{results.length === 1 ? "" : "s"} finished · {clean} without a mistake{mode === "challenge" ? ` · score ${score}${fresh ? " — a new best!" : ""}` : ""} · longest run {bestStreak}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {(Object.keys(LEVELS) as Difficulty[]).map((k) => <button key={k} type="button" onClick={() => begin(mode, k)} className="rr-level"><RotateCcw size={14} /> {LEVELS[k].label}</button>)}
              <button type="button" onClick={() => setPhase("menu")} className="rr-level">Menu</button>
            </div>
          </div>
        </div>
        {results.length > 0 && (
          <div className="rv-panel">
            <p className="mb-3 font-semibold">The tables you filled</p>
            <div className="grid gap-4">
              {results.map(({ q, mistakes: m }) => (
                <div key={q.id}>
                  <p className="mb-1 font-semibold">{q.prompt} <span className="font-normal text-[var(--fg-muted)]">· {q.promptSub} · {m === 0 ? "no mistakes" : `${m} mistake${m === 1 ? "" : "s"}`}</span></p>
                  <RuleCard q={q} ok picked={null} plain />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!cur) return null;
  return (
    <div>
      <div className={`ng-scene ${complete ? "ng-won" : ""}`}>
        <div className="fg-hud ng-hud">
          {mode === "challenge" ? (
            <>
              <p className="rv-chip"><Timer size={13} /> <b className="tabular-nums">{Math.max(left, 0)}s</b></p>
              <p className="rv-hearts" aria-label={`${Math.max(lives, 0)} mistakes left`}>
                {"♥".repeat(Math.max(lives, 0))}
                <span>{"♥".repeat(Math.max(cfg.lives - lives, 0))}</span>
              </p>
            </>
          ) : (
            <p className="rv-chip"><GraduationCap size={13} /> Study mode</p>
          )}
          <p className="rv-chip">Score <b>{score}</b></p>
          {streak >= 3 && <p className="rv-chip combo">🔥 ×{streak}</p>}
          <p className="rv-chip ml-auto">Table <b>{Math.min(tablesDone + (complete ? 0 : 1), setSize)}</b> / {setSize}</p>
          <button type="button" onClick={() => { stopClock(); setPhase("menu"); }} className="rv-chip">Menu</button>
        </div>
        {sceneTop}

        <div className="ng-table" role="table" aria-label={`Declension of ${cur.prompt}`}>
          <div className="ng-row ng-th" role="row">
            <span />
            {NUMS.map((n) => <span key={n} role="columnheader">{n}</span>)}
          </div>
          {CASES.map(([c, en], r) => (
            <div key={c} className="ng-row" role="row">
              <span className="ng-case" role="rowheader"><b>{c}</b><i>{en}</i></span>
              {[0, 1, 2].map((k) => {
                const i = r * 3 + k;
                const form = cur.options[i];
                if (!form) return <span key={k} className="ng-cell none" role="cell">—</span>;
                const done = !!cells[i];
                const isFlash = flash?.cell === i;
                return (
                  <button
                    key={k}
                    type="button"
                    role="cell"
                    onClick={() => pickCell(i)}
                    className={`ng-cell ${done ? (fixed[i] ? "given" : "got") : "empty"} ${selCell === i ? "sel" : ""} ${isFlash ? "bad" : ""} ${selTile !== null && !done ? "ready" : ""}`}
                    aria-label={done ? `${c} ${NUM_SHORT[k]}: ${cells[i]}` : `${c} ${NUM_SHORT[k]}: empty`}
                  >
                    {done ? cells[i] : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="rv-panel">
        {!complete ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-saffron)]">Forms of {cur.prompt}</p>
            <p className="mb-3 mt-0.5 text-[11px] text-[var(--fg-muted)]">Tap a form, then its cell — or a cell, then its form.</p>
            <div className="ng-bank">
              {bank.map((x) => (
                <button key={x.id} type="button" disabled={x.used} onClick={() => pickTile(x.id)} className={`ng-tile ${selTile === x.id ? "sel" : ""} ${flash?.tile === x.id ? "bad" : ""}`}>
                  {x.t}
                </button>
              ))}
            </div>
            <p className="mt-3 min-h-[1.5rem] text-sm text-[var(--color-vermillion)]" aria-live="polite">{note}</p>
          </>
        ) : (
          <>
            <p className="mb-1 text-lg font-semibold">{mistakes === 0 ? "Perfect table!" : `Table complete — ${mistakes} mistake${mistakes === 1 ? "" : "s"}`}</p>
            <RuleCard q={cur} ok picked={null} plain />
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={nextTable} className="gm-next">{queue.length ? "Next table" : "See the result"} <span aria-hidden>→</span></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
