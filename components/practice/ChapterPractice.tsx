"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Flame, Gauge, Leaf, Shuffle, Sparkles } from "lucide-react";
import QuizRunner, { type AnsweredQuestion } from "@/components/practice/QuizRunner";
import Results from "@/components/practice/Results";
import { SectionIcon } from "@/components/practice/icons";
import { sectionFor, typeInfo } from "@/lib/practice/sections";
import type { Difficulty, Question } from "@/lib/practiceData";

// One prakaraṇa: pick a topic and a level — a single click starts the quiz.

type Topic = { slug: string; title: string; subtitle: string };
type Stage = { step: "pick" } | { step: "quiz"; qs: Question[]; label: string; run: number } | { step: "results"; answers: AnsweredQuestion[]; qs: Question[]; label: string };

const LEVELS: { key: Difficulty; label: string; icon: typeof Leaf; color: string }[] = [
  { key: "easy", label: "Easy", icon: Leaf, color: "#2f8f5b" },
  { key: "medium", label: "Medium", icon: Gauge, color: "#d9622b" },
  { key: "hard", label: "Hard", icon: Flame, color: "#b3341a" },
];

export default function ChapterPractice({ slug, title, titleEn, topics, questions }: { slug: string; title: string; titleEn: string; topics: Topic[]; questions: Question[] }) {
  const sec = sectionFor(slug);
  const [stage, setStage] = useState<Stage>({ step: "pick" });
  const [kind, setKind] = useState<string>("all");

  const kinds = useMemo(() => [...new Set(questions.map((q) => q.type))], [questions]);
  const pool = kind === "all" ? questions : questions.filter((q) => q.type === kind);
  const count = (topic: string | null, level: Difficulty | null) =>
    pool.filter((q) => (topic === null || q.topicSlug === topic) && (level === null || q.difficulty === level)).length;

  function start(topic: Topic | null, level: Difficulty | null) {
    const qs = pool.filter((q) => (!topic || q.topicSlug === topic.slug) && (!level || q.difficulty === level));
    if (!qs.length) return;
    setStage({ step: "quiz", qs, label: `${topic ? topic.title : "All topics"} · ${level ?? "all levels"}`, run: Date.now() });
  }

  if (stage.step === "quiz") {
    return (
      <div className="mx-auto max-w-3xl px-5 py-6 sm:py-8">
        <button onClick={() => setStage({ step: "pick" })} className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]">
          <ArrowLeft size={15} /> {sec.short} · {stage.label}
        </button>
        <QuizRunner key={stage.run} questions={stage.qs} color={sec.color} onFinish={(answers) => setStage({ step: "results", answers, qs: stage.qs, label: stage.label })} />
      </div>
    );
  }
  if (stage.step === "results") {
    const prev = stage;
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <Results answers={stage.answers} color={sec.color} onRetry={() => setStage({ step: "quiz", qs: prev.qs, label: prev.label, run: Date.now() })} onBack={() => setStage({ step: "pick" })} />
      </div>
    );
  }

  return (
    <div>
      <header className="pq-hero" style={{ ["--c" as string]: sec.color }}>
        <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
          <Link href="/practice" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
            <ArrowLeft size={15} /> All practice
          </Link>
          <div className="mt-5 flex items-center gap-4">
            <span className="pq-icon grid h-16 w-16 flex-none place-items-center rounded-2xl bg-white/15 text-white backdrop-blur">
              <SectionIcon name={sec.icon} size={32} />
            </span>
            <div>
              <h1 className="font-devanagari text-3xl leading-tight text-white sm:text-4xl">{title}</h1>
              <p className="text-white/85">{titleEn}</p>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-sm text-white/80">Pick a topic and a level — one tap and you are playing. Every answer shows its sūtra.</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8">
        {kinds.length > 1 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Kind</span>
            {["all", ...kinds].map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className="rounded-full border px-3.5 py-1.5 text-sm transition-colors"
                style={kind === k ? { background: sec.color, color: "#fff", borderColor: sec.color } : { borderColor: "var(--border)" }}
              >
                {k === "all" ? "All kinds" : typeInfo(k).label.split(" — ")[0]}
              </button>
            ))}
          </div>
        )}

        {questions.length === 0 && (
          <div className="mb-6 rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
            <p className="font-semibold">Questions for {sec.short} are being added.</p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">They appear here the moment they are published. Meanwhile, the other prakaraṇas are open — and so are the games.</p>
            <Link href="/practice" className="mt-3 inline-block text-sm font-medium" style={{ color: sec.color }}>← Back to all practice</Link>
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <TopicTile idx={0} color={sec.color} icon={<Shuffle size={18} />} title="All topics mixed" sub={`Every topic in ${sec.short}, shuffled together`} count={count} start={start} topic={null} />
          {topics.map((t, i) => (
            <TopicTile key={t.slug} idx={i + 1} color={sec.color} icon={<Sparkles size={18} />} title={t.title} sub={t.subtitle} count={count} start={start} topic={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TopicTile({ topic, title, sub, icon, color, idx, count, start }: { topic: Topic | null; title: string; sub: string; icon: React.ReactNode; color: string; idx: number; count: (t: string | null, l: Difficulty | null) => number; start: (t: Topic | null, l: Difficulty | null) => void }) {
  const total = count(topic?.slug ?? null, null);
  return (
    <article className="pq-tile pq-in" style={{ ["--c" as string]: color, animationDelay: `${idx * 70}ms` }}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl text-white" style={{ background: color }}>{icon}</span>
        <div className="min-w-0">
          <h2 className="font-devanagari text-xl leading-snug">{title}</h2>
          {sub && <p className="text-sm text-[var(--fg-muted)]">{sub}</p>}
        </div>
        <span className="ml-auto text-xs tabular-nums text-[var(--fg-muted)]">{total} Q</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {LEVELS.map((l) => {
          const n = count(topic?.slug ?? null, l.key);
          return (
            <button key={l.key} disabled={!n} onClick={() => start(topic, l.key)} className="pq-level" style={{ ["--lc" as string]: l.color }}>
              <l.icon size={16} />
              <span className="text-sm font-semibold">{l.label}</span>
              <span className="text-[11px] opacity-70">{n ? `${n} questions` : "—"}</span>
            </button>
          );
        })}
      </div>
      <button disabled={!total} onClick={() => start(topic, null)} className="mt-3 w-full text-center text-sm font-medium hover:underline disabled:opacity-40" style={{ color }}>
        Mix all levels →
      </button>
    </article>
  );
}
