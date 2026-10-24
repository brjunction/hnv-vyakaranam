"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Flame, Gauge, GraduationCap, Home, Leaf, RotateCcw, Timer } from "lucide-react";
import { shuffle, type Difficulty, type Question } from "@/lib/practiceData";
import { RuleCard, Stars, points, useBest } from "@/components/games/shared";

// Rule Sorter. Crates ride a conveyor belt; each holds one worked example
// ("राम + अर्जुन → रामार्जुन"). Send it to the bin of the sūtra that makes it so.
// Sorting by RULE is the skill behind every sandhi and every ending.
// Study: the crate waits, the sūtra's own words stay in view, and every crate is explained.
// Challenge: the belt keeps moving, lives, combo and a score.

const LEVELS: Record<Difficulty, { label: string; bins: number; secs: number; lives: number; icon: typeof Leaf; blurb: string }> = {
  easy: { label: "Easy", bins: 3, secs: 16, lives: 4, icon: Leaf, blurb: "Three sūtra bins." },
  medium: { label: "Medium", bins: 4, secs: 12, lives: 3, icon: Gauge, blurb: "Four sūtra bins." },
  hard: { label: "Hard", bins: 5, secs: 9, lives: 3, icon: Flame, blurb: "Five sūtra bins, a faster belt." },
};
const CRATES = 10;
const TYPES = new Set(["sandhi", "viccheda", "nama-rupa", "akhyata-rupa", "krt-rupa", "taddhita-rupa"]);
const COLORS = ["#1f8a8a", "#d9622b", "#4b5fc7", "#2f8f5b", "#8e4fa8"];
type Mode = "study" | "challenge";
type Phase = "menu" | "play" | "done";
type Step = "belt" | "sent" | "note";

type Crate = { q: Question; ref: string };
type Bin = { ref: string; label: string; sanskrit: string; translation: string };

const firstNum = (r: string) => /(\d+(?:\.\d+)*)/.exec(r)?.[1] ?? "";

/** "Sutra 42: a + a → ā. rāma + arjuna → …" → "a + a → ā" */
function ruleOf(q: Question): string {
  const m = /^Sutras?\s+[\d.,\s/–-]+:\s*([^.]+?)\./i.exec(q.explanation.trim());
  const r = m?.[1]?.trim() ?? "";
  return r.length > 0 && r.length <= 60 ? r : "";
}

export function sortable(q: Question) {
  return TYPES.has(q.type) && !!firstNum(q.sutraRefs[0] ?? "");
}

const crateText = (q: Question) => `${q.prompt} → ${q.options[q.correctIndex]}`;

