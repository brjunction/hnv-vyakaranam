"use client";

import { useMemo, useState } from "react";
import type { Question } from "@/lib/practiceData";
import { Check, X } from "lucide-react";

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
  const progress = ((index + (chosen !== null ? 1 : 0)) / shuffled.length) * 100;

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
    q.difficulty === "easy" ? "#4caf7d" : q.difficulty === "medium" ? "var(--color-saffron)" : "var(--color-vermillion)";

  return (
    <div className="anv-fade max-w-xl mx-auto">
      <div className="flex items-center justify-between text-sm text-[var(--fg-muted)] mb-3">
        <span>
          Question {index + 1} of {shuffled.length}
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: difficultyColor }} />
          {q.difficulty} · {q.type === "sandhi" ? "Sandhi" : "Sandhi-viccheda"}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-2)] overflow-hidden mb-8">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="anv-card p-8 text-center mb-6">
        <p className="anv-label mb-4">{q.type === "sandhi" ? "Join these" : "Split this"}</p>
        <p className="font-devanagari text-3xl sm:text-4xl mb-2">{q.prompt}</p>
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
              className={`flex items-center justify-between gap-3 px-5 py-4 rounded-xl border text-left font-devanagari text-lg transition-colors ${
                showState && isCorrect
                  ? "border-[#4caf7d] bg-[#4caf7d]/10"
                  : showState && isChosen && !isCorrect
                    ? "border-[var(--color-vermillion)] bg-[var(--color-vermillion)]/10"
                    : "border-[var(--border)] hover:border-[var(--accent)]"
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
        <div className="anv-fade rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-5 mb-6">
          <p className="text-sm leading-relaxed">{q.explanation}</p>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={next}
          disabled={chosen === null}
          className="px-8 py-3 rounded-full bg-[var(--accent)] text-[var(--color-ink)] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {index + 1 < shuffled.length ? "Next question" : "See results"}
        </button>
      </div>
    </div>
  );
}
