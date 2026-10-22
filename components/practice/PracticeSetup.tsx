"use client";

import { useState } from "react";
import {
  PRACTICE_CHAPTERS,
  MISC_CHAPTER,
  GAME_TEASERS,
  type PracticeChapter,
  type Difficulty,
  type PracticeType,
  questionsFor,
} from "@/lib/practiceData";
import {
  Sparkles,
  Flame,
  Leaf,
  Gauge,
  ArrowRight,
  Lock,
  Shuffle,
  Gamepad2,
  Droplets,
  MessageSquareText,
  Wind,
} from "lucide-react";

type Props = {
  onStart: (opts: { topicSlug: string | "all"; difficulty: Difficulty | "all"; type: PracticeType | "all" }) => void;
};

const DIFFICULTIES: { key: Difficulty | "all"; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "all", label: "All levels", icon: <Sparkles size={18} />, color: "var(--accent)" },
  { key: "easy", label: "Easy", icon: <Leaf size={18} />, color: "var(--success)" },
  { key: "medium", label: "Medium", icon: <Gauge size={18} />, color: "var(--color-saffron)" },
  { key: "hard", label: "Hard", icon: <Flame size={18} />, color: "var(--color-vermillion)" },
];

const TOPIC_ICONS: Record<string, React.ReactNode> = {
  "vowel-sandhi": <Droplets size={18} />,
  "consonant-sandhi": <MessageSquareText size={18} />,
  "visarga-sandhi": <Wind size={18} />,
};

function ChapterCard({
  chapter,
  onSelect,
}: {
  chapter: PracticeChapter;
  onSelect: (slug: string) => void;
}) {
  const isMisc = !!chapter.isMisc;
  return (
    <button
      disabled={!chapter.available}
      onClick={() => onSelect(chapter.slug)}
      className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 ${
        chapter.available
          ? "border-[var(--border)] hover:-translate-y-0.5 hover:shadow-lg hover:border-[var(--accent)] cursor-pointer"
          : "border-[var(--border)] opacity-55 cursor-not-allowed"
      }`}
    >
      <span
        className={`absolute top-0 left-0 right-0 h-1 origin-left scale-x-0 transition-transform duration-300 ${
          chapter.available ? "group-hover:scale-x-100" : ""
        }`}
        style={{
          background: isMisc
            ? "linear-gradient(90deg, var(--color-vermillion), var(--color-saffron), var(--color-gold))"
            : "var(--accent)",
        }}
      />
      <div className="flex items-start justify-between gap-3 mb-3">
        <span
          className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold shrink-0 ${
            chapter.available ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "bg-[var(--bg-2)] text-[var(--fg-muted)]"
          }`}
        >
          {isMisc ? <Shuffle size={16} /> : chapter.number ?? "—"}
        </span>
        {chapter.available ? (
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
            {chapter.topics.length} topic{chapter.topics.length === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[var(--bg-2)] text-[var(--fg-muted)]">
            <Lock size={11} /> Soon
          </span>
        )}
      </div>
      <p className="anv-label mb-1">{chapter.titleEn}</p>
      <p className="font-devanagari text-lg leading-snug">{chapter.title}</p>
    </button>
  );
}

export default function PracticeSetup({ onStart }: Props) {
  const [chapterSlug, setChapterSlug] = useState<string | null>(null);
  const chapter =
    chapterSlug === MISC_CHAPTER.slug
      ? MISC_CHAPTER
      : PRACTICE_CHAPTERS.find((c) => c.slug === chapterSlug) ?? null;

  const [topicSlug, setTopicSlug] = useState<string | "all">("all");
  const [type, setType] = useState<PracticeType | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");

  // Step 1: choose a chapter
  if (!chapter) {
    return (
      <div className="anv-fade">
        <p className="anv-label mb-4 text-center">Step 1 of 3</p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-2">Choose a chapter to practice</h2>
        <p className="text-center text-[var(--fg-muted)] mb-8 max-w-md mx-auto">
          The full HNV curriculum is listed below. Locked chapters are coming soon — Sandhi is ready now.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-14">
          <ChapterCard chapter={MISC_CHAPTER} onSelect={setChapterSlug} />
          {PRACTICE_CHAPTERS.map((c) => (
            <ChapterCard key={c.slug} chapter={c} onSelect={setChapterSlug} />
          ))}
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4 justify-center">
            <Gamepad2 size={20} className="text-[var(--accent)]" />
            <p className="anv-label">Games</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {GAME_TEASERS.map((g) => (
              <div
                key={g.slug}
                className="relative rounded-2xl border border-dashed border-[var(--border)] p-5 opacity-70"
              >
                <span className="absolute top-4 right-4 flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[var(--bg-2)] text-[var(--fg-muted)]">
                  <Lock size={11} /> Coming soon
                </span>
                <p className="font-medium mb-1">{g.title}</p>
                <p className="text-sm text-[var(--fg-muted)]">{g.titleEn}</p>
              </div>
            ))}
          </div>
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
      <p className="text-center text-[var(--fg-muted)] mb-8 font-devanagari text-lg">{chapter.title}</p>

      <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto mb-10">
        <button
          onClick={() => setTopicSlug("all")}
          className={`rounded-2xl border p-5 text-left transition-colors ${
            topicSlug === "all" ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] hover:border-[var(--accent)]"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-[var(--accent)]" />
            <p className="font-medium">All topics mixed</p>
          </div>
          <p className="text-sm text-[var(--fg-muted)]">Every topic here, shuffled together</p>
        </button>
        {chapter.topics.map((t) => (
          <button
            key={t.slug}
            onClick={() => setTopicSlug(t.slug)}
            className={`rounded-2xl border p-5 text-left transition-colors ${
              topicSlug === t.slug ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] hover:border-[var(--accent)]"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[var(--accent)]">{TOPIC_ICONS[t.slug] ?? <Sparkles size={18} />}</span>
              <p className="font-devanagari font-medium text-lg">{t.title}</p>
            </div>
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
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${
              difficulty === d.key ? "scale-105" : "border-[var(--border)] hover:border-[var(--accent)]"
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
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] font-medium hover:opacity-90 hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          Start practice <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
