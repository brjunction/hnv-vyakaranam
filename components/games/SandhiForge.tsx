"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Flame, Gauge, GraduationCap, Hammer, Leaf, Lightbulb, RotateCcw, Timer } from "lucide-react";
import { shuffle, type Difficulty, type Question } from "@/lib/practiceData";
import { Formula, RuleCard, Stars, points, useBest } from "@/components/games/shared";

// Sandhi Forge. Nothing is chosen from a list — the joined word is BUILT.
// The two words lie on the anvil; the letters that stay are fixed, and you
// forge the letters where the words meet, tile by tile. Hard: forge the whole word.
// Study: no clock, hints, unlimited tries. Challenge: a clock and lives.

const LEVELS: Record<Difficulty, { label: string; secs: number; lives: number; extra: number; icon: typeof Leaf; pool: Difficulty[]; blurb: string }> = {
  easy: { label: "Easy", secs: 30, lives: 4, extra: 3, icon: Leaf, pool: ["easy"], blurb: "Forge only the letters that change. Empty slots show how many." },
  medium: { label: "Medium", secs: 24, lives: 3, extra: 5, icon: Gauge, pool: ["easy", "medium"], blurb: "Forge the changing letters — no slot count, more tiles to choose from." },
  hard: { label: "Hard", secs: 20, lives: 3, extra: 5, icon: Flame, pool: ["easy", "medium", "hard"], blurb: "Forge the whole joined word, letter by letter." },
};
const ROUND = 8;
type Mode = "study" | "challenge";
type Phase = "menu" | "play" | "done";

/** Devanagari split into writing units: a consonant with its virama stays together, every sign is its own tile. */
export function tilesOf(s: string): string[] {
  const out: string[] = [];
  for (const ch of s) {
    if ((ch === "्" || ch === "़" || ch === "‍" || ch === "‌") && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}
const SIGNS = /^[ा-ौंःँ]$/;
export const tileLabel = (t: string) => (t === " " ? "␣" : SIGNS.test(t) ? `◌${t}` : t);

type Item = {
  q: Question;
  A: string[]; // first word, tiles
  B: string[];
  R: string[]; // joined word, tiles
  pre: string[]; // fixed letters before the forge
  mid: string[]; // what has to be forged
  suf: string[]; // fixed letters after
  tray: { id: number; t: string }[];
  whole: boolean;
};

function sandhiPair(q: Question): { a: string; b: string; r: string } | null {
  const ans = q.options[q.correctIndex];
  if (q.prompt.includes("+")) {
    const [a, b] = q.prompt.split(/\s*\+\s*/);
    return a && b ? { a: a.trim(), b: b.trim(), r: ans.trim() } : null;
  }
  if (ans.includes("+")) {
    const [a, b] = ans.split(/\s*\+\s*/);
    return a && b ? { a: a.trim(), b: b.trim(), r: q.prompt.trim() } : null;
  }
  return null;
}

export function forgeable(q: Question) {
  return (q.type === "sandhi" || q.type === "viccheda") && sandhiPair(q) !== null;
}

const EXTRA = ["ा", "ि", "ी", "ु", "ू", "े", "ै", "ो", "ौ", "ं", "ः", "ऽ"];

function build(q: Question, lv: Difficulty): Item | null {
  const p = sandhiPair(q);
  if (!p) return null;
  const A = tilesOf(p.a), B = tilesOf(p.b), R = tilesOf(p.r);
  let pre = 0;
  while (pre < A.length && pre < R.length && A[pre] === R[pre]) pre++;
  let suf = 0;
  while (suf < B.length && suf < R.length - pre && B[B.length - 1 - suf] === R[R.length - 1 - suf]) suf++;
  let mid = R.slice(pre, R.length - suf);
  let preT = R.slice(0, pre), sufT = R.slice(R.length - suf);
  // a word break is not something to forge — it stays where it is
  while (mid.length && mid[0] === " ") { preT = [...preT, " "]; mid = mid.slice(1); }
  while (mid.length && mid[mid.length - 1] === " ") { sufT = [" ", ...sufT]; mid = mid.slice(0, -1); }
  const whole = lv === "hard" || mid.length === 0;
  const target = whole ? R : mid;
  const wrong = q.options.filter((_, i) => i !== q.correctIndex).flatMap((o) => tilesOf(o));
  const pool = [...new Set([...wrong, ...EXTRA])].filter((t) => t !== " ");
  const decoys = shuffle(pool.filter((t) => !target.includes(t))).slice(0, LEVELS[lv].extra);
  const tray = shuffle([...target, ...decoys]).map((t, id) => ({ id, t }));
  return { q, A, B, R, pre: whole ? [] : preT, mid: target, suf: whole ? [] : sufT, tray, whole };
}

function Sparks() {
  return (
    <div className="fg-sparks" aria-hidden>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <i key={i} style={{ ["--dx" as string]: `${Math.cos(a) * (60 + (i % 4) * 22)}px`, ["--dy" as string]: `${Math.sin(a) * (40 + (i % 3) * 26) - 30}px`, animationDelay: `${(i % 5) * 0.03}s` }} />;
      })}
    </div>
  );
}