export default function SutraSorter({ questions }: { questions: Question[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, Question[]>();
    for (const q of questions.filter(sortable)) {
      const k = firstNum(q.sutraRefs[0]);
      m.set(k, [...(m.get(k) ?? []), q]);
    }
    return m;
  }, [questions]);
  const [mode, setMode] = useState<Mode>("study");
  const [level, setLevel] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<Phase>("menu");
  const [bins, setBins] = useState<Bin[]>([]);
  const [queue, setQueue] = useState<Crate[]>([]);
  const [cur, setCur] = useState<Crate | null>(null);
  const [step, setStep] = useState<Step>("belt");
  const [sent, setSent] = useState<number | null>(null);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [right, setRight] = useState(0);
  const [asked, setAsked] = useState(0);
  const [missed, setMissed] = useState<Crate[]>([]);
  const [frac, setFrac] = useState(0);
  const [fresh, setFresh] = useState(false);
  const timer = useRef(0);
  const timeouts = useRef<number[]>([]);
  const cfg = LEVELS[level];
  const { best, submit } = useBest(`sorter:${questions[0]?.chapter ?? ""}:${mode}:${level}`);

  const later = (ms: number, f: () => void) => {
    timeouts.current.push(window.setTimeout(f, ms));
  };
  const stopAll = useCallback(() => {
    cancelAnimationFrame(timer.current);
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  }, []);
  useEffect(() => stopAll, [stopAll]);

  const enough = groups.size >= 3;

  function binFor(ref: string): Bin {
    const qs = groups.get(ref) ?? [];
    const s = qs.flatMap((q) => q.sutras ?? []).find((x) => x.number === ref);
    const label = qs.map(ruleOf).find(Boolean) ?? "";
    return { ref, label, sanskrit: s?.sanskrit ?? "", translation: s?.translation ?? "" };
  }

  function begin(m: Mode, lv: Difficulty) {
    stopAll();
    const L = LEVELS[lv];
    const refs = shuffle([...groups.keys()]).slice(0, Math.min(L.bins, groups.size));
    const bs = refs.map(binFor);
    const list: Crate[] = [];
    let last = "";
    for (let i = 0; list.length < CRATES; i++) {
      const ref = refs[i % refs.length];
      const opts = shuffle(groups.get(ref) ?? []).filter((q) => q.id !== last);
      const q = opts[0] ?? groups.get(ref)![0];
      last = q.id;
      list.push({ q, ref });
    }
    const deck = shuffle(list);
    setMode(m);
    setLevel(lv);
    setBins(bs);
    setLives(L.lives);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setRight(0);
    setAsked(0);
    setMissed([]);
    setFresh(false);
    setQueue(deck.slice(1));
    setPhase("play");
    start(deck[0]);
  }

  function start(c: Crate) {
    setCur(c);
    setSent(null);
    setStep("belt");
    setFrac(0);
  }

  // The belt: the crate rides in from the left. Challenge: it keeps going until it drops off the end.
  useEffect(() => {
    cancelAnimationFrame(timer.current);
    if (phase !== "play" || step !== "belt" || !cur) return;
    const total = (mode === "challenge" ? cfg.secs : 1.1) * 1000;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / total);
      setFrac(mode === "study" ? 1 - (1 - p) * (1 - p) : p);
      if (p >= 1) {
        if (mode === "challenge") send(null, 1);
        return;
      }
      timer.current = requestAnimationFrame(tick);
    };
    timer.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, step, cur]);

  function send(i: number | null, p = frac) {
    if (!cur || step !== "belt" || phase !== "play") return;
    cancelAnimationFrame(timer.current);
    const ok = i !== null && bins[i].ref === cur.ref;
    setSent(i);
    setStep("sent");
    setAsked((n) => n + 1);
    if (ok) {
      const s = streak + 1;
      setStreak(s);
      setBestStreak((b) => Math.max(b, s));
      setRight((n) => n + 1);
      setScore((v) => v + points(streak, mode === "challenge" ? 1 - p : 0.5));
      // challenge: right answers keep the belt moving; study: always explain
      later(600, () => (mode === "challenge" ? advance() : setStep("note")));
    } else {
      setStreak(0);
      setMissed((m) => (m.some((x) => x.q.id === cur.q.id) ? m : [...m, cur]));
      if (mode === "challenge") setLives((l) => l - 1);
      later(650, () => setStep("note"));
    }
  }

  function advance() {
    if (!cur) return;
    const gone = mode === "challenge" && lives <= 0;
    const rest = [...queue];
    const wasRight = sent !== null && bins[sent]?.ref === cur.ref;
    if (mode === "study" && !wasRight) rest.splice(Math.min(3, rest.length), 0, cur);
    if (gone || !rest.length) {
      if (mode === "challenge") setFresh(submit(score));
      stopAll();
      setPhase("done");
      return;
    }
    const [n, ...tail] = rest;
    setQueue(tail);
    start(n);
  }

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (phase !== "play") return;
      if (step === "belt" && /^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < bins.length) send(i);
      } else if ((e.key === "Enter" || e.key === " ") && step === "note") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  if (!enough) {
    return <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">Rule Sorter needs worked examples under at least three different sūtras in this prakaraṇa. They are being added — please come back soon.</p>;
  }

  if (phase === "menu") {
    return (
      <div className="ss-scene ss-idle">
        <div className="fg-menu">
          <p className="font-devanagari text-3xl">सूत्र-वर्गीकरणम्</p>
          <p className="mx-auto mt-1 max-w-lg text-sm opacity-85">Crates ride the belt, each with a worked example. Send every crate to the bin of the sūtra that makes it so.</p>
          <div className="rv-modes">
            <button type="button" onClick={() => setMode("study")} className={mode === "study" ? "on" : ""}>
              <GraduationCap size={18} /> <b>Study</b>
              <span>The crate waits. The sūtra&apos;s own words stay in view, and every crate is explained.</span>
            </button>
            <button type="button" onClick={() => setMode("challenge")} className={mode === "challenge" ? "on" : ""}>
              <Timer size={18} /> <b>Challenge</b>
              <span>The belt keeps moving — lives, combo and a score to beat.</span>
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
          <p className="mt-3 text-xs opacity-75">{CRATES} crates per round · {cfg.blurb}</p>
          {mode === "challenge" && best !== null && <p className="mt-1 text-xs opacity-80">Your best on {cfg.label}: {best}</p>}
        </div>
      </div>
    );
  }

  const Legend = (
    <div className="grid gap-2 sm:grid-cols-2">
      {bins.map((b, i) => (
        <div key={b.ref} className="gm-sutra" style={{ borderLeftColor: COLORS[i % COLORS.length] }}>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS[i % COLORS.length] }}>
            <BookOpen size={13} /> Bin {i + 1} · Sūtra {b.ref}
          </p>
          {b.sanskrit && <p className="font-devanagari text-lg leading-snug">{b.sanskrit}</p>}
          {b.label && <p className="text-sm italic text-[var(--fg-muted)]">{b.label}</p>}
          {b.translation && <p className="text-sm">{b.translation}</p>}
        </div>
      ))}
    </div>
  );

  if (phase === "done") {
    const acc = asked ? Math.round((right / asked) * 100) : 0;
    const lost = mode === "challenge" && lives <= 0;
    const stars = lost ? 0 : acc >= 90 ? 3 : acc >= 70 ? 2 : 1;
    return (
      <div>
        <div className="ss-scene ss-idle">
          <div className="fg-menu">
            <p className="text-3xl font-semibold">{lost ? "The belt jammed" : "All crates sorted!"}</p>
            <div className="my-2"><Stars n={stars} /></div>
            <p className="text-sm opacity-90">{right} of {asked} in the right bin ({acc}%){mode === "challenge" ? ` · score ${score}${fresh ? " — a new best!" : ""}` : ""} · longest streak {bestStreak}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {(Object.keys(LEVELS) as Difficulty[]).map((k) => <button key={k} type="button" onClick={() => begin(mode, k)} className="rr-level"><RotateCcw size={14} /> {LEVELS[k].label}</button>)}
              <button type="button" onClick={() => setPhase("menu")} className="rr-level">Menu</button>
            </div>
          </div>
        </div>
        <div className="rv-panel">
          <p className="mb-3 font-semibold">The sūtras in this round</p>
          {Legend}
          {missed.length > 0 && (
            <>
              <p className="mb-3 mt-6 font-semibold">Revise these crates</p>
              <div className="grid gap-4">
                {missed.map(({ q }) => (
                  <div key={q.id}>
                    <p className="mb-1 font-devanagari text-xl">{crateText(q)}</p>
                    <RuleCard q={q} ok picked={null} plain />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!cur) return null;
  const atBin = step !== "belt" && sent !== null;
  const left = step === "belt" ? -16 + frac * (mode === "challenge" ? 118 : 66) : atBin ? ((sent + 0.5) * 100) / bins.length : 108;
  const top = atBin ? 58 : 9;
  const right_ = sent !== null && bins[sent]?.ref === cur.ref;

  return (
    <div>
      <div className="ss-scene">
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
          <p className="rv-chip ml-auto">Crate <b>{Math.min(asked + (step === "belt" ? 1 : 0), CRATES)}</b> / {CRATES}</p>
          <button type="button" onClick={() => { stopAll(); setPhase("menu"); }} className="rv-chip"><Home size={12} /> Menu</button>
        </div>

        <div className="ss-belt" aria-hidden><i /></div>
        <div
          key={`${cur.q.id}-${asked}`}
          className={`ss-crate ${step === "sent" ? (right_ ? "good" : "bad") : ""} ${step === "note" ? "gone" : ""}`}
          style={{ left: `${left}%`, top: `${top}%` }}
          role="img"
          aria-label={`Crate: ${crateText(cur.q)}`}
        >
          <span className="font-devanagari">{crateText(cur.q)}</span>
        </div>

        <div className="ss-bins" style={{ gridTemplateColumns: `repeat(${bins.length}, minmax(0, 1fr))` }}>
          {bins.map((b, i) => (
            <button
              key={b.ref}
              type="button"
              disabled={step !== "belt"}
              onClick={() => send(i)}
              className={`ss-bin ${step !== "belt" && b.ref === cur.ref ? "ok" : ""} ${sent === i && step !== "belt" && b.ref !== cur.ref ? "bad" : ""}`}
              style={{ background: `linear-gradient(${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}cc)` }}
            >
              <b>{i + 1}</b>
              <span>Sūtra {b.ref}</span>
              {b.label && <em>{b.label}</em>}
            </button>
          ))}
        </div>
        {mode === "challenge" && step === "belt" && <div className="rv-time"><i style={{ width: `${(1 - frac) * 100}%` }} /></div>}
      </div>

      <div className="rv-panel">
        {step === "note" ? (
          <RuleCard
            q={cur.q}
            ok={sent !== null && bins[sent]?.ref === cur.ref}
            picked={null}
            timedOut={sent === null}
            onNext={advance}
            last={!queue.length || (mode === "challenge" && lives <= 0)}
          />
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-saffron)]">Which sūtra makes this so?</p>
            <p className="mb-3 mt-0.5 text-[11px] text-[var(--fg-muted)]">Tap a bin (or press its number). The sūtras:</p>
            {Legend}
          </>
        )}
      </div>
    </div>
  );
}
