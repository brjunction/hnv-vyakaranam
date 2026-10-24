"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Flame, Gauge, Home, Leaf, RotateCcw } from "lucide-react";
import { shuffle, shuffleOptions, type Difficulty, type Question } from "@/lib/practiceData";
import { typeInfo } from "@/lib/practice/sections";

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

type Phase = "menu" | "play" | "busy" | "won" | "lost";

export default function SetuBandha({ questions }: { questions: Question[] }) {
  const [level, setLevel] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<Phase>("menu");
  const [deck, setDeck] = useState<Question[]>([]);
  const [qi, setQi] = useState(0);
  const [laid, setLaid] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [left, setLeft] = useState(0);
  const [last, setLast] = useState<{ ok: boolean; q: Question; chosen: number | null } | null>(null);
  const [missed, setMissed] = useState<Question[]>([]);
  const [d, setD] = useState<Dyn>({ px: SHORE_X - 20, py: WATER_Y - 4, dropI: null, drop: 1, splash: null, sway: false });
  const [ready, setReady] = useState(false);
  const raf = useRef(0);
  const t0 = useRef(0);
  const cfg = LEVELS[level];
  const n = cfg.stones;
  const q = deck[qi % Math.max(deck.length, 1)];
  const standX = (k: number) => (k === 0 ? SHORE_X - 20 : stoneX(k - 1, n));

  function start(lv: Difficulty) {
    const L = LEVELS[lv];
    let pool = questions.filter((x) => L.pool.includes(x.difficulty));
    if (pool.length < 4) pool = questions;
    setLevel(lv);
    setDeck(shuffle(pool).map(shuffleOptions));
    setQi(0); setLaid(0); setLives(LIVES); setMissed([]); setLast(null);
    setD({ px: SHORE_X - 20, py: WATER_Y - 4, dropI: null, drop: 1, splash: null, sway: false });
    setPhase("play");
  }

  // countdown while a question is open
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (phase !== "play") return;
    t0.current = performance.now();
    const tick = (now: number) => {
      const s = cfg.secs - (now - t0.current) / 1000;
      if (s <= 0) return answer(null);
      setLeft(s);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qi]);

  function anim(ms: number, f: (p: number) => void, done: () => void) {
    const s = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - s) / ms, 1);
      f(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else done();
    };
    raf.current = requestAnimationFrame(tick);
  }

  function answer(i: number | null) {
    if (!q || phase !== "play") return;
    cancelAnimationFrame(raf.current);
    const ok = i === q.correctIndex;
    setLast({ ok, q, chosen: i });
    setReady(false);
    setPhase("busy");
    if (ok) {
      const k = laid;
      setLaid(k + 1);
      anim(
        320,
        (p) => setD((x) => ({ ...x, dropI: k, drop: p })),
        () => {
          const from = standX(k), to = standX(k + 1);
          anim(
            560,
            (p) => setD((x) => ({ ...x, dropI: null, px: from + (to - from) * p, py: WATER_Y - 4 - Math.sin(p * Math.PI) * 70 })),
            () => {
              setD((x) => ({ ...x, px: to, py: WATER_Y - 4 }));
              if (k + 1 >= n) {
                anim(500, (p) => setD((x) => ({ ...x, px: to + (LANKA_X - to) * p })), () => setPhase("won"));
              } else setReady(true);
            }
          );
        }
      );
    } else {
      setMissed((m) => [...m, q]);
      const sx = stoneX(laid, n);
      anim(
        700,
        (p) => setD((x) => ({ ...x, splash: { x: sx, p }, sway: p < 0.6 })),
        () => {
          setD((x) => ({ ...x, splash: null, sway: false }));
          const l = lives - 1;
          setLives(l);
          if (l <= 0) setPhase("lost");
          else setReady(true);
        }
      );
    }
  }

  const settled = phase === "busy" && ready;
  function next() {
    setLast(null);
    setQi((v) => v + 1);
    setPhase("play");
  }
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (phase === "play" && q && /^[1-9]$/.test(e.key) && Number(e.key) <= q.options.length) answer(Number(e.key) - 1);
      else if (e.key === "Enter" && settled) next();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  if (!questions.length) return <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">Questions for this prakaraṇa are being added.</p>;

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] shadow-[var(--shadow-lift)]">
        <Scene n={n} laid={laid} d={d} />
        {phase !== "menu" && (
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 text-xs text-white sm:p-4 sm:text-sm">
            <div>
              <p className="font-semibold">Setu · {laid}/{n}</p>
              <p aria-label={`${lives} tries left`}>{"♥".repeat(lives)}<span className="opacity-30">{"♥".repeat(LIVES - lives)}</span></p>
            </div>
            {phase === "play" && (
              <div className="h-2 w-28 self-center overflow-hidden rounded-full bg-black/30 sm:w-48"><div className="h-full rounded-full bg-[var(--color-gold-light)]" style={{ width: `${(left / cfg.secs) * 100}%` }} /></div>
            )}
            <button type="button" onClick={() => { cancelAnimationFrame(raf.current); setPhase("menu"); }} className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/35 px-3 py-1 hover:bg-black/55"><Home size={13} /> Menu</button>
          </div>
        )}
        {(phase === "menu" || phase === "won" || phase === "lost") && (
          <div className="absolute inset-0 grid place-items-center bg-black/45 p-4 text-center text-white backdrop-blur-[2px]">
            <div className="max-w-md">
              {phase === "menu" && (<><p className="font-devanagari text-2xl sm:text-3xl">सेतु-बन्धनम्</p><p className="mt-1 text-sm opacity-85">Help Hanumān build the bridge to Laṅkā. Right answer: a stone is laid. Wrong: it sinks.</p></>)}
              {phase === "won" && (<><p className="text-3xl font-semibold">Jaya Hanumān!</p><p className="mt-1 text-sm opacity-85">The bridge is complete — {missed.length} missed.</p></>)}
              {phase === "lost" && (<><p className="text-2xl font-semibold">The sea took the stones</p><p className="mt-1 text-sm opacity-85">{laid} of {n} laid. Review below and try again.</p></>)}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {(Object.keys(LEVELS) as Difficulty[]).map((k) => { const L = LEVELS[k]; return (
                  <button key={k} type="button" onClick={() => start(k)} className="rr-level"><L.icon size={15} /> {L.label} <span className="opacity-70">· {L.stones} stones</span></button>
                ); })}
              </div>
            </div>
          </div>
        )}
      </div>

      {(phase === "play" || phase === "busy") && q && (
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-saffron)]">{typeInfo(q.type).verb}</p>
          <p className="mt-1 font-devanagari text-2xl sm:text-3xl">{q.prompt}</p>
          {q.promptSub && <p className="text-sm text-[var(--fg-muted)]">{q.promptSub}</p>}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {q.options.map((o, i) => {
              const st = last ? (i === q.correctIndex ? "ok" : i === last.chosen ? "bad" : "") : "";
              return <button key={i} type="button" disabled={phase !== "play"} onClick={() => answer(i)} className={`rr-opt ${st}`}><span className="rr-key">{i + 1}</span><span className="font-devanagari text-lg">{o}</span></button>;
            })}
          </div>
          {last && (
            <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-[var(--border)] pt-3">
              <p className="min-w-0 flex-1 text-sm leading-relaxed">
                <span className={`font-semibold ${last.ok ? "text-[#2f8f5b]" : "text-[var(--color-vermillion)]"}`}>{last.ok ? "A stone is laid! " : last.chosen == null ? "Time’s up — " : "The stone sank — "}</span>
                {last.q.explanation}{" "}
                {last.q.sutraRefs.map((r) => <Link key={r} href={`/sutras/${encodeURIComponent(r)}`} className="sutra-xref ml-1" target="_blank">Sūtra {r}</Link>)}
              </p>
              {settled && <button type="button" onClick={next} className="ui-btn">Next stone →</button>}
            </div>
          )}
        </div>
      )}

      {(phase === "won" || phase === "lost") && missed.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[var(--border)] p-4 sm:p-5">
          <p className="mb-2 text-sm font-semibold">Review</p>
          <ul className="grid gap-3 text-sm">
            {missed.map((m, i) => (
              <li key={i}><span className="font-devanagari text-base">{m.prompt} → {m.options[m.correctIndex]}</span><span className="block text-[var(--fg-muted)]">{m.explanation}</span></li>
            ))}
          </ul>
          <button type="button" onClick={() => start(level)} className="ui-btn mt-4"><RotateCcw size={15} /> Play again</button>
        </div>
      )}
    </div>
  );
}