export default function SandhiForge({ questions }: { questions: Question[] }) {
  const pool = useMemo(() => questions.filter(forgeable), [questions]);
  const [mode, setMode] = useState<Mode>("study");
  const [level, setLevel] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<Phase>("menu");
  const [queue, setQueue] = useState<Question[]>([]);
  const [item, setItem] = useState<Item | null>(null);
  const [placed, setPlaced] = useState<number[]>([]);
  const [state, setState] = useState<"build" | "ok" | "bad">("build");
  const [tries, setTries] = useState(0);
  const [hints, setHints] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [done, setDone] = useState(0);
  const [clean, setClean] = useState(0);
  const [log, setLog] = useState<{ q: Question; clean: boolean }[]>([]);
  const [frac, setFrac] = useState(0);
  const [fresh, setFresh] = useState(false);
  const timer = useRef(0);
  const cfg = LEVELS[level];
  const { best, submit } = useBest(`forge:${questions[0]?.chapter ?? ""}:${mode}:${level}`);

  const stopClock = useCallback(() => cancelAnimationFrame(timer.current), []);
  useEffect(() => stopClock, [stopClock]);

  function begin(m: Mode, lv: Difficulty) {
    stopClock();
    const L = LEVELS[lv];
    let src = pool.filter((x) => L.pool.includes(x.difficulty));
    if (src.length < 4) src = pool;
    let deck: Question[] = [];
    while (deck.length < ROUND) deck = deck.concat(shuffle(src));
    deck = deck.slice(0, ROUND);
    setMode(m);
    setLevel(lv);
    setLives(L.lives);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setDone(0);
    setClean(0);
    setLog([]);
    setFresh(false);
    setPhase("play");
    setQueue(deck.slice(1));
    load(deck[0], lv);
  }

  function load(q: Question, lv: Difficulty) {
    const it = build(q, lv);
    setItem(it);
    setPlaced([]);
    setState("build");
    setTries(0);
    setHints(0);
    setFrac(0);
  }

  // Challenge: a clock for each word.
  useEffect(() => {
    cancelAnimationFrame(timer.current);
    if (phase !== "play" || mode !== "challenge" || state !== "build" || !item) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = (now - t0) / (cfg.secs * 1000);
      if (p >= 1) return fail();
      setFrac(p);
      timer.current = requestAnimationFrame(tick);
    };
    timer.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, state, item]);

  const built = item ? placed.map((i) => item.tray[i].t) : [];
  const ok = item ? built.join("") === item.mid.join("") : false;

  function tap(id: number) {
    if (!item || state !== "build" || placed.includes(id)) return;
    setPlaced((p) => [...p, id]);
  }
  function untap(at: number) {
    if (state !== "build") return;
    setPlaced((p) => p.filter((_, i) => i !== at));
  }

  function fail() {
    if (!item) return;
    cancelAnimationFrame(timer.current);
    setState("bad");
    setStreak(0);
    setLog((l) => (l.some((x) => x.q.id === item.q.id) ? l : [...l, { q: item.q, clean: false }]));
  }

  function forge() {
    if (!item || state !== "build" || !placed.length) return;
    const t = tries + 1;
    setTries(t);
    if (ok) {
      cancelAnimationFrame(timer.current);
      const first = t === 1 && hints === 0;
      const seen = log.some((x) => x.q.id === item.q.id);
      const s = first ? streak + 1 : 0;
      setStreak(s);
      setBestStreak((b) => Math.max(b, s));
      setScore((v) => v + (first ? points(streak, mode === "challenge" ? 1 - frac : 0.5) : 40));
      setClean((c) => c + (first && !seen ? 1 : 0));
      setLog((l) => (l.some((x) => x.q.id === item.q.id) ? l : [...l, { q: item.q, clean: first }]));
      setState("ok");
    } else if (mode === "challenge") {
      setLives((l) => l - 1);
      fail();
    } else {
      setStreak(0);
      setLog((l) => (l.some((x) => x.q.id === item.q.id) ? l : [...l, { q: item.q, clean: false }]));
      setState("bad");
      window.setTimeout(() => setState((s) => (s === "bad" ? "build" : s)), 700);
    }
  }

  function hint() {
    if (!item || state !== "build" || mode !== "study") return;
    let k = 0;
    while (k < placed.length && item.tray[placed[k]].t === item.mid[k]) k++;
    if (k >= item.mid.length) return;
    const keep = placed.slice(0, k);
    const free = item.tray.find((x) => x.t === item.mid[k] && !keep.includes(x.id));
    if (!free) return;
    setPlaced([...keep, free.id]);
    setHints((h) => h + 1);
  }

  function next() {
    if (!item) return;
    const lost = mode === "challenge" && lives <= 0;
    const wasRight = state === "ok";
    if (wasRight) setDone((d) => d + 1);
    const q = [...queue];
    // study: a word that needed help comes back once more
    if (mode === "study" && wasRight && (tries > 1 || hints > 0) && !log.some((x) => x.q.id === item.q.id && x.clean) && q.length < ROUND) q.splice(Math.min(2, q.length), 0, item.q);
    if (lost || !q.length) {
      if (mode === "challenge") setFresh(submit(score));
      setPhase("done");
      return;
    }
    const [n, ...rest] = q;
    setQueue(rest);
    load(n, level);
  }

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (phase !== "play") return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (state === "build") forge();
        else if (state === "ok" || (state === "bad" && mode === "challenge")) next();
      } else if (e.key === "Backspace" && state === "build") {
        setPlaced((p) => p.slice(0, -1));
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  if (!pool.length) {
    return <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">Sandhi Forge needs Sandhi questions (“word + word”). They are being added — please come back soon.</p>;
  }

  const Menu = (
    <div className="fg-menu">
      <p className="font-devanagari text-3xl">सन्धि-कर्मशाला</p>
      <p className="mx-auto mt-1 max-w-lg text-sm opacity-85">Two words lie on the anvil. Forge the letters where they meet — tile by tile — and strike. No guessing from a list: you build the joined word.</p>
      <div className="rv-modes">
        <button type="button" onClick={() => setMode("study")} className={mode === "study" ? "on" : ""}>
          <GraduationCap size={18} /> <b>Study</b>
          <span>No clock. Hints, unlimited tries, and the sūtra after every word.</span>
        </button>
        <button type="button" onClick={() => setMode("challenge")} className={mode === "challenge" ? "on" : ""}>
          <Timer size={18} /> <b>Challenge</b>
          <span>A clock for every word, lives, combo and a score to beat.</span>
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
      <p className="mt-3 text-xs opacity-75">{ROUND} words per round · {Object.values(LEVELS).map((l) => l.label).join(" / ")}: {LEVELS[level].blurb}</p>
      {mode === "challenge" && best !== null && <p className="mt-1 text-xs opacity-80">Your best on {cfg.label}: {best}</p>}
    </div>
  );

  if (phase === "menu") return <div className="fg-scene fg-idle">{Menu}</div>;

  if (phase === "done") {
    const acc = log.length ? Math.round((clean / ROUND) * 100) : 0;
    const stars = acc >= 85 ? 3 : acc >= 60 ? 2 : done > 0 ? 1 : 0;
    const lost = mode === "challenge" && lives <= 0;
    return (
      <div>
        <div className="fg-scene fg-idle">
          <div className="fg-menu">
            <p className="text-3xl font-semibold">{lost ? "The fire has gone out" : "Round forged!"}</p>
            <div className="my-2"><Stars n={lost ? 0 : stars} /></div>
            <p className="text-sm opacity-90">{clean} of {ROUND} forged first time{mode === "challenge" ? ` · score ${score}${fresh ? " — a new best!" : ""}` : ""} · longest streak {bestStreak}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {(Object.keys(LEVELS) as Difficulty[]).map((k) => (
                <button key={k} type="button" onClick={() => begin(mode, k)} className="rr-level"><RotateCcw size={14} /> {LEVELS[k].label}</button>
              ))}
              <button type="button" onClick={() => setPhase("menu")} className="rr-level">Menu</button>
            </div>
          </div>
        </div>
        <div className="rv-panel">
          <p className="mb-3 font-semibold">The rules you forged</p>
          <div className="grid gap-4">
            {log.map(({ q, clean: c }) => (
              <div key={q.id}>
                <div className="mb-1 flex items-center gap-2"><Formula q={q} answer={q.options[q.correctIndex]} big={false} />{!c && <span className="rounded-full bg-[var(--color-vermillion)]/15 px-2 py-0.5 text-[11px] text-[var(--color-vermillion)]">revise</span>}</div>
                <RuleCard q={q} ok picked={null} plain />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!item) return null;
  const slots = level === "easy" || item.whole ? item.mid.length : Math.max(item.mid.length, built.length);
  const shown = (i: number) => (i < built.length ? built[i] : "");
  const wrongAt = (i: number) => state === "bad" && built[i] !== undefined && built[i] !== item.mid[i];

  return (
    <div>
      <div className={`fg-scene ${state === "ok" ? "struck" : ""} ${state === "bad" ? "clang" : ""}`}>
        <div className="fg-hud">
          {mode === "challenge" ? (
            <p className="rv-hearts" aria-label={`${Math.max(lives, 0)} lives`}>
              {"♥".repeat(Math.max(lives, 0))}
              <span>{"♥".repeat(Math.max(cfg.lives - lives, 0))}</span>
            </p>
          ) : (
            <p className="rv-chip"><GraduationCap size={13} /> Study mode</p>
          )}
          <p className="rv-chip">Score <b>{score}</b></p>
          {streak >= 2 && <p className="rv-chip combo">🔥 ×{streak}</p>}
          <p className="rv-chip ml-auto">Word <b>{Math.min(done + (state === "ok" ? 0 : 1), ROUND)}</b> / {ROUND}</p>
          <button type="button" onClick={() => { stopClock(); setPhase("menu"); }} className="rv-chip">Menu</button>
        </div>

        <svg className="fg-hammer" viewBox="0 0 120 120" aria-hidden>
          <g transform="rotate(-8 90 100)">
            <rect x="84" y="40" width="9" height="76" rx="3" fill="#7a5236" />
            <rect x="46" y="20" width="62" height="28" rx="5" fill="#5b6270" stroke="#2c313b" strokeWidth="2" />
            <rect x="46" y="20" width="62" height="8" rx="4" fill="#8a93a3" opacity=".7" />
          </g>
        </svg>

        <div className="fg-bar" aria-label="The word on the anvil">
          <span className="fg-fixed font-devanagari">{(item.whole ? [] : item.pre).join("")}</span>
          {Array.from({ length: slots }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => i < built.length && untap(i)}
              className={`fg-slot font-devanagari ${shown(i) ? "has" : ""} ${state === "ok" ? "good" : ""} ${wrongAt(i) ? "wrong" : ""}`}
              aria-label={shown(i) ? `Remove ${shown(i)}` : "Empty slot"}
            >
              {shown(i) ? tileLabel(shown(i)) : ""}
            </button>
          ))}
          <span className="fg-fixed font-devanagari">{(item.whole ? [] : item.suf).join("")}</span>
        </div>
        <div className="fg-anvil" aria-hidden>
          <svg viewBox="0 0 300 70" className="block h-full w-full"><path d="M10 6 H290 L262 26 H210 L226 44 H250 V64 H50 V44 H74 L90 26 H38Z" fill="#3a3f4a" stroke="#1d2027" strokeWidth="3" /><path d="M10 6 H290 L282 12 H18Z" fill="#6c7587" opacity=".8" /></svg>
        </div>
        {state === "ok" && <Sparks />}
        {mode === "challenge" && state === "build" && <div className="rv-time"><i style={{ width: `${(1 - frac) * 100}%` }} /></div>}
      </div>

      <div className="rv-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-saffron)]">{item.whole ? "Forge the whole joined word" : "Forge the letters where they meet"}</p>
            <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">Tap tiles in order. Tap a placed letter to take it back. Enter = strike.</p>
          </div>
          {state === "build" && mode === "study" && (
            <button type="button" onClick={hint} className="gm-power"><Lightbulb size={14} /> <span>Hint</span></button>
          )}
        </div>
        <div className="my-3 text-center sm:text-left">
          <Formula q={item.q} answer={state === "ok" || (state === "bad" && mode === "challenge") ? item.q.options[item.q.correctIndex] : null} />
        </div>

        {(state === "build" || (state === "bad" && mode === "study")) && (
          <>
            <div className="fg-tray" role="group" aria-label="Letter tiles">
              {item.tray.map((x) => (
                <button key={x.id} type="button" disabled={placed.includes(x.id)} onClick={() => tap(x.id)} className="fg-tile font-devanagari">
                  {tileLabel(x.t)}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={forge} disabled={!placed.length} className="ui-btn"><Hammer size={15} /> Strike</button>
              <button type="button" onClick={() => setPlaced([])} disabled={!placed.length} className="ui-btn ui-btn-sm"><Eraser size={14} /> Clear</button>
              {state === "bad" && <span className="text-sm text-[var(--color-vermillion)]">Not quite — the red tiles are wrong. Fix them and strike again.</span>}
            </div>
          </>
        )}

        {(state === "ok" || (state === "bad" && mode === "challenge")) && (
          <RuleCard q={item.q} ok={state === "ok"} picked={null} timedOut={state === "bad" && placed.length === 0} onNext={next} last={!queue.length || (mode === "challenge" && lives <= 0)} />
        )}
      </div>
    </div>
  );
}
