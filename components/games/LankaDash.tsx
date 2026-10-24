"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Flame, Gauge, GraduationCap, Home, Leaf, RotateCcw, Swords } from "lucide-react";
import Actor, { RAMA, type ActorState } from "@/components/games/Actor";
import { shuffle, shuffleOptions, type Difficulty, type Question } from "@/lib/practiceData";
import { Formula, HintIcon, PowerUp, QuestionHead, RuleCard, Stars, points, useBest } from "@/components/games/shared";

// Laṅkā Dash. Śrī Rāma runs toward Laṅkā. Every so often a fort gate bars the
// way, with three doors — each door shows one answer. Pick the right one and
// Rāma's arrow splits it open; pick wrong and he runs into the wall.
// Study mode: the gate waits for you, the sūtra is shown after every answer.
// Run mode: the gate rushes at you — answer before it arrives.

const LEVELS: Record<Difficulty, { label: string; secs: number; lives: number; icon: typeof Leaf; pool: Difficulty[] }> = {
  easy: { label: "Easy", secs: 18, lives: 4, icon: Leaf, pool: ["easy"] },
  medium: { label: "Medium", secs: 12, lives: 3, icon: Gauge, pool: ["easy", "medium"] },
  hard: { label: "Hard", secs: 8, lives: 3, icon: Flame, pool: ["easy", "medium", "hard"] },
};
const GATES = 10;
const GATE_FROM = 108; // gate starts here (% of the scene width) …
const GATE_AT = 44; // … and stops here, in front of Rāma
type Mode = "study" | "run";
type Phase = "menu" | "ask" | "fx" | "review" | "won" | "lost";
type Fx = "" | "shoot" | "smash" | "crash";

/** Keep the right answer and at most two wrong ones, in a new order. */
function three(q: Question): Question {
  const s = shuffleOptions(q);
  if (s.options.length <= 3) return s;
  const right = s.options[s.correctIndex];
  const wrong = shuffle(s.options.filter((_, i) => i !== s.correctIndex)).slice(0, 2);
  const opts = shuffle([right, ...wrong]);
  return { ...s, options: opts, correctIndex: opts.indexOf(right) };
}

function Arrow() {
  return (
    <svg viewBox="0 0 120 20" className="block h-full w-full" aria-hidden>
      <line x1="6" y1="10" x2="100" y2="10" stroke="#e8c766" strokeWidth="4" strokeLinecap="round" />
      <path d="M98 3 L118 10 L98 17 Z" fill="#fff2c4" />
      <path d="M6 10 L0 3 M6 10 L0 17 M16 10 L10 3 M16 10 L10 17" stroke="#c9a227" strokeWidth="3" />
    </svg>
  );
}

/** Mountains, palms and the road — they scroll while Rāma runs. */
function World({ moving, far }: { moving: boolean; far: number }) {
  return (
    <div className={`dash-world ${moving ? "go" : ""}`} aria-hidden>
      <div className="dash-sky" />
      <div className="dash-sun" />
      <div className="dash-lanka" style={{ transform: `translateX(${(1 - far) * 14}%) scale(${0.55 + far * 0.45})` }}>
        <svg viewBox="0 0 200 90" className="block h-full w-full">
          <g fill="#3a2230">
            <rect x="10" y="50" width="180" height="40" />
            {[[24, 22, 20], [62, 8, 24], [100, 16, 22], [138, 4, 26], [172, 26, 16]].map(([x, y, w], i) => (
              <g key={i}>
                <rect x={x} y={y + 14} width={w} height={90 - y - 14} />
                <path d={`M${x - 2} ${y + 16} Q${x + w / 2} ${y - 16} ${x + w + 2} ${y + 16}Z`} />
              </g>
            ))}
          </g>
          <g fill="#ffd98a">{[[34, 60], [72, 54], [112, 60], [150, 52], [180, 62]].map(([x, y], i) => <rect key={i} x={x} y={y} width="3" height="5" />)}</g>
        </svg>
      </div>
      <div className="dash-far" />
      <div className="dash-near" />
      <div className="dash-road" />
    </div>
  );
}

