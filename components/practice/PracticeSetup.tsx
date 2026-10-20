"use client";

import { useState } from "react";
import { PRACTICE_CHAPTERS, type Difficulty, type PracticeType, questionsFor } from "@/lib/practiceData";
import { Sparkles, Flame, Leaf, Gauge, ArrowRight, Lock } from "lucide-react";

type Props = {
  onStart: (opts: { topicSlug: string | "all"; difficulty: Difficulty | "all"; type: PracticeType | "all" }) => void;
};

const DIFFICULTIES: { key: Difficulty | "all"; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "all", label: "All levels", icon: <Sparkles size={18} />, color: "var(--accent)" },
  { key: "easy", label: "Easy", icon: <Leaf size={18} />, color: "#4caf7d" },
  { key: "medium", label: "Medium", icon: <Gauge size={18} />, color: "var(--color-saffron)" },
  { key: "hard", label: "Hard", icon: <Flame size={18} />, color: "var(--color-vermillion)" },
];

export default function PracticeSetup({ onStart }: Props) {
  const [chapterSlug, setChapterSlug] = useState<string | null>(null);
  const chapter = PRACTICE_CHAPTERS.find((c) => c.slug === chapterSlug);

  const [topicSlug, setTopicSlug] = useState<string | "all">("all");
  const [type, setType] = useState<PracticeType | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");

  // Step 1: choose a chapter
  if (!chapter) {
    return (
      <div className="anv-fade">
        <p className="anv-label mb-4 text-center">Step 1 of 3</p>
        <h2 className="text-2xl font-semibold text-center mb-8">Choose a chapter to practice</h2>
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {PRACTICE_CHAPTERS.map((c) => (
            <button
              key={c.slug}
              disabled={!c.available}
              onClick={() => setChapterSlug(c.slug)}
              className={`anv-card p-6 text-left relative ${!c.available ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <p className="anv-label mb-2">{c.titleEn}</p>
              <p className="font-devanagari text-xl">{c.title}</p>
              {!c.available && (
                <span className="absolute top-4 right-4 flex items-center gap-1 text-xs text-[var(--fg-muted)]">
                  <Lock size={12} /> Coming soon
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: choose a topic (subchapter), sandhi/viccheda, and difficulty.
  return (
    <div className="anv-fade">
      <button onClick={() => setChapterSlug(null)} className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)] mb-6">
        ← Choose a different chapter
      </button>

      <p className="anv-label mb-4 text-center">Step 2 of 3</p>
      <h2 className="text-2xl font-semibold text-center mb-2">Pick a topic</h2>
      <p className="text-center text-[var(--fg-muted)] mb-8">{chapter.title}</p>

      <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto mb-10">
        <button
          onClick={() => setTopicSlug("all")}
          className={`anv-card p-5 text-left ${topicSlug === "all" ? "border-[var(--accent)]" : ""}`}
        >
          <p className="font-medium">All topics mixed</p>
          <p className="text-sm text-[var(--fg-muted)]">Every topic in this chapter, shuffled together</p>
        </button>
        {chapter.topics.map((t) => (
          <button
            key={t.slug}
            onClick={() => setTopicSlug(t.slug)}
            className={`anv-card p-5 text-left ${topicSlug === t.slug ? "border-[var(--accent)]" : ""}`}
          >
            <p className="font-devanagari font-medium text-lg">{t.title}</p>
            <p className="text-sm text-[var(--fg-muted)]">{t.subtitle}</p>
          </button>
        ))}
      </div>

      <p className="anv-label mb-4 text-center">Sandhi or Sandhi-viccheda?</p>
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {(
          [
            { key: "all", label: "Both" },
            { key: "sandhi", label: "Sandhi (join)" },
            { key: "viccheda", label: "Sandhi-viccheda (split)" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setType(opt.key)}
            className={`px-4 py-2 rounded-full border text-sm transition-colors ${
              type === opt.key
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--color-ink)]"
                : "border-[var(--border)] hover:border-[var(--accent)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="anv-label mb-4 text-center">Step 3 of 3 — difficulty</p>
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.key}
            onClick={() => setDifficulty(d.key)}
            style={{ borderColor: difficulty === d.key ? d.color : undefined, color: difficulty === d.key ? d.color : undefined }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-colors ${
              difficulty === d.key ? "" : "border-[var(--border)] hover:border-[var(--accent)]"
            }`}
          >
            {d.icon}
            {d.label}
          </button>
        ))}
      </div>

      <div className="text-center">
        <p className="text-sm text-[var(--fg-muted)] mb-4">
          {questionsFor(topicSlug, difficulty).filter((q) => type === "all" || q.type === type).length} question
          {questionsFor(topicSlug, difficulty).filter((q) => type === "all" || q.type === type).length === 1 ? "" : "s"}{" "}
          ready for this selection
        </p>
        <button
          onClick={() => onStart({ topicSlug, difficulty, type })}
          disabled={questionsFor(topicSlug, difficulty).filter((q) => type === "all" || q.type === type).length === 0}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[var(--accent)] text-[var(--color-ink)] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Start practice <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
