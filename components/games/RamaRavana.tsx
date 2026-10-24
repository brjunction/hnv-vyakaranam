"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Gauge, Leaf, RotateCcw, Shield, Swords } from "lucide-react";
import { shuffle, type Difficulty, type Question } from "@/lib/practiceData";

// Rāma and Rāvaṇa — a Sandhi battle. Rāvaṇa looses an arrow; answer the
// Sandhi question before it lands and Rāma's arrow cuts it down and strikes
// back. Every question is from the practice bank and cites its sūtra.

const W = 800;
const H = 340;
const RAMA_X = 150;
const RAVANA_X = 650;
const ARROW_Y = 196;

const LEVELS: Record<Difficulty, { label: string; secs: number; hp: number; icon: typeof Leaf; pool: Difficulty[] }> = {
  easy: { label: "Easy", secs: 16, hp: 5, icon: Leaf, pool: ["easy"] },
  medium: { label: "Medium", secs: 11, hp: 7, icon: Gauge, pool: ["easy", "medium"] },
  hard: { label: "Hard", secs: 7, hp: 10, icon: Flame, pool: ["easy", "medium", "hard"] },
};
const LIVES = 3;

/* ------------------------------------------------------------------ scene */

type SceneState = {
  /** Rāvaṇa's arrow, 0 (bow) → 1 (Rāma); null = none in the air. */
  enemy: number | null;
  /** Rāma's arrow: from his bow to `to` (x), progress 0..1. */
  shot: { p: number; to: number } | null;
  /** Burst where the arrows met. */
  burst: { x: number; p: number } | null;
  /** Rāma's counter-arrow flying at Rāvaṇa, 0..1. */
  counter: number | null;
  ramaHit: boolean;
  ravanaHit: boolean;
};

function Arrow({ x, dir, fire }: { x: number; dir: 1 | -1; fire?: boolean }) {
  const c = fire ? "url(#rr-fire)" : "url(#rr-gold)";
  return (
    <g transform={`translate(${x} ${ARROW_Y}) scale(${dir} 1)`}>
      <line x1={-46} y1={0} x2={10} y2={0} stroke={c} strokeWidth={3} strokeLinecap="round" />
      <path d="M10 -6 L24 0 L10 6 Z" fill={fire ? "#ff7a2e" : "#f6d77a"} />
      <path d="M-46 0 l-8 -6 M-46 0 l-8 6 M-38 0 l-8 -6 M-38 0 l-8 6" stroke={fire ? "#b3341a" : "#c9a227"} strokeWidth={2} />
      <circle cx={18} r={10} fill={fire ? "#ff7a2e" : "#ffe9a8"} opacity={0.28} />
    </g>
  );
}

function Rama({ hit }: { hit: boolean }) {
  return (
    <g transform={`translate(${RAMA_X - 40} 130)`} className={hit ? "rr-shake" : ""}>
      <ellipse cx={40} cy={182} rx={42} ry={7} fill="#000" opacity={0.18} />
      {/* legs + dhotī */}
      <path d="M26 120 L20 178 L32 178 L40 132 L48 178 L60 178 L54 120 Z" fill="#e8b23a" />
      {/* body */}
      <path d="M24 64 Q40 56 56 64 L58 122 L22 122 Z" fill="#3e6fb8" />
      <path d="M24 70 L56 116" stroke="#f6d77a" strokeWidth={3} />
      {/* head + crown */}
      <circle cx={40} cy={44} r={15} fill="#4a7cc4" />
      <path d="M27 34 L31 16 L36 28 L40 10 L44 28 L49 16 L53 34 Z" fill="#e8c766" stroke="#c9a227" strokeWidth={1} />
      <circle cx={40} cy={22} r={2.5} fill="#d6336c" />
      {/* arm + bow */}
      <path d="M54 72 L84 66" stroke="#3e6fb8" strokeWidth={8} strokeLinecap="round" />
      <path d="M84 18 Q114 66 84 114" fill="none" stroke="#8a5a1c" strokeWidth={5} strokeLinecap="round" />
      <line x1={84} y1={18} x2={84} y2={114} stroke="#f1ead6" strokeWidth={1.2} />
    </g>
  );
}

