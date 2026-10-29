"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, RotateCcw } from "lucide-react";
import { shuffle, type Question } from "@/lib/practiceData";
import { Stars, points, useBest } from "@/components/games/shared";

// Case Blitz — a declined form flashes up; name its case and number before the
// clock runs out. Three lives. The forms come from the declension tables
// (paradigms) of the Nāma-prakaraṇa: 8 cases × 3 numbers, case by case
// (eka, dvi, bahu). A form that stands in several cells (for example the dual
// kṛṣṇau) is right for each of them.

const CASES = ["Prathamā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī", "Ṣaṣṭhī", "Saptamī", "Sambodhana"];
const CASE_EN = ["1st · nominative", "2nd · accusative", "3rd · instrumental", "4th · dative", "5th · ablative", "6th · genitive", "7th · locative", "vocative"];
const NUMS = ["Eka (singular)", "Dvi (dual)", "Bahu (plural)"];
const LEVELS = { easy: { secs: 14, label: "Easy" }, medium: { secs: 9, label: "Medium" }, hard: { secs: 6, label: "Hard" } } as const;
type Lv = keyof typeof LEVELS;
const ROUNDS = 15;

type Round = { stem: string; form: string; ok: Set<number> };

function makeRounds(paradigms: Question[]): Round[] {
  const rounds: Round[] = [];
  for (const p of shuffle(paradigms)) {
    const forms = p.options;
    if (forms.length !== 24) continue;
    const cells = shuffle(forms.map((f, i) => (f ? i : -1)).filter((i) => i >= 0));
    const i = cells[0];
    if (i === undefined) continue;
    rounds.push({ stem: p.prompt, form: forms[i], ok: new Set(forms.map((f, j) => (f === forms[i] ? j : -1)).filter((j) => j >= 0)) });
  }
  return shuffle(rounds).slice(0, ROUNDS);
}

