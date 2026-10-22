"use client";

import { useMemo, useState } from "react";
import type { Question } from "@/lib/practiceData";
import { Check, X, Flame } from "lucide-react";

export type AnsweredQuestion = {
  question: Question;
  chosenIndex: number;
  correct: boolean;
};

export default function QuizRunner({
  questions,
  onFinish,
}: {
  questions: Question[];
  onFinish: (answers: AnsweredQuestion[]) => void;
}) {
  // Shuffle once per quiz, stable across re-renders.
  const shuffled = useMemo(() => [...questions].sort(() => Math.random() - 0.5), [questions]);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnsweredQuestion[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);

  const q = shuffled[index];

  let streak = 0;
  for (let i = answers.length - 1; i >= 0; i--) {
    if (answers[i].correct) streak++;
    else break;
  }

  function choose(i: number) {
    if (chosen !== null) return; // already answered this one
    setChosen(i);
  }

  function next() {
    if (chosen === null) return;
    const record: AnsweredQuestion = { question: q, chosenIndex: chosen, correct: chosen === q.correctIndex };
    const updated = [...answers, record];
    setAnswers(updated);
    setChosen(null);
    if (index + 1 < shuffled.length) {
      setIndex(index + 1);
    } else {
      onFinish(updated);
    }
  }

  const difficultyColor =
    q.difficulty === "easy" ? "var(--color-emerald, #4caf7d)" : q.difficulty === "medium" ? "var(--color-saffron)" : "var(--color-vermillion)";
  const justAnsweredCorrect = chosen !== null && chosen === q.correctIndex;

  return (
    <div className="anv-fade max-w-xl mx-auto">
      <div className="flex items-center justify-between text-sm text-[var(--fg-muted)] mb-3">
        <span>
          Question {index + 1} of {shuffled.length}
        </span>
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <span className="flex items-center gap-1 font-medium" style={{ color: "var(--color-vermillion)" }}>
              <Flame size={14} /> {streak}
            </span>
          )}
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium"
            style={{ borderColor: difficultyColor, color: difficultyColor }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: difficultyColor }} />
            {q.difficulty} · {q.type === "sandhi" ? "Sandhi" : "Sandhi-viccheda"}
          </span>
        </div>
      </div>

      {/* Segmented per-question progress bar */}
      <div className="flex gap-1 mb-8">
        {shuffled.map((_, i) => {
          const answered = answers[i];
          let bg = "var(--bg-2)";
          if (answered) bg = answered.correct ? "var(--color-emerald, #4caf7d)" : "var(--color-vermillion)";
          else if (i === index) bg = "var(--accent)";
          return <div key={i} className="h-1.5 flex-1 rounded-full transition-colors duration-300" style={{ background: bg }} />;
        })}
      </div>

      <div className="anv-card p-8 sm:p-10 text-center mb-6 shadow-sm">
        <p className="anv-label mb-4">{q.type === "sandhi" ? "Join these" : "Split this"}</p>
        <p className="font-devanagari text-3xl sm:text-5xl mb-3 leading-tight">{q.prompt}</p>
        {q.promptSub && <p className="italic text-[var(--fg-muted)]">{q.promptSub}</p>}
      </div>

      <div className="grid gap-3 mb-6">
        {q.options.map((opt, i) => {
          const isChosen = chosen === i;
          const isCorrect = i === q.correctIndex;
          const showState = chosen !== null;
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={chosen !== null}
              className={`flex items-center justify-between gap-3 px-5 py-4 rounded-xl border text-left font-devanagari text-lg transition-all ${
                showState && isCorrect
                  ? "border-[#4caf7d] bg-[#4caf7d]/10 scale-[1.02]"
                  : showState && isChosen && !isCorrect
                    ? "border-[var(--color-vermillion)] bg-[var(--color-vermillion)]/10"
                    : "border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-2)]"
              }`}
            >
              <span>{opt}</span>
              {showState && isCorrect && <Check size={20} className="text-[#4caf7d] shrink-0" />}
              {showState && isChosen && !isCorrect && <X size={20} className="text-[var(--color-vermillion)] shrink-0" />}
            </button>
          );
        })}
      </div>

      {chosen !== null && (
        <div
          className="anv-fade rounded-xl border p-5 mb-6"
          style={{
            borderColor: justAnsweredCorrect ? "#4caf7d" : "var(--color-vermillion)",
            background: justAnsweredCorrect ? "rgba(76,175,125,0.08)" : "color-mix(in srgb, var(--color-vermillion) 8%, transparent)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: justAnsweredCorrect ? "#4caf7d" : "var(--color-vermillion)" }}
          >
            {justAnsweredCorrect ? "Correct!" : "Not quite"}
          </p>
          <p className="text-sm leading-relaxed">{q.explanation}</p>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={next}
          disabled={chosen === null}
          className="px-8 py-3 rounded-full bg-[var(--accent)] text-[var(--color-ink)] font-medium hover:opacity-90 hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {index + 1 < shuffled.length ? "Next question" : "See results"}
        </button>
      </div>
    </div>
  );
}