function Ravana({ hit }: { hit: boolean }) {
  const heads = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  return (
    <g transform={`translate(${RAVANA_X - 50} 110)`} className={hit ? "rr-shake rr-flash" : ""}>
      <ellipse cx={50} cy={202} rx={56} ry={8} fill="#000" opacity={0.2} />
      <path d="M28 132 L20 198 L38 198 L50 150 L62 198 L80 198 L72 132 Z" fill="#5b1a14" />
      <path d="M20 70 Q50 56 80 70 L84 136 L16 136 Z" fill="#7a2a1c" />
      <path d="M22 80 H78 M22 96 H78 M22 112 H78" stroke="#c9a227" strokeWidth={2} opacity={0.7} />
      {/* ten heads */}
      {heads.map((h, i) => (
        <g key={i} transform={`translate(${50 + (i - 4.5) * 11} ${i === 4 || i === 5 ? 42 : 48 + Math.abs(i - 4.5) * 2})`}>
          <circle r={i === 4 || i === 5 ? 12 : 9} fill="#6b3b2a" />
          <path d={`M${-8} -6 L-5 -16 L0 -9 L5 -16 L8 -6 Z`} fill="#c9a227" />
        </g>
      ))}
      {/* bow */}
      <path d="M-8 30 Q-36 92 -8 154" fill="none" stroke="#3a1a10" strokeWidth={6} strokeLinecap="round" />
      <line x1={-8} y1={30} x2={-8} y2={154} stroke="#f1ead6" strokeWidth={1.2} />
      <path d="M22 86 L-8 92" stroke="#7a2a1c" strokeWidth={9} strokeLinecap="round" />
    </g>
  );
}