export default function CaseBlitz({ paradigms }: { paradigms: Question[] }) {
  const valid = useMemo(() => paradigms.filter((p) => p.options.length === 24 && p.options.some(Boolean)), [paradigms]);
  const [lv, setLv] = useState<Lv | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [n, setN] = useState(0);
  const [pickCase, setPickCase] = useState<number | null>(null);
  const [pickNum, setPickNum] = useState<number | null>(null);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [left, setLeft] = useState(0);
  const [verdict, setVerdict] = useState<null | { good: boolean; text: string }>(null);
  const [over, setOver] = useState(false);
  const clock = useRef(0);
  const { best, submit } = useBest(`blitz:${lv ?? ""}`);
  const cur = rounds[n];

  const stop = useCallback(() => window.clearInterval(clock.current), []);
  useEffect(() => stop, [stop]);

  const answer = useCallback(
    (c: number | null, num: number | null, timedOut = false) => {
      if (!cur || verdict || !lv) return;
      stop();
      const good = !timedOut && c !== null && num !== null && cur.ok.has(c * 3 + num);
      const place = [...cur.ok].map((i) => `${CASES[Math.floor(i / 3)]} ${NUMS[i % 3].split(" ")[0].toLowerCase()}`).join(" or ");
      if (good) {
        setScore((s) => s + points(streak, left / LEVELS[lv].secs));
        setStreak((s) => s + 1);
        setVerdict({ good: true, text: `Yes — ${place}.` });
      } else {
        setStreak(0);
        setLives((l) => l - 1);
        setVerdict({ good: false, text: `${timedOut ? "Time! " : ""}It is ${place}.` });
      }
    },
    [cur, verdict, lv, stop, streak, left]
  );

  function start(level: Lv) {
    const r = makeRounds(valid);
    setRounds(r);
    setLv(level);
    setN(0);
    setLives(3);
    setScore(0);
    setStreak(0);
    setOver(false);
    setVerdict(null);
    setPickCase(null);
    setPickNum(null);
    setLeft(LEVELS[level].secs);
  }

  // the clock of a round
  useEffect(() => {
    if (!lv || !cur || verdict || over) return;
    setLeft(LEVELS[lv].secs);
    const t0 = Date.now();
    clock.current = window.setInterval(() => {
      const l = LEVELS[lv].secs - (Date.now() - t0) / 1000;
      setLeft(Math.max(0, l));
      if (l <= 0) window.clearInterval(clock.current);
    }, 100);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lv, n, over, rounds]);
  useEffect(() => {
    if (lv && cur && !verdict && left <= 0 && !over) answer(null, null, true);
  }, [left, lv, cur, verdict, over, answer]);

  // both picked → answer
  useEffect(() => {
    if (pickCase !== null && pickNum !== null) answer(pickCase, pickNum);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickCase, pickNum]);

  function next() {
    if (lives <= 0 || n + 1 >= rounds.length) {
      setOver(true);
      submit(score);
      return;
    }
    setN(n + 1);
    setVerdict(null);
    setPickCase(null);
    setPickNum(null);
  }

  if (!lv)
    return (
      <div>
        <p className="mb-4 text-sm text-[var(--fg-muted)]">A form appears. Tap its case and its number before the clock ends. Fifteen forms, three lives.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(LEVELS) as Lv[]).map((k) => (
            <button key={k} type="button" onClick={() => start(k)} className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-4 text-left hover:border-[var(--accent)]">
              <span className="font-medium">{LEVELS[k].label}</span>
              <span className="block text-sm text-[var(--fg-muted)]">{LEVELS[k].secs} seconds a form</span>
            </button>
          ))}
        </div>
      </div>
    );

  if (over || !cur)
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-6 text-center">
        <p className="text-sm text-[var(--fg-muted)]">{lives <= 0 ? "Out of lives" : "All forms done"}</p>
        <p className="mt-1 text-4xl font-semibold">{score}</p>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">Best: {best ?? score} <Stars n={score > ROUNDS * 150 ? 3 : score > ROUNDS * 90 ? 2 : 1} /></p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" onClick={() => start(lv)} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--color-ink)]"><RotateCcw size={14} /> Again</button>
          <button type="button" onClick={() => setLv(null)} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm">Menu</button>
        </div>
      </div>
    );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-[var(--fg-muted)]">
        <span>Form {n + 1} / {rounds.length} · streak {streak}</span>
        <span className="inline-flex items-center gap-2">
          <b className="text-[var(--fg)]">{score}</b>
          {Array.from({ length: 3 }, (_, i) => <Heart key={i} size={16} className={i < lives ? "fill-red-500 text-red-500" : "opacity-30"} />)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full bg-[var(--accent)]" style={{ width: `${(left / LEVELS[lv].secs) * 100}%` }} /></div>

      <div className="my-5 text-center">
        <p className="font-devanagari text-5xl">{cur.form}</p>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">a form of <i>{cur.stem}</i></p>
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Case</p>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CASES.map((c, i) => (
          <button key={c} type="button" disabled={!!verdict} onClick={() => setPickCase(i)} className={`rounded-lg border px-2 py-2 text-sm ${pickCase === i ? "border-[var(--accent)] bg-[var(--bg-2)]" : "border-[var(--border)]"}`}>
            {c}<span className="block text-[10px] text-[var(--fg-muted)]">{CASE_EN[i]}</span>
          </button>
        ))}
      </div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Number</p>
      <div className="grid grid-cols-3 gap-2">
        {NUMS.map((c, i) => (
          <button key={c} type="button" disabled={!!verdict} onClick={() => setPickNum(i)} className={`rounded-lg border px-2 py-2 text-sm ${pickNum === i ? "border-[var(--accent)] bg-[var(--bg-2)]" : "border-[var(--border)]"}`}>{c}</button>
        ))}
      </div>

      {verdict && (
        <div className={`mt-5 rounded-xl border p-4 ${verdict.good ? "border-green-600/50" : "border-red-500/50"}`}>
          <p className="text-sm">{verdict.text}</p>
          <button type="button" onClick={next} className="mt-3 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--color-ink)]">{lives <= 0 || n + 1 >= rounds.length ? "Finish" : "Next form"}</button>
        </div>
      )}
    </div>
  );
}
