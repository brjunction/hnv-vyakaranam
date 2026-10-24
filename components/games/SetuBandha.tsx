"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Flame, GraduationCap, Gauge, Home, Leaf, RotateCcw, Swords } from "lucide-react";
import { shuffle, shuffleOptions, type Difficulty, type Question } from "@/lib/practiceData";
import { Formula, HintIcon, Options, PowerUp, QuestionHead, RuleCard, Stars, points, useBest } from "@/components/games/shared";

// Setu-bandha — Hanumān builds the bridge to Laṅkā. Every right answer lays a
// stone marked "राम" and Hanumān leaps onto it; a wrong answer (or running out
// of time) and the stone sinks. Reach Laṅkā before the three tries are gone.

const W = 800;
const H = 340;
const SHORE_X = 120;
const LANKA_X = 690;
const WATER_Y = 258;

const LEVELS: Record<Difficulty, { label: string; stones: number; secs: number; icon: typeof Leaf; pool: Difficulty[] }> = {
  easy: { label: "Easy", stones: 6, secs: 20, icon: Leaf, pool: ["easy"] },
  medium: { label: "Medium", stones: 8, secs: 14, icon: Gauge, pool: ["easy", "medium"] },
  hard: { label: "Hard", stones: 10, secs: 9, icon: Flame, pool: ["easy", "medium", "hard"] },
};
const LIVES = 3;

const stoneX = (i: number, n: number) => SHORE_X + 70 + ((LANKA_X - 70 - (SHORE_X + 70)) * i) / Math.max(n - 1, 1);

function Hanuman({ x, y, sway }: { x: number; y: number; sway: boolean }) {
  return (
    <g transform={`translate(${x - 34} ${y - 112})`} className={sway ? "rr-shake" : ""}>
      <ellipse cx={34} cy={112} rx={30} ry={5} fill="#000" opacity={0.18} />
      {/* tail */}
      <path d="M12 82 Q-18 70 -8 40 Q0 22 16 30" fill="none" stroke="#e08a1e" strokeWidth={8} strokeLinecap="round" className="sb-tail" />
      {/* legs */}
      <path d="M24 84 L20 110 L34 110 L36 90 M44 84 L48 110 L62 110 L56 88" fill="#d9a32c" stroke="#d9a32c" strokeWidth={9} strokeLinejoin="round" />
      {/* dhotī */}
      <path d="M20 70 H58 L62 92 H16 Z" fill="#c93a1f" />
      {/* body */}
      <path d="M22 40 Q39 32 56 40 L58 72 L20 72 Z" fill="#f0b43c" />
      {/* arms + gadā */}
      <path d="M56 48 L82 30" stroke="#f0b43c" strokeWidth={9} strokeLinecap="round" />
      <rect x={78} y={0} width={9} height={42} rx={4} fill="#8a5a1c" transform="rotate(14 82 20)" />
      <circle cx={86} cy={-2} r={14} fill="#e8c766" stroke="#b7860b" strokeWidth={2} transform="rotate(14 82 20)" />
      <path d="M22 50 L8 66" stroke="#f0b43c" strokeWidth={9} strokeLinecap="round" />
      {/* head */}
      <circle cx={39} cy={24} r={17} fill="#f0b43c" />
      <ellipse cx={39} cy={28} rx={11} ry={10} fill="#e0603a" />
      <circle cx={34} cy={25} r={2.2} fill="#222" /><circle cx={44} cy={25} r={2.2} fill="#222" />
      <path d="M33 33 Q39 37 45 33" stroke="#5b1a14" strokeWidth={1.6} fill="none" />
      <path d="M24 12 L28 0 L35 10 L39 -4 L43 10 L50 0 L54 12 Z" fill="#e8c766" stroke="#b7860b" strokeWidth={1} />
    </g>
  );
}

type Dyn = { px: number; py: number; dropI: number | null; drop: number; splash: { x: number; p: number } | null; sway: boolean };

