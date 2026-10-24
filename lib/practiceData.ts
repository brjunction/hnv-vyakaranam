// Practice types. The questions themselves live in Neon (practice_topics,
// practice_questions) and are edited in Admin › Practice; the public page
// loads them through lib/data/practice.ts. (This file used to hold the
// question bank; it was moved to the database on 2026-10-23.)

export type Difficulty = "easy" | "medium" | "hard";
/** Kind of question — each prakaraṇa has its own (see lib/practice/sections.ts). */
export type PracticeType = string;

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
  /** Slug of the prakaraṇa (chapter) this question belongs to. */
  chapter: string;
  difficulty: Difficulty;
  type: PracticeType;
  prompt: string;
  promptSub?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sutraRefs: string[];
  /** The sūtras named in sutraRefs, with their text (Madhyama numbers), when found. */
  sutras?: { number: string; sanskrit: string; iast: string; translation: string }[];
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
