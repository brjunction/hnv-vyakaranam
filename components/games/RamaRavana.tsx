"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Flame, Gauge, GraduationCap, Home, Leaf, RotateCcw, Swords } from "lucide-react";
import { shuffle, shuffleOptions, type Difficulty, type Question } from "@/lib/practiceData";
import Actor, { RAMA, RAVANA } from "@/components/games/Actor";
import { Formula, HintIcon, Options, PowerUp, QuestionHead, RuleCard, Stars, points, useBest } from "@/components/games/shared";

// Rāma and Rāvaṇa. Rāvaṇa has ten heads — ten right answers bring him down.
// Study mode: no clock, no lives, the sūtra after every answer, mistakes come
// back later. Battle mode: Rāvaṇa's arrow flies while the clock runs.

const LEVELS: Record<Difficulty, { label: string; secs: number; lives: number; icon: typeof Leaf; pool: Difficulty[] }> = {
  easy: { label: "Easy", secs: 20, lives: 4, icon: Leaf, pool: ["easy"] },
  medium: { label: "Medium", secs: 14, lives: 3, icon: Gauge, pool: ["easy", "medium"] },
  hard: { label: "Hard", secs: 9, lives: 3, icon: Flame, pool: ["easy", "medium", "hard"] },
};
const HEADS = 10;
type Mode = "study" | "battle";
type Phase = "menu" | "ask" | "fx" | "review" | "won" | "lost";
type Fx = "" | "shoot" | "hit" | "enemy" | "ramahit";

function Head({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 20 24" width="18" height="22" className={`rv-head ${on ? "" : "off"}`} aria-hidden>
      <path d="M3 9 L5 1 L8.5 6 L10 0 L11.5 6 L15 1 L17 9 Z" fill="#e8c766" stroke="#b7860b" strokeWidth="0.8" />
      <circle cx="10" cy="15" r="7" fill="#8a5636" />
      <circle cx="7.4" cy="14" r="1" fill="#222" />
      <circle cx="12.6" cy="14" r="1" fill="#222" />
      <path d="M7 18 Q10 20 13 18" stroke="#3a1a10" strokeWidth="1" fill="none" />
    </svg>
  );
}

function ArrowImg({ fire }: { fire?: boolean }) {
  return (
    <svg viewBox="0 0 120 20" className="block h-full w-full" aria-hidden>
      <line x1="6" y1="10" x2="100" y2="10" stroke={fire ? "#ff8a3d" : "#e8c766"} strokeWidth="4" strokeLinecap="round" />
      <path d="M98 3 L118 10 L98 17 Z" fill={fire ? "#ffb066" : "#fff2c4"} />
      <path d="M6 10 L0 3 M6 10 L0 17 M16 10 L10 3 M16 10 L10 17" stroke={fire ? "#b3341a" : "#c9a227"} strokeWidth="3" />
    </svg>
  );
}

export function Backdrop() {
  return (
    <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="rv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d2f4d" />
          <stop offset=".55" stopColor="#a65d57" />
          <stop offset="1" stopColor="#f0b36a" />
        </linearGradient>
        <linearGradient id="rv-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b3b2c" />
          <stop offset="1" stopColor="#2b1c17" />
        </linearGradient>
        <radialGradient id="rv-glow">
          <stop offset="0" stopColor="#ffd98a" stopOpacity=".9" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#rv-sky)" />
      <circle cx="400" cy="300" r="170" fill="url(#rv-glow)" className="rr-sun" />
      {[[60, 40], [150, 90], [280, 30], [520, 50], [700, 30], [760, 100]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill="#fff" className="rr-star" style={{ animationDelay: `${i * 0.6}s` }} />
      ))}
      {[0, 1, 2].map((i) => (
        <g key={i} className="rr-cloud" style={{ animationDuration: `${50 + i * 20}s`, animationDelay: `${-i * 19}s` }}>
          <ellipse cx="0" cy={70 + i * 46} rx={80 - i * 12} ry="15" fill="#fff" opacity=".13" />
          <ellipse cx="34" cy={60 + i * 46} rx="44" ry="13" fill="#fff" opacity=".1" />
        </g>
      ))}
      <g fill="#3a2230" opacity=".85">
        <path d="M0 330 Q120 270 260 300 Q420 250 560 290 Q700 260 800 300 L800 450 L0 450Z" />
        {[[120, 250, 26, 58], [300, 236, 30, 70], [480, 246, 24, 56], [640, 232, 32, 74]].map(([x, y, w, h], i) => (
          <g key={i}>
            <rect x={x} y={y + 24} width={w} height={h} />
            <path d={`M${x - 4} ${y + 26} Q${x + w / 2} ${y - 18} ${x + w + 4} ${y + 26}Z`} />
          </g>
        ))}
      </g>
      <g fill="#ffd98a" opacity=".6">
        {[132, 314, 490, 654].map((x, i) => <circle key={i} cx={x} cy={290 + (i % 2) * 6} r="1.8" />)}
      </g>
      <rect y="385" width="800" height="65" fill="url(#rv-ground)" />
    </svg>
  );
}