function Scene({ n, laid, d }: { n: number; laid: number; d: Dyn }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Hanumān builds the bridge of stones to Laṅkā">
      <defs>
        <linearGradient id="sb-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#274b6e" /><stop offset="0.6" stopColor="#e9a76a" /><stop offset="1" stopColor="#f8dca0" /></linearGradient>
        <linearGradient id="sb-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f8aa0" /><stop offset="1" stopColor="#14415a" /></linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sb-sky)" />
      <circle cx={400} cy={210} r={46} fill="#fff3c4" opacity={0.9} className="rr-sun" />
      {[0, 1, 2].map((i) => (
        <g key={i} className="rr-cloud" style={{ animationDuration: `${45 + i * 20}s`, animationDelay: `${-i * 17}s` }}>
          <ellipse cx={0} cy={46 + i * 36} rx={64} ry={13} fill="#fff" opacity={0.3} />
          <ellipse cx={26} cy={40 + i * 36} rx={36} ry={11} fill="#fff" opacity={0.25} />
        </g>
      ))}
      {/* Laṅkā */}
      <g fill="#5a3a3a">
        <path d="M600 262 Q680 196 800 210 L800 264 L600 264 Z" />
        <rect x={650} y={180} width={22} height={50} /><path d="M646 182 Q661 150 676 182 Z" />
        <rect x={706} y={170} width={28} height={60} /><path d="M702 172 Q720 130 738 172 Z" />
      </g>
      <text x={LANKA_X + 20} y={160} fontSize={16} fill="#fff" opacity={0.85} fontFamily="serif">लङ्का</text>
      <rect x={0} y={WATER_Y} width={W} height={H - WATER_Y} fill="url(#sb-sea)" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${-40 + i * 12} ${274 + i * 15} q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0`} fill="none" stroke="#bfe3ec" strokeWidth={1.3} opacity={0.3} className="rr-wave" style={{ animationDelay: `${i * 0.5}s` }} />
      ))}
      <path d="M0 262 L0 340 L230 340 Q210 300 170 288 Q100 270 0 262 Z" fill="#6b4f2c" />
      {/* planned stones (faint) */}
      {Array.from({ length: n }, (_, i) => (
        <ellipse key={i} cx={stoneX(i, n)} cy={WATER_Y + 4} rx={26} ry={7} fill="#fff" opacity={i < laid ? 0 : 0.08} />
      ))}
      {/* laid stones */}
      {Array.from({ length: laid }, (_, i) => {
        const p = d.dropI === i ? d.drop : 1;
        return (
          <g key={i} transform={`translate(${stoneX(i, n)} ${WATER_Y - 6 - (1 - p) * 70}) scale(${0.6 + 0.4 * p})`} opacity={p}>
            <rect x={-28} y={-12} width={56} height={22} rx={9} fill="#a8805a" stroke="#6b4f2c" strokeWidth={2} />
            <text x={0} y={5} textAnchor="middle" fontSize={13} fill="#fff3c4" fontFamily="serif">राम</text>
          </g>
        );
      })}
      {d.splash && (
        <g transform={`translate(${d.splash.x} ${WATER_Y})`} opacity={1 - d.splash.p}>
          <ellipse rx={14 + 40 * d.splash.p} ry={4 + 10 * d.splash.p} fill="none" stroke="#fff" strokeWidth={3} />
          {[-1, 0, 1].map((k) => <circle key={k} cx={k * 14 * (1 + d.splash!.p)} cy={-26 * d.splash!.p - 6} r={4} fill="#fff" />)}
        </g>
      )}
      <Hanuman x={d.px} y={d.py} sway={d.sway} />
    </svg>
  );
}

type Mode = "study" | "battle";
type Phase = "menu" | "ask" | "busy" | "review" | "won" | "lost";

export default function SetuBandha({ questions }: { questions: Question[] }) {
  const [mode, setMode] = useState<Mode>("study");
  const [level, setLevel] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<Phase>("menu");
  const [queue, setQueue] = useState<Question[]>([]);
  const [laid, setLaid] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [left, setLeft] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [right, setRight] = useState(0);
  const [asked, setAsked] = useState(0);
  const [missed, setMissed] = useState<Question[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [peek, setPeek] = useState(false);
  const [powers, setPowers] = useState({ fifty: 2, sutra: 2 });
  const [fresh, setFresh] = useState(false);
  const [d, setD] = useState<Dyn>({ px: SHORE_X - 20, py: WATER_Y - 4, dropI: null, drop: 1, splash: null, sway: false });
  // separate handles: the clock must never cancel an animation (that froze the game before)
  const clock = useRef(0);
  const anim = useRef(0);
  const cfg = LEVELS[level];
  const n = cfg.stones;
  const q = queue[0];
  const { best, submit } = useBest(`setu:${questions[0]?.chapter ?? ""}:${mode}:${level}`);
  const standX = (k: number) => (k === 0 ? SHORE_X - 20 : stoneX(k - 1, n));

  const stop = () => {
    cancelAnimationFrame(clock.current);
    cancelAnimationFrame(anim.current);
  };
  useEffect(() => stop, []);

  function begin(m: Mode, lv: Difficulty) {
    stop();
    const L = LEVELS[lv];
    let pool = questions.filter((x) => L.pool.includes(x.difficulty));
    if (pool.length < 4) pool = questions;
    let deck: Question[] = [];
    while (deck.length < 40) deck = deck.concat(shuffle(pool));
    setMode(m); setLevel(lv);
    setQueue(deck.map(shuffleOptions));
    setLaid(0); setLives(LIVES); setScore(0); setStreak(0); setRight(0); setAsked(0); setMissed([]);
    setPicked(null); setTimedOut(false); setHidden(new Set()); setPeek(false); setPowers({ fifty: 2, sutra: 2 }); setFresh(false);
    setD({ px: SHORE_X - 20, py: WATER_Y - 4, dropI: null, drop: 1, splash: null, sway: false });
    setPhase("ask");
  }

  useEffect(() => {
    cancelAnimationFrame(clock.current);
    if (phase !== "ask" || mode !== "battle" || !q) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = (now - t0) / (cfg.secs * 1000);
      if (p >= 1) return answer(null, 0);
      setLeft(1 - p);
      clock.current = requestAnimationFrame(tick);
    };
    setLeft(1);
    clock.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(clock.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, q?.id, asked]);

  function run(ms: number, f: (p: number) => void, done: () => void) {
    const s = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - s) / ms, 1);
      f(p);
      if (p < 1) anim.current = requestAnimationFrame(tick);
      else done();
    };
    anim.current = requestAnimationFrame(tick);
  }

  function answer(i: number | null, frac = left) {
    if (!q || phase !== "ask") return;
    cancelAnimationFrame(clock.current);
    const ok = i === q.correctIndex;
    setPicked(i);
    setTimedOut(i === null);
    setAsked((a) => a + 1);
    setPhase("busy");
    if (ok) {
      const k = laid;
      setLaid(k + 1);
      setRight((r) => r + 1);
      setStreak((s) => s + 1);
      setScore((v) => v + points(streak, mode === "battle" ? frac : 0.5) - (peek ? 25 : 0));
      run(320, (p) => setD((x) => ({ ...x, dropI: k, drop: p })), () => {
        const from = standX(k), to = standX(k + 1);
        run(560, (p) => setD((x) => ({ ...x, dropI: null, px: from + (to - from) * p, py: WATER_Y - 4 - Math.sin(p * Math.PI) * 70 })), () => {
          setD((x) => ({ ...x, px: to, py: WATER_Y - 4 }));
          if (k + 1 >= n) run(500, (p) => setD((x) => ({ ...x, px: to + (LANKA_X - to) * p })), () => setPhase("review"));
          else setPhase("review");
        });
      });
    } else {
      setStreak(0);
      setMissed((m) => (m.some((x) => x.id === q.id) ? m : [...m, q]));
      const sx = stoneX(laid, n);
      run(700, (p) => setD((x) => ({ ...x, splash: { x: sx, p }, sway: p < 0.6 })), () => {
        setD((x) => ({ ...x, splash: null, sway: false }));
        if (mode === "battle") setLives((l) => l - 1);
        setPhase("review");
      });
    }
  }

  function finish(won: boolean) {
    if (mode === "battle") setFresh(submit(score));
    setPhase(won ? "won" : "lost");
  }
  function next() {
    if (phase !== "review" || !q) return;
    const ok = picked === q.correctIndex;
    if (laid >= n) return finish(true);
    if (mode === "battle" && lives <= 0) return finish(false);
    const rest = queue.slice(1);
    if (!ok) rest.splice(Math.min(3, rest.length), 0, shuffleOptions(q));
    setQueue(rest);
    setPicked(null); setTimedOut(false); setHidden(new Set()); setPeek(false);
    setPhase("ask");
  }
  function fifty() {
    if (!q || powers.fifty <= 0 || phase !== "ask") return;
    const wrong = shuffle(q.options.map((_, i) => i).filter((i) => i !== q.correctIndex)).slice(0, Math.max(1, q.options.length - 2));
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
        if (i < q.options.length && !hidden.has(i)) answer(i);
      } else if ((e.key === "Enter" || e.key === " ") && phase === "review") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  if (!questions.length) return <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">Questions for this prakaraṇa are being added — please come back soon.</p>;

  const playing = phase === "ask" || phase === "busy" || phase === "review";
  const acc = asked ? Math.round((right / asked) * 100) : 0;
  const stars = phase === "won" ? (acc >= 90 ? 3 : acc >= 70 ? 2 : 1) : 0;

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] shadow-[var(--shadow-lift)]">
        <Scene n={n} laid={laid} d={d} />
        {playing && (
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 text-xs text-white sm:p-4 sm:text-sm">
            <div className="grid gap-1">
              <p className="rv-chip">Stones {laid}/{n}</p>
              {mode === "battle" ? <p className="rv-hearts" aria-label={`${lives} tries left`}>{"♥".repeat(Math.max(lives, 0))}<span>{"♥".repeat(Math.max(LIVES - lives, 0))}</span></p> : <p className="rv-chip"><GraduationCap size={13} /> Study mode</p>}
            </div>
            <p className="rv-chip">Score <b>{score}</b>{streak >= 2 ? ` · 🔥×${streak}` : ""}</p>
            <button type="button" onClick={() => { stop(); setPhase("menu"); }} className="rv-menu !static"><Home size={13} /> Menu</button>
          </div>
        )}
        {phase === "ask" && mode === "battle" && <div className="rv-time"><i style={{ width: `${left * 100}%` }} /></div>}
        {(phase === "menu" || phase === "won" || phase === "lost") && (
          <div className="rv-overlay">
            <div className="rv-card">
              {phase === "menu" && (
                <>
                  <p className="font-devanagari text-3xl">सेतु-बन्धनम्</p>
                  <p className="mt-1 text-sm opacity-85">Help Hanumān build the bridge to Laṅkā. A right answer lays a stone marked with Rāma&apos;s name; a wrong one sinks it.</p>
                  <div className="rv-modes">
                    <button type="button" onClick={() => setMode("study")} className={mode === "study" ? "on" : ""}><GraduationCap size={18} /> <b>Study</b><span>No clock, no lost tries. The sūtra after every answer; mistakes come back.</span></button>
                    <button type="button" onClick={() => setMode("battle")} className={mode === "battle" ? "on" : ""}><Swords size={18} /> <b>Challenge</b><span>A clock on every stone, three tries, a score to beat.</span></button>
                  </div>
                </>
              )}
              {phase === "won" && (<><p className="text-3xl font-semibold">Jaya Hanumān!</p><div className="my-2"><Stars n={stars} /></div><p className="text-sm opacity-90">{right} of {asked} right ({acc}%){mode === "battle" ? ` · score ${score}${fresh ? " — a new best!" : ""}` : ""}</p></>)}
              {phase === "lost" && (<><p className="text-2xl font-semibold">The sea took the stones</p><p className="mt-1 text-sm opacity-90">{laid} of {n} laid. Revise the rules below and try again.</p></>)}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {(Object.keys(LEVELS) as Difficulty[]).map((k) => { const L = LEVELS[k]; return (
                  <button key={k} type="button" onClick={() => begin(mode, k)} className="rr-level"><L.icon size={15} /> {L.label} <span className="opacity-70">· {L.stones} stones</span></button>
                ); })}
              </div>
              {mode === "battle" && best !== null && phase === "menu" && <p className="mt-2 text-xs opacity-80">Your best on {cfg.label}: {best}</p>}
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
          <div className="my-3 text-center sm:text-left"><Formula q={q} answer={phase === "review" ? q.options[q.correctIndex] : null} /></div>
          {peek && phase === "ask" && q.sutras && q.sutras.length > 0 && (
            <div className="gm-sutra mb-2">
              {q.sutras.map((s) => (<div key={s.number}><p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-saffron)]">Sūtra {s.number}</p><p className="font-devanagari text-lg">{s.sanskrit}</p>{s.translation && <p className="text-sm">{s.translation}</p>}</div>))}
            </div>
          )}
          <Options q={q} hidden={hidden} picked={picked} locked={phase !== "ask"} onPick={(i) => answer(i)} />
          {phase === "review" && <RuleCard q={q} ok={picked === q.correctIndex} picked={picked} timedOut={timedOut} onNext={next} last={laid >= n || (mode === "battle" && lives <= 0)} />}
        </div>
      )}

      {(phase === "won" || phase === "lost") && (
        <div className="rv-panel">
          {missed.length > 0 ? (
            <>
              <p className="mb-3 font-semibold">Revise these — the rules behind your mistakes</p>
              <div className="grid gap-4">{missed.map((m) => (<div key={m.id}><div className="mb-1"><Formula q={m} answer={m.options[m.correctIndex]} big={false} /></div><RuleCard q={m} ok picked={null} plain /></div>))}</div>
            </>
          ) : (<p className="text-sm">No mistakes — every rule applied correctly. 🙏</p>)}
          <button type="button" onClick={() => begin(mode, level)} className="ui-btn mt-4"><RotateCcw size={15} /> Play again</button>
        </div>
      )}
    </div>
  );
}
