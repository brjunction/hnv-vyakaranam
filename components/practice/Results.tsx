"use client";

import type { AnsweredQuestion } from "@/components/practice/QuizRunner";
import { Download, RotateCcw, Trophy } from "lucide-react";

function commentFor(pct: number): string {
  if (pct === 100) return "Perfect score! Every sandhi rule applied correctly.";
  if (pct >= 80) return "Excellent work — you clearly know these rules well.";
  if (pct >= 60) return "Good effort. A little more review and this will stick.";
  if (pct >= 40) return "A fair start — go back over the explanations and try again.";
  return "Worth another pass — review each explanation below, then retry.";
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
}: {
  answers: AnsweredQuestion[];
  onRetry: () => void;
}) {
  const correct = answers.filter((a) => a.correct).length;
  const pct = Math.round((correct / answers.length) * 100);

  function download() {
    const blob = new Blob([toCsv(answers)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sandhi-practice-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="anv-fade max-w-2xl mx-auto text-center">
      <Trophy size={40} className="mx-auto mb-4 text-[var(--accent)]" />
      <p className="anv-label mb-2">Practice complete</p>
      <p className="text-5xl font-semibold mb-2 sutra-number">
        {correct} / {answers.length}
      </p>
      <p className="text-2xl text-[var(--accent)] font-medium mb-4">{pct}%</p>
      <p className="text-[var(--fg-muted)] mb-10 max-w-md mx-auto">{commentFor(pct)}</p>

      <div className="flex flex-wrap justify-center gap-3 mb-12">
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--accent)] text-[var(--color-ink)] font-medium hover:opacity-90 transition-opacity"
        >
          <RotateCcw size={18} /> Practice again
        </button>
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
                  {a.question.difficulty} · {a.question.type === "sandhi" ? "Sandhi" : "Sandhi-viccheda"}
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