export default function LankaDash({ questions }: { questions: Question[] }) {
  const [mode, setMode] = useState<Mode>("study");
  const [level, setLevel] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<Phase>("menu");
  const [queue, setQueue] = useState<Question[]>([]);
  const [gates, setGates] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [right, setRight] = useState(0);
  const [asked, setAsked] = useState(0);
  const [missed, setMissed] = useState<Question[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [peek, setPeek] = useState(false);
  const [powers, setPowers] = useState({ fifty: 2, sutra: 2 });
  const [fx, setFx] = useState<Fx>("");
  const [frac, setFrac] = useState(0); // how far the gate has come, 0 → 1
  const [fresh, setFresh] = useState(false);
  const timer = useRef(0);
  const timeouts = useRef<number[]>([]);
  const cfg = LEVELS[level];
  const q = queue[0];
  const { best, submit } = useBest(`dash:${questions[0]?.chapter ?? ""}:${mode}:${level}`);

  const later = (ms: number, f: () => void) => {
    timeouts.current.push(window.setTimeout(f, ms));
  };
  const stopAll = useCallback(() => {
    cancelAnimationFrame(timer.current);
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  }, []);
  useEffect(() => stopAll, [stopAll]);

  function begin(m: Mode, lv: Difficulty) {
    stopAll();
    const L = LEVELS[lv];
    let pool = questions.filter((x) => L.pool.includes(x.difficulty));
    if (pool.length < 4) pool = questions;
    let deck: Question[] = [];
    while (deck.length < 40) deck = deck.concat(shuffle(pool));
    setMode(m);
    setLevel(lv);
    setQueue(deck.map(three));
    setGates(0);
    setLives(L.lives);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setRight(0);
    setAsked(0);
    setMissed([]);
    setPicked(null);
    setTimedOut(false);
    setHidden(new Set());
    setPeek(false);
    setPowers({ fifty: 2, sutra: 2 });
    setFx("");
    setFrac(0);
    setFresh(false);
    setPhase("ask");
  }

  // The gate comes toward Rāma. Run mode: it keeps coming — answer before it
  // arrives. Study mode: it slows to a stop in front of him and waits.
  useEffect(() => {
    cancelAnimationFrame(timer.current);
    if (phase !== "ask" || !q) return;
    const total = (mode === "run" ? cfg.secs : 3.2) * 1000;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / total);
      setFrac(mode === "study" ? 1 - (1 - p) * (1 - p) : p);
      if (p >= 1) {
        if (mode === "run") resolve(null, 1);
        return;
      }
      timer.current = requestAnimationFrame(tick);
    };
    setFrac(0);
    timer.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, q?.id, asked]);

  function resolve(i: number | null, p = frac) {
    if (!q || phase !== "ask") return;
    cancelAnimationFrame(timer.current);
    const ok = i === q.correctIndex;
    setPicked(i);
    setTimedOut(i === null);
    setPhase("fx");
    setAsked((n) => n + 1);
    setFx("shoot");
    if (ok) {
      const s = streak + 1;
      setStreak(s);
      setBestStreak((b) => Math.max(b, s));
      setRight((n) => n + 1);
      setScore((v) => v + points(streak, mode === "run" ? 1 - p : 0.5) - (peek ? 25 : 0));
      later(420, () => setFx("smash"));
      later(1250, () => {
        setFx("");
        setGates((g) => g + 1);
        setPhase("review");
      });
    } else {
      setStreak(0);
      setMissed((m) => (m.some((x) => x.id === q.id) ? m : [...m, q]));
      later(420, () => {
        setFx("crash");
        if (mode === "run") setLives((l) => l - 1);
      });
      later(1250, () => {
        setFx("");
        setPhase("review");
      });
    }
  }

  function finish(won: boolean) {
    if (mode === "run") setFresh(submit(score));
    setPhase(won ? "won" : "lost");
  }

  function next() {
    if (phase !== "review" || !q) return;
    const ok = picked === q.correctIndex;
    if (gates >= GATES) return finish(true);
    if (mode === "run" && lives <= 0) return finish(false);
    const rest = queue.slice(1);
    if (!ok) rest.splice(Math.min(3, rest.length), 0, three(q));
    setQueue(rest);
    setPicked(null);
    setTimedOut(false);
    setHidden(new Set());
    setPeek(false);
    setFx("");
    setPhase("ask");
  }

  function fifty() {
    if (!q || powers.fifty <= 0 || phase !== "ask") return;
    const wrong = shuffle(q.options.map((_, i) => i).filter((i) => i !== q.correctIndex)).slice(0, 1);
    setHidden(new Set(wrong));
    setPowers((p) => ({ ...p, fifty: p.fifty - 1 }));
  }
  function showSutra() {
    if (!q || powers.sutra <= 0 || phase !== "ask" || peek) return;
    setPeek(true);
    setPowers((p) => ({ ...p, sutra: p.sutra - 1 }));
  }

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (phase === "ask" && q && /^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < q.options.length && !hidden.has(i)) resolve(i);
      } else if ((e.key === "Enter" || e.key === " ") && phase === "review") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  if (!questions.length) {
    return <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">Questions for this prakaraṇa are being added — please come back soon.</p>;
  }

  const playing = phase === "ask" || phase === "fx" || phase === "review";
  const acc = asked ? Math.round((right / asked) * 100) : 0;
  const stars = phase === "won" ? (acc >= 90 && (mode === "study" || lives >= cfg.lives - 1) ? 3 : acc >= 70 ? 2 : 1) : 0;
  const gateLeft = phase === "ask" ? GATE_FROM - frac * (GATE_FROM - GATE_AT) : GATE_AT;
  const running = (phase === "ask" && (mode === "run" || frac < 0.985)) || fx === "smash" || fx === "shoot";
  const ramaState: ActorState = fx === "crash" ? "stumble" : fx === "shoot" ? "shoot" : running ? "run" : "idle";
  const speed = Math.max(0.3, 0.52 - streak * 0.03);
  const aim = q && picked !== null ? picked : null;

  return (
    <div className="rv-game">
      <div className={`rv-scene dash-scene ${fx === "crash" ? "dash-flash" : ""}`}>
        <World moving={running && phase !== "won"} far={Math.min(1, gates / GATES)} />

        {phase === "won" ? (
          <div className="dash-gold" aria-hidden>
            <svg viewBox="0 0 120 100" className="block h-full w-full">
              <g fill="#e8c766" stroke="#b7860b" strokeWidth="1.2">
                <rect x="14" y="40" width="92" height="60" />
                {[18, 48, 78].map((x) => <path key={x} d={`M${x} 40 L${x + 12} 12 L${x + 24} 40Z`} />)}
                <path d="M46 100 V66 a14 14 0 0 1 28 0 V100Z" fill="#5a3b1d" stroke="#b7860b" />
              </g>
            </svg>
          </div>
        ) : null}

        <Actor
          {...RAMA}
          alt="Śrī Rāma"
          flip
          state={phase === "won" ? "idle" : phase === "lost" ? "stumble" : ramaState}
          speed={speed}
          className={`dash-rama ${phase === "lost" ? "down" : ""}`}
        />
        {running && phase !== "won" && (
          <div className="dash-dust" aria-hidden>
            <i /><i /><i />
          </div>
        )}

        {playing && q && (
          <div
            key={`${q.id}-${asked}`}
            className={`dash-gate ${phase === "ask" ? "moving" : ""} ${fx === "smash" ? "smash" : ""} ${fx === "crash" ? "crash" : ""}`}
            style={{ left: `${gateLeft}%` }}
          >
            <div className="dash-wall">
              {q.options.map((o, i) => {
                const st = phase === "review" || fx === "smash" || fx === "crash" ? (i === q.correctIndex ? "ok" : i === picked ? "bad" : "") : "";
                return (
                  <div key={i} className={`dash-door ${st} ${hidden.has(i) ? "gm-gone" : ""} ${aim === i ? "aim" : ""}`}>
                    <span className="dash-num">{i + 1}</span>
                    <span className="font-devanagari">{o}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(fx === "shoot" || fx === "smash" || fx === "crash") && aim !== null && q && (
          <div
            key={`arrow-${asked}`}
            className="rv-arrow dash-arrow"
            style={{ ["--y1" as string]: `${28 + (aim + 0.5) * (64 / q.options.length) - 1}%`, ["--x1" as string]: `${GATE_AT + 2}%` }}
          >
            <Arrow />
          </div>
        )}
        {fx === "smash" && <div className="rv-burst dash-burst" style={{ left: `${GATE_AT - 2}%` }} aria-hidden />}

        {playing && (
          <>
            <div className="rv-hud left">
              {mode === "run" ? (
                <p className="rv-hearts" aria-label={`${Math.max(lives, 0)} lives`}>
                  {"♥".repeat(Math.max(lives, 0))}
                  <span>{"♥".repeat(Math.max(cfg.lives - lives, 0))}</span>
                </p>
              ) : (
                <p className="rv-chip"><GraduationCap size={13} /> Study mode</p>
              )}
              <p className="rv-chip">Score <b>{score}</b></p>
              {streak >= 2 && <p className="rv-chip combo">🔥 ×{streak}</p>}
            </div>
            <div className="rv-hud right dash-track" aria-label={`${gates} of ${GATES} gates passed`}>
              <p className="mb-1 text-[11px] uppercase tracking-wider opacity-80">Laṅkā · gate {Math.min(gates + (phase === "review" ? 0 : 1), GATES)} of {GATES}</p>
              <div className="dash-bar"><i style={{ width: `${(gates / GATES) * 100}%` }} /></div>
            </div>
            <button type="button" onClick={() => { stopAll(); setPhase("menu"); }} className="rv-menu"><Home size={13} /> Menu</button>
            {phase === "ask" && mode === "run" && <div className="rv-time"><i style={{ width: `${(1 - frac) * 100}%` }} /></div>}
          </>
        )}

        {(phase === "menu" || phase === "won" || phase === "lost") && (
          <div className="rv-overlay">
            <div className="rv-card">
              {phase === "menu" && (
                <>
                  <p className="font-devanagari text-3xl">लङ्का-धावनम्</p>
                  <p className="mt-1 text-sm opacity-85">Śrī Rāma runs for Laṅkā. Ten fort gates bar the way — each has three doors. Shoot the door with the right answer.</p>
                  <div className="rv-modes">
                    <button type="button" onClick={() => setMode("study")} className={mode === "study" ? "on" : ""}>
                      <GraduationCap size={18} /> <b>Study</b>
                      <span>The gate waits for you. The sūtra is shown after every answer, and mistakes come back.</span>
                    </button>
                    <button type="button" onClick={() => setMode("run")} className={mode === "run" ? "on" : ""}>
                      <Swords size={18} /> <b>Run</b>
                      <span>The gate rushes at you — answer before it arrives. Lives, combo and a score to beat.</span>
                    </button>
                  </div>
                </>
              )}
              {phase === "won" && (
                <>
                  <p className="text-3xl font-semibold">Laṅkā reached!</p>
                  <div className="my-2"><Stars n={stars} /></div>
                  <p className="text-sm opacity-90">
                    {right} of {asked} right ({acc}%){mode === "run" ? ` · score ${score}${fresh ? " — a new best!" : ""}` : ""} · longest streak {bestStreak}
                  </p>
                </>
              )}
              {phase === "lost" && (
                <>
                  <p className="text-2xl font-semibold">Stopped at the wall</p>
                  <p className="mt-1 text-sm opacity-90">{gates} of {GATES} gates passed. Read the rules below, then run again — or try Study mode.</p>
                </>
              )}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {(Object.keys(LEVELS) as Difficulty[]).map((k) => {
                  const L = LEVELS[k];
                  return (
                    <button key={k} type="button" onClick={() => begin(mode, k)} className="rr-level">
                      <L.icon size={15} /> {L.label}
                      {mode === "run" && <span className="opacity-70">· {L.secs}s</span>}
                    </button>
                  );
                })}
              </div>
              {mode === "run" && best !== null && phase === "menu" && <p className="mt-2 text-xs opacity-80">Your best on {cfg.label}: {best}</p>}
            </div>
          </div>
        )}
      </div>

      {playing && q && (
        <div className="rv-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <QuestionHead q={q} />
            {phase === "ask" && (
              <div className="flex gap-2">
                <PowerUp icon={HintIcon} label="50 : 50" left={powers.fifty} onUse={fifty} disabled={hidden.size > 0} />
                <PowerUp icon={<BookOpen size={14} />} label="Show sūtra" left={powers.sutra} onUse={showSutra} disabled={peek} />
              </div>
            )}
          </div>
          <div className="my-3 text-center sm:text-left">
            <Formula q={q} answer={phase === "review" ? q.options[q.correctIndex] : null} />
          </div>
          {peek && phase === "ask" && q.sutras && q.sutras.length > 0 && (
            <div className="gm-sutra mb-2">
              {q.sutras.map((s) => (
                <div key={s.number}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-saffron)]">Sūtra {s.number}</p>
                  <p className="font-devanagari text-lg">{s.sanskrit}</p>
                  {s.translation && <p className="text-sm">{s.translation}</p>}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {q.options.map((o, i) => {
              const st = phase !== "ask" ? (i === q.correctIndex ? "ok" : i === picked ? "bad" : "") : "";
              return (
                <button key={i} type="button" disabled={phase !== "ask" || hidden.has(i)} onClick={() => resolve(i)} className={`rr-opt ${st} ${hidden.has(i) ? "gm-gone" : ""}`}>
                  <span className="rr-key">{i + 1}</span>
                  <span className="font-devanagari text-xl">{o}</span>
                </button>
              );
            })}
          </div>
          {phase === "review" && (
            <RuleCard q={q} ok={picked === q.correctIndex} picked={picked} timedOut={timedOut} onNext={next} last={gates >= GATES || (mode === "run" && lives <= 0)} />
          )}
        </div>
      )}

      {(phase === "won" || phase === "lost") && (
        <div className="rv-panel">
          {missed.length > 0 ? (
            <>
              <p className="mb-3 font-semibold">Revise these — the rules behind your mistakes</p>
              <div className="grid gap-4">
                {missed.map((m) => (
                  <div key={m.id}>
                    <div className="mb-1"><Formula q={m} answer={m.options[m.correctIndex]} big={false} /></div>
                    <RuleCard q={m} ok picked={null} plain />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm">No mistakes — every rule applied correctly. 🙏</p>
          )}
          <button type="button" onClick={() => begin(mode, level)} className="ui-btn mt-4"><RotateCcw size={15} /> Run again</button>
        </div>
      )}
    </div>
  );
}
