// Practice types. The questions themselves live in Neon (practice_topics,
// practice_questions) and are edited in Admin › Practice; the public page
// loads them through lib/data/practice.ts. (This file used to hold the
// question bank; it was moved to the database on 2026-10-23.)

export type Difficulty = "easy" | "medium" | "hard";
export type PracticeType = "sandhi" | "viccheda"; // join vs split

export type Topic = {
  /** Unique key across chapters (the topic id). */
  slug: string;
  /** The topic's own slug, used to pick an icon. */
  icon: string;
  title: string;
  subtitle: string;
};

export type Question = {
  id: string;
  /** = Topic.slug */
  topicSlug: string;
  difficulty: Difficulty;
  type: PracticeType;
  prompt: string;
  promptSub?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sutraRefs: string[];
};

export type PracticeChapter = {
  slug: string;
  number: number | null;
  title: string;
  titleEn: string;
  topics: Topic[];
  available: boolean;
  isMisc?: boolean;
};

export type GameTeaser = { slug: string; title: string; titleEn: string; href?: string };
export const GAME_TEASERS: GameTeaser[] = [
  { slug: "rama-ravana", title: "Rāma–Rāvaṇa battle", titleEn: "Answer the Sandhi before the arrow lands", href: "/practice/games/rama-ravana" },
  { slug: "sandhi-match", title: "Sandhi Match", titleEn: "Flip and pair every Sandhi, against the clock", href: "/practice/games/sandhi-match" },
  { slug: "nama-games", title: "Nāma Games", titleEn: "Declension drills, gamified" },
  { slug: "dhatu-games", title: "Dhātu Games", titleEn: "Root & conjugation challenges" },
];

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Same question with its options in a random order (correctIndex follows). */
export function shuffleOptions(q: Question): Question {
  const order = shuffle(q.options.map((_, i) => i));
  return { ...q, options: order.map((i) => q.options[i]), correctIndex: order.indexOf(q.correctIndex) };
}
