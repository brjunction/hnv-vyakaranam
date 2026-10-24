"use client";

import type { AnsweredQuestion } from "@/components/practice/QuizRunner";
import { Download, RotateCcw, Trophy, Medal, Award, Gem } from "lucide-react";
import { typeInfo } from "@/lib/practice/sections";

type Tier = {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  comment: string;
};

function tierFor(pct: number): Tier {
  if (pct === 100) {
    return {
      key: "perfect",
      label: "Perfect score",
      icon: <Gem size={40} />,
      color: "var(--color-gold)",
      comment: "Every answer correct. Flawless.",
    };
  }
  if (pct >= 80) {
    return {
      key: "gold",
      label: "Gold tier",
      icon: <Trophy size={40} />,
      color: "var(--color-gold)",
      comment: "Excellent work — you clearly know these rules well.",
    };
  }
  if (pct >= 60) {
    return {
      key: "silver",
      label: "Silver tier",
      icon: <Medal size={40} />,
      color: "#9aa5b1",
      comment: "Good effort. A little more review and this will stick.",
    };
  }
  if (pct >= 40) {
    return {
      key: "bronze",
      label: "Bronze tier",
      icon: <Award size={40} />,
      color: "var(--color-saffron)",
      comment: "A fair start — go back over the explanations and try again.",
    };
  }
  return {
    key: "practice",
    label: "Keep practicing",
    icon: <Award size={40} />,
    color: "var(--color-vermillion)",
    comment: "Worth another pass — review each explanation below, then retry.",
  };
}

function bestStreak(answers: AnsweredQuestion[]): number {
  let best = 0;
  let cur = 0;
  for (const a of answers) {
    cur = a.correct ? cur + 1 : 0;
    if (cur > best) best = cur;
  }
  return best;
}

function toCsv(answers: AnsweredQuestion[]): string {
  const header = ["#", "Prompt", "Type", "Difficulty", "Your answer", "Correct answer", "Result", "Sutras applied"];
  const rows = answers.map((a, i) => [
    String(i + 1),
    a.question.prompt,
    a.question.type,
    a.question.difficulty,
    a.question.options[a.chosenIndex],
    a.question.options[a.question.correctIndex],
    a.correct ? "Correct" : "Incorrect",
    a.question.sutraRefs.join("; "),
  ]);
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export default function Results({
  answers,
  onRetry,
  onBack,
  color = "var(--accent)",
}: {
  answers: AnsweredQuestion[];
  onRetry: () => void;
  onBack?: () => void;
  color?: string;
}) {
  const correct = answers.filter((a) => a.correct).length;
  const pct = Math.round((correct / answers.length) * 100);
  const tier = tierFor(pct);
  const streak = bestStreak(answers);

  function download() {
    const blob = new Blob([toCsv(answers)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hnv-practice-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="anv-fade max-w-2xl mx-auto text-center">
      {pct >= 80 && (
        <div className="pq-confetti" aria-hidden>
          {Array.from({ length: 28 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 37) % 100}%`, background: ["#c9a227", "#d9622b", "#1f8a8a", "#4b5fc7", "#b4566f"][i % 5], animationDelay: `${(i % 9) * 0.12}s`, animationDuration: `${1.8 + (i % 5) * 0.3}s` }} />
          ))}
        </div>
      )}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 anv-fade"
        style={{
          color: tier.color,
          background: `radial-gradient(circle, color-mix(in srgb, ${tier.color} 18%, transparent), transparent 75%)`,
          border: `2px solid color-mix(in srgb, ${tier.color} 45%, transparent)`,
        }}
      >
        {tier.icon}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: tier.color }}>
        {tier.label}
      </p>
      <p className="anv-label mb-2">Practice complete</p>
      <p className="text-5xl font-semibold mb-2 sutra-number">
        {correct} / {answers.length}
      </p>
      <p className="text-2xl font-medium mb-4" style={{ color: tier.color }}>
        {pct}%
      </p>
      <p className="text-[var(--fg-muted)] mb-2 max-w-md mx-auto">{tier.comment}</p>
      {streak >= 3 && (
        <p className="text-sm text-[var(--fg-muted)] mb-8">
          Best streak this round: <span className="font-semibold text-[var(--accent)]">{streak} in a row</span>
        </p>
      )}
      {streak < 3 && <div className="mb-8" />}

      <div className="flex flex-wrap justify-center gap-3 mb-12">
        <button
          onClick={onRetry}
          style={{ background: color }} className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium hover:opacity-90 hover:scale-105 transition-all"
        >
          <RotateCcw size={18} /> Play again
        </button>
        {onBack && (
          <button onClick={onBack} className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--border)] hover:border-[var(--accent)] transition-colors">
            Choose another level
          </button>
        )}
        <button
          onClick={download}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
        >
          <Download size={18} /> Download results (CSV)
        </button>
      </div>

      <div className="text-left">
        <p className="anv-label mb-4 text-center">Question by question</p>
        <div className="space-y-2">
          {answers.map((a, i) => (
            <div
              key={a.question.id}
              className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-4 ${
                a.correct ? "border-[#4caf7d]/40" : "border-[var(--color-vermillion)]/40"
              }`}
            >
              <div className="min-w-0">
                <p className="font-devanagari text-lg truncate">{a.question.prompt}</p>
                <p className="text-xs text-[var(--fg-muted)]">
                  {a.question.difficulty} · {typeInfo(a.question.type).label.split(" — ")[0]}
                  {a.question.sutraRefs.length > 0 && ` · Sūtra ${a.question.sutraRefs.join(", ")}`}
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                  a.correct ? "bg-[#4caf7d]/15 text-[#4caf7d]" : "bg-[var(--color-vermillion)]/15 text-[var(--color-vermillion)]"
                }`}
              >
                {a.correct ? "Correct" : "Incorrect"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