/** The scene playing by itself — for the home page. */
export function BattleDemo() {
  return (
    <div className="rv-scene rv-demo">
      <Backdrop />
      <Actor {...RAVANA} alt="Rāvaṇa" cut={52} state="walk" className="rv-ravana demo-hit" />
      <Actor {...RAMA} alt="Śrī Rāma" state="shoot" className="rv-rama" />
      <div className="rv-arrow fire demo-enemy"><ArrowImg fire /></div>
      <div className="rv-arrow demo-shot"><ArrowImg /></div>
    </div>
  );
}

export default function RamaRavanaGame({ questions }: { questions: Question[] }) {
  const [mode, setMode] = useState<Mode>("study");
  const [level, setLevel] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<Phase>("menu");
  const [queue, setQueue] = useState<Question[]>([]);
  const [heads, setHeads] = useState(HEADS);
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
  const [frac, setFrac] = useState(0); // how far Rāvaṇa's arrow has flown, 0 → 1
  const [fresh, setFresh] = useState(false);
  const timer = useRef(0);
  const timeouts = useRef<number[]>([]);
  const cfg = LEVELS[level];
  const q = queue[0];
  const { best, submit } = useBest(`rama:${questions[0]?.chapter ?? ""}:${mode}:${level}`);

  const later = (ms: number, f: () => void) => {
    timeouts.current.push(window.setTimeout(f, ms));
  };
  // The clock and the effects use SEPARATE handles, so one never cancels the other.
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
    setQueue(deck.map(shuffleOptions));
    setHeads(HEADS);
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

  // Battle mode: Rāvaṇa's arrow flies toward Rāma while the clock runs.
  useEffect(() => {
    cancelAnimationFrame(timer.current);
    if (phase !== "ask" || mode !== "battle" || !q) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = (now - t0) / (cfg.secs * 1000);
      if (p >= 1) return resolve(null, 1);
      setFrac(p);
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
    if (ok) {
      const s = streak + 1;
      setStreak(s);
      setBestStreak((b) => Math.max(b, s));
      setRight((n) => n + 1);
      setScore((v) => v + points(streak, mode === "battle" ? 1 - p : 0.5) - (peek ? 25 : 0));
      setFx("shoot");
      later(520, () => {
        setFx("hit");
        setHeads((h) => h - 1);
      });
      later(1150, () => {
        setFx("");
        setPhase("review");
      });
    } else {
      setStreak(0);
      setMissed((m) => (m.some((x) => x.id === q.id) ? m : [...m, q]));
      if (mode === "battle") {
        setFx("enemy");
        later(450, () => {
          setFx("ramahit");
          setLives((l) => l - 1);
        });
        later(1100, () => {
          setFx("");
          setPhase("review");
        });
      } else {
        later(500, () => setPhase("review"));
      }
    }
  }

  function finish(won: boolean) {
    if (mode === "battle") setFresh(submit(score));
    setPhase(won ? "won" : "lost");
  }

  function next() {
    if (phase !== "review" || !q) return;
    const ok = picked === q.correctIndex;
    if (heads <= 0) return finish(true);
    if (mode === "battle" && lives <= 0) return finish(false);
    const rest = queue.slice(1);
    // a mistake comes back a few questions later
    if (!ok) rest.splice(Math.min(3, rest.length), 0, shuffleOptions(q));
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
  const ex = mode === "battle" ? 34 + frac * 32 : 36; // Rāvaṇa's arrow (left %)

  return (
    <div className="rv-game">
      <div className="rv-scene">
        <Backdrop />

        {phase !== "won" ? (
          <>
            <Actor
              {...RAVANA}
              alt="Rāvaṇa"
              cut={52}
              state={fx === "enemy" || phase === "lost" ? "roar" : fx === "hit" ? "stumble" : "walk"}
              className={`rv-ravana ${fx === "hit" ? "hit" : ""} ${phase === "lost" ? "cheer" : ""}`}
            />
            <Actor
              {...RAMA}
              alt="Śrī Rāma"
              state={fx === "shoot" ? "shoot" : fx === "ramahit" ? "stumble" : "idle"}
              className={`rv-rama ${fx === "ramahit" ? "hit" : ""} ${phase === "lost" ? "down" : ""}`}
            />
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/games/victory.png" alt="Śrī Rāma has defeated Rāvaṇa" className="rv-victory" draggable={false} />
        )}

        {phase === "ask" && q && (
          <div className="rv-arrow fire" style={{ left: `${ex}%`, top: "56%", transform: "scaleX(-1)" }}>
            <ArrowImg fire />
          </div>
        )}
        {fx === "enemy" && <div className="rv-arrow fire fly-to-rama"><ArrowImg fire /></div>}
        {fx === "shoot" && <div className="rv-arrow fly-to-ravana"><ArrowImg /></div>}
        {fx === "hit" && (
          <>
            <div className="rv-burst" aria-hidden />
            <div className="rv-fallhead" aria-hidden><Head on /></div>
          </>
        )}

        {playing && (
          <>
            <div className="rv-hud left">
              {mode === "battle" ? (
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
            <div className="rv-hud right" aria-label={`Rāvaṇa has ${heads} heads left`}>
              <p className="mb-1 text-[11px] uppercase tracking-wider opacity-80">Daśānana · {heads} heads</p>
              <div className="flex flex-wrap justify-end gap-0.5">
                {Array.from({ length: HEADS }, (_, i) => <Head key={i} on={i < heads} />)}
              </div>
            </div>
            <button type="button" onClick={() => { stopAll(); setPhase("menu"); }} className="rv-menu"><Home size={13} /> Menu</button>
            {phase === "ask" && mode === "battle" && <div className="rv-time"><i style={{ width: `${(1 - frac) * 100}%` }} /></div>}
          </>
        )}

        {(phase === "menu" || phase === "won" || phase === "lost") && (
          <div className="rv-overlay">
            <div className="rv-card">
              {phase === "menu" && (
                <>
                  <p className="font-devanagari text-3xl">राम-रावण युद्धम्</p>
                  <p className="mt-1 text-sm opacity-85">Rāvaṇa has ten heads. Each right answer brings one down with Śrī Rāma&apos;s arrow. Ten right answers win the battle.</p>
                  <div className="rv-modes">
                    <button type="button" onClick={() => setMode("study")} className={mode === "study" ? "on" : ""}>
                      <GraduationCap size={18} /> <b>Study</b>
                      <span>No clock, no lives. The sūtra is shown after every answer, and mistakes come back.</span>
                    </button>
                    <button type="button" onClick={() => setMode("battle")} className={mode === "battle" ? "on" : ""}>
                      <Swords size={18} /> <b>Battle</b>
                      <span>Rāvaṇa&apos;s arrow flies while the clock runs. Lives, combo and a score to beat.</span>
                    </button>
                  </div>
                </>
              )}
              {phase === "won" && (
                <>
                  <p className="text-3xl font-semibold">Jaya Śrī Rāma!</p>
                  <div className="my-2"><Stars n={stars} /></div>
                  <p className="text-sm opacity-90">
                    {right} of {asked} right ({acc}%){mode === "battle" ? ` · score ${score}${fresh ? " — a new best!" : ""}` : ""} · longest streak {bestStreak}
                  </p>
                </>
              )}
              {phase === "lost" && (
                <>
                  <p className="text-2xl font-semibold">Rāvaṇa holds the field</p>
                  <p className="mt-1 text-sm opacity-90">{HEADS - heads} of ten heads brought down. Read the rules below, then fight again — or try Study mode.</p>
                </>
              )}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {(Object.keys(LEVELS) as Difficulty[]).map((k) => {
                  const L = LEVELS[k];
                  return (
                    <button key={k} type="button" onClick={() => begin(mode, k)} className="rr-level">
                      <L.icon size={15} /> {L.label}
                      {mode === "battle" && <span className="opacity-70">· {L.secs}s</span>}
                    </button>
                  );
                })}
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
          <Options q={q} hidden={hidden} picked={picked} locked={phase !== "ask"} onPick={(i) => resolve(i)} />
          {phase === "review" && (
            <RuleCard q={q} ok={picked === q.correctIndex} picked={picked} timedOut={timedOut} onNext={next} last={heads <= 0 || (mode === "battle" && lives <= 0)} />
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
          <button type="button" onClick={() => begin(mode, level)} className="ui-btn mt-4"><RotateCcw size={15} /> Play again</button>
        </div>
      )}
    </div>
  );
}