export function BattleScene({ s }: { s: SceneState }) {
  const span = RAVANA_X - 30 - (RAMA_X + 40);
  const enemyX = s.enemy == null ? null : RAVANA_X - 30 - span * s.enemy;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rr-scene block h-auto w-full" role="img" aria-label="Śrī Rāma faces Rāvaṇa across the sea before Laṅkā">
      <defs>
        <linearGradient id="rr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#13243a" />
          <stop offset="0.55" stopColor="#7a4a5a" />
          <stop offset="1" stopColor="#e8a25a" />
        </linearGradient>
        <linearGradient id="rr-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c5a6e" />
          <stop offset="1" stopColor="#173444" />
        </linearGradient>
        <linearGradient id="rr-gold" x1="0" x2="1">
          <stop offset="0" stopColor="#c9a227" />
          <stop offset="1" stopColor="#fff2c4" />
        </linearGradient>
        <linearGradient id="rr-fire" x1="0" x2="1">
          <stop offset="0" stopColor="#7a1a10" />
          <stop offset="1" stopColor="#ff9a4a" />
        </linearGradient>
        <radialGradient id="rr-sun">
          <stop offset="0" stopColor="#ffe2a0" />
          <stop offset="1" stopColor="#ffe2a0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#rr-sky)" />
      <circle cx={400} cy={250} r={120} fill="url(#rr-sun)" className="rr-sun" />
      {/* stars */}
      {[[60, 30], [180, 60], [300, 24], [520, 40], [700, 22], [760, 70], [420, 70]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.4} fill="#fff" className="rr-star" style={{ animationDelay: `${i * 0.7}s` }} />
      ))}
      {/* drifting clouds */}
      {[0, 1, 2].map((i) => (
        <g key={i} className="rr-cloud" style={{ animationDuration: `${40 + i * 18}s`, animationDelay: `${-i * 15}s` }}>
          <ellipse cx={0} cy={60 + i * 34} rx={70 - i * 10} ry={14} fill="#fff" opacity={0.12} />
          <ellipse cx={30} cy={52 + i * 34} rx={40} ry={12} fill="#fff" opacity={0.1} />
        </g>
      ))}
      {/* Laṅkā on the far shore */}
      <g fill="#3a2230" opacity={0.85}>
        <path d="M560 250 Q640 196 800 210 L800 262 L560 262 Z" />
        <rect x={610} y={198} width={20} height={40} />
        <path d="M606 200 Q620 172 634 200 Z" />
        <rect x={660} y={186} width={26} height={50} />
        <path d="M656 188 Q673 150 690 188 Z" />
        <rect x={720} y={196} width={18} height={40} />
        <path d="M716 198 Q729 174 742 198 Z" />
      </g>
      <g fill="#e8c766" opacity={0.55}>
        <circle cx={620} cy={214} r={1.6} /><circle cx={673} cy={206} r={1.6} /><circle cx={729} cy={212} r={1.6} />
      </g>
      {/* sea */}
      <rect x={0} y={258} width={W} height={82} fill="url(#rr-sea)" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${-40 + i * 10} ${276 + i * 14} q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0`} fill="none" stroke="#9cc3d0" strokeWidth={1.2} opacity={0.25} className="rr-wave" style={{ animationDelay: `${i * 0.6}s` }} />
      ))}
      {/* shores */}
      <path d="M0 262 L0 340 L250 340 Q230 300 190 290 Q120 270 0 262 Z" fill="#4d3a24" />
      <path d="M800 262 L800 340 L560 340 Q590 300 640 288 Q720 270 800 262 Z" fill="#3a2a20" />

      <Rama hit={s.ramaHit} />
      <Ravana hit={s.ravanaHit} />

      {enemyX != null && <Arrow x={enemyX} dir={-1} fire />}
      {s.shot && <Arrow x={RAMA_X + 50 + (s.shot.to - RAMA_X - 50) * s.shot.p} dir={1} />}
      {s.counter != null && <Arrow x={RAMA_X + 50 + (RAVANA_X - 70 - RAMA_X - 50) * s.counter} dir={1} />}
      {s.burst && (
        <g transform={`translate(${s.burst.x} ${ARROW_Y})`} opacity={1 - s.burst.p}>
          <circle r={10 + 34 * s.burst.p} fill="none" stroke="#ffe9a8" strokeWidth={3} />
          <circle r={6 + 18 * s.burst.p} fill="#fff2c4" opacity={0.7} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1={0} y1={0} x2={Math.cos((a * Math.PI) / 180) * (14 + 30 * s.burst!.p)} y2={Math.sin((a * Math.PI) / 180) * (14 + 30 * s.burst!.p)} stroke="#f6d77a" strokeWidth={2} />
          ))}
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------- showcase */

/** The scene playing by itself — for the home page. */
export function BattleDemo() {
  const [s, setS] = useState<SceneState>({ enemy: null, shot: null, burst: null, counter: null, ramaHit: false, ravanaHit: false });
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setS((x) => ({ ...x, enemy: 0.45 }));
      return;
    }
    let raf = 0;
    const start = performance.now();
    const cycle = 4200;
    const tick = (now: number) => {
      const t = ((now - start) % cycle) / cycle;
      const meet = 0.55;
      const to = RAVANA_X - 30 - (RAVANA_X - 30 - (RAMA_X + 40)) * meet;
      let st: SceneState = { enemy: null, shot: null, burst: null, counter: null, ramaHit: false, ravanaHit: false };
      if (t < 0.4) st.enemy = (t / 0.4) * meet;
      else if (t < 0.5) st = { ...st, enemy: meet, shot: { p: (t - 0.4) / 0.1, to } };
      else if (t < 0.62) st.burst = { x: to, p: (t - 0.5) / 0.12 };
      else if (t < 0.78) st.counter = (t - 0.62) / 0.16;
      else if (t < 0.9) st.ravanaHit = true;
      setS(st);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <BattleScene s={s} />;
}

/* ------------------------------------------------------------------ game */

type Phase = "menu" | "play" | "strike" | "hurt" | "won" | "lost";
type Missed = { q: Question; chosen: number | null };

export default function RamaRavanaGame({ questions }: { questions: Question[] }) {
  const [level, setLevel] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<Phase>("menu");
  const [deck, setDeck] = useState<Question[]>([]);
  const [qi, setQi] = useState(0);
  const [ravanaHp, setRavanaHp] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [scene, setScene] = useState<SceneState>({ enemy: null, shot: null, burst: null, counter: null, ramaHit: false, ravanaHit: false });
  const [last, setLast] = useState<{ ok: boolean; q: Question; chosen: number | null } | null>(null);
  const [missed, setMissed] = useState<Missed[]>([]);
  const [right, setRight] = useState(0);
  const qStart = useRef(0);
  const enemyP = useRef(0);
  const raf = useRef(0);
  const cfg = LEVELS[level];
  const q = deck[qi % Math.max(deck.length, 1)];

  const pool = useCallback((d: Difficulty) => questions.filter((x) => LEVELS[d].pool.includes(x.difficulty)), [questions]);

  function start(d: Difficulty) {
    const p = pool(d);
    const list = p.length ? p : questions;
    setLevel(d);
    setDeck(shuffle(list).map((x) => ({ ...x })));
    setQi(0);
    setRavanaHp(LEVELS[d].hp);
    setLives(LIVES);
    setMissed([]);
    setRight(0);
    setLast(null);
    setPhase("play");
  }

  // Animate whatever phase we are in.
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (phase === "play") {
      qStart.current = performance.now();
      const tick = (now: number) => {
        const p = (now - qStart.current) / (cfg.secs * 1000);
        if (p >= 1) {
          answer(null);
          return;
        }
        enemyP.current = p;
        setScene({ enemy: p, shot: null, burst: null, counter: null, ramaHit: false, ravanaHit: false });
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qi]);

  function play(steps: { ms: number; f: (p: number) => SceneState }[], done: () => void) {
    const t0 = performance.now();
    const total = steps.reduce((n, s) => n + s.ms, 0);
    const tick = (now: number) => {
      let t = now - t0;
      if (t >= total) return done();
      for (const st of steps) {
        if (t < st.ms) {
          setScene(st.f(t / st.ms));
          break;
        }
        t -= st.ms;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  function answer(i: number | null) {
    if (!q) return;
    cancelAnimationFrame(raf.current);
    const enemy = Math.min(enemyP.current, 1);
    const ok = i === q.correctIndex;
    setLast({ ok, q, chosen: i });
    const base: SceneState = { enemy: null, shot: null, burst: null, counter: null, ramaHit: false, ravanaHit: false };
    if (ok) {
      setRight((n) => n + 1);
      setPhase("strike");
      const to = RAVANA_X - 30 - (RAVANA_X - 30 - (RAMA_X + 40)) * enemy;
      play(
        [
          { ms: 260, f: (p) => ({ ...base, enemy, shot: { p, to } }) },
          { ms: 320, f: (p) => ({ ...base, burst: { x: to, p } }) },
          { ms: 380, f: (p) => ({ ...base, counter: p }) },
          { ms: 420, f: () => ({ ...base, ravanaHit: true }) },
        ],
        () => {
          const hp = ravanaHp - 1;
          setRavanaHp(hp);
          setScene(base);
          if (hp <= 0) setPhase("won");
        }
      );
    } else {
      setMissed((m) => [...m, { q, chosen: i }]);
      setPhase("hurt");
      play(
        [
          { ms: 300, f: (p) => ({ ...base, enemy: enemy + (1 - enemy) * p }) },
          { ms: 500, f: () => ({ ...base, ramaHit: true }) },
        ],
        () => {
          const l = lives - 1;
          setLives(l);
          setScene(base);
          if (l <= 0) setPhase("lost");
        }
      );
    }
  }

  function next() {
    setLast(null);
    setQi((n) => n + 1);
    setPhase("play");
  }

  // keyboard: 1–4 to answer, Enter for next
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (phase === "play" && q && /^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < q.options.length) answer(i);
      } else if (e.key === "Enter" && last && resolved) next();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  const busyAnim = phase === "strike" || phase === "hurt";
  const resolved = busyAnim && scene.enemy == null && scene.shot == null && scene.burst == null && scene.counter == null && !scene.ravanaHit && !scene.ramaHit;
  const timeLeft = scene.enemy == null ? 0 : Math.max(0, Math.ceil(cfg.secs * (1 - scene.enemy)));

  if (!questions.length) {
    return <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">The Sandhi questions are being added — please come back soon.</p>;
  }

  return (
    <div className="rr-game">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] shadow-[var(--shadow-lift)]">
        <BattleScene s={scene} />

        {/* HUD */}
        {phase !== "menu" && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 text-xs text-white sm:p-4 sm:text-sm">
            <div>
              <p className="font-semibold">Śrī Rāma</p>
              <p aria-label={`${lives} lives`}>{"♥".repeat(lives)}<span className="opacity-30">{"♥".repeat(LIVES - lives)}</span></p>
            </div>
            {phase === "play" && <p className="rr-timer tabular-nums">{timeLeft}s</p>}
            <div className="text-right">
              <p className="font-semibold">Rāvaṇa</p>
              <div className="mt-1 h-2 w-28 overflow-hidden rounded-full bg-white/20 sm:w-40">
                <div className="h-full rounded-full bg-[var(--color-gold-light)] transition-all" style={{ width: `${(ravanaHp / cfg.hp) * 100}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Menu / end screens */}
        {(phase === "menu" || phase === "won" || phase === "lost") && (
          <div className="absolute inset-0 grid place-items-center bg-black/45 p-4 text-center text-white backdrop-blur-[2px]">
            <div className="max-w-md">
              {phase === "menu" && (
                <>
                  <p className="font-devanagari text-2xl sm:text-3xl">राम-रावण युद्धम्</p>
                  <p className="mt-1 text-sm opacity-85">Answer the Sandhi before Rāvaṇa&apos;s arrow lands — Śrī Rāma&apos;s arrow will cut it down.</p>
                </>
              )}
              {phase === "won" && (
                <>
                  <p className="text-3xl font-semibold">Jaya Śrī Rāma!</p>
                  <p className="mt-1 text-sm opacity-85">Rāvaṇa is defeated — {right} correct, {missed.length} missed.</p>
                </>
              )}
              {phase === "lost" && (
                <>
                  <p className="text-2xl font-semibold">Rāvaṇa held the field</p>
                  <p className="mt-1 text-sm opacity-85">{right} correct. Read the sūtras below and try again.</p>
                </>
              )}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {(Object.keys(LEVELS) as Difficulty[]).map((d) => {
                  const L = LEVELS[d];
                  return (
                    <button key={d} type="button" onClick={() => start(d)} className="rr-level">
                      <L.icon size={15} /> {L.label} <span className="opacity-70">· {L.secs}s</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Question */}
      {(phase === "play" || busyAnim) && q && (
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-saffron)]">
            {q.type === "viccheda" ? "Split it (viccheda)" : "Join it (sandhi)"}
          </p>
          <p className="mt-1 font-devanagari text-2xl sm:text-3xl">{q.prompt}</p>
          {q.promptSub && <p className="text-sm text-[var(--fg-muted)]">{q.promptSub}</p>}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {q.options.map((o, i) => {
              const state = last ? (i === q.correctIndex ? "ok" : i === last.chosen ? "bad" : "") : "";
              return (
                <button key={i} type="button" disabled={phase !== "play"} onClick={() => answer(i)} className={`rr-opt ${state}`}>
                  <span className="rr-key">{i + 1}</span>
                  <span className="font-devanagari text-lg">{o}</span>
                </button>
              );
            })}
          </div>
          {last && (
            <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-[var(--border)] pt-3">
              <p className="min-w-0 flex-1 text-sm leading-relaxed">
                <span className={`font-semibold ${last.ok ? "text-[#2f8f5b]" : "text-[var(--color-vermillion)]"}`}>
                  {last.ok ? "Śrī Rāma strikes! " : last.chosen == null ? "Too late — " : "The arrow got through — "}
                </span>
                {last.q.explanation}{" "}
                {last.q.sutraRefs.map((n) => (
                  <Link key={n} href={`/sutras/${encodeURIComponent(n)}`} className="sutra-xref ml-1" target="_blank">
                    Sūtra {n}
                  </Link>
                ))}
              </p>
              {resolved && (
                <button type="button" onClick={next} className="ui-btn">
                  <Swords size={15} /> Next arrow
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {(phase === "won" || phase === "lost") && missed.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[var(--border)] p-4 sm:p-5">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Shield size={15} /> Review</p>
          <ul className="grid gap-3 text-sm">
            {missed.map((m, i) => (
              <li key={i}>
                <span className="font-devanagari text-base">{m.q.prompt} → {m.q.options[m.q.correctIndex]}</span>
                <span className="block text-[var(--fg-muted)]">
                  {m.q.explanation}{" "}
                  {m.q.sutraRefs.map((n) => (
                    <Link key={n} href={`/sutras/${encodeURIComponent(n)}`} className="sutra-xref ml-1">Sūtra {n}</Link>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => start(level)} className="ui-btn mt-4"><RotateCcw size={15} /> Play again</button>
        </div>
      )}
    </div>
  );
}
