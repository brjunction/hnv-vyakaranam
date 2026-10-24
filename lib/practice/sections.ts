// Each prakaraṇa has its OWN kinds of question (Sandhi is not Nāma, Nāma is not
// Ākhyāta), its own colour and its own icon. Client-safe: no database here.

export type QType = { key: string; label: string; /** Shown above the question while playing. */ verb: string };

export type PracticeSection = {
  slug: string;
  /** Short name used on cards. */
  short: string;
  deva: string;
  tagline: string;
  /** Accent colour for this section (cards, headers, chips). */
  color: string;
  /** lucide icon key — resolved in components/practice/icons.tsx */
  icon: "waves" | "layers" | "flame" | "target" | "link" | "puzzle" | "sprout" | "book";
  types: QType[];
};

const GENERAL: QType = { key: "mcq", label: "General question", verb: "Choose the answer" };
const SUTRA: QType = { key: "sutra", label: "Which sūtra applies?", verb: "Which sūtra applies?" };

export const SECTIONS: PracticeSection[] = [
  {
    slug: "samjna-sandhi-prakarana",
    short: "Saṁjñā & Sandhi",
    deva: "संज्ञा-सन्धि",
    tagline: "Terms, and how sounds join — vowel, consonant and visarga.",
    color: "#1f8a8a",
    icon: "waves",
    types: [
      { key: "sandhi", label: "Sandhi — join the words", verb: "Join these" },
      { key: "viccheda", label: "Sandhi-viccheda — split the word", verb: "Split this" },
      SUTRA,
    ],
  },
  {
    slug: "nama-prakarana",
    short: "Nāma",
    deva: "नाम",
    tagline: "Noun declension — endings, genders and the eight cases.",
    color: "#d9622b",
    icon: "layers",
    types: [
      { key: "nama-rupa", label: "Choose the correct form", verb: "Choose the correct form" },
      { key: "vibhakti", label: "Identify the case & number", verb: "Identify the case and number" },
      { key: "linga", label: "Identify the gender / ending", verb: "Identify the gender or ending" },
      SUTRA,
    ],
  },
  {
    slug: "akhyata-prakarana",
    short: "Ākhyāta",
    deva: "आख्यात",
    tagline: "Verb conjugation — roots, tenses, moods and persons.",
    color: "#4b5fc7",
    icon: "flame",
    types: [
      { key: "akhyata-rupa", label: "Choose the correct verb form", verb: "Choose the correct verb form" },
      { key: "lakara", label: "Identify the tense / mood", verb: "Identify the tense or mood" },
      { key: "dhatu", label: "Identify the root", verb: "Identify the root" },
      SUTRA,
    ],
  },
  {
    slug: "karaka-prakarana",
    short: "Kāraka",
    deva: "कारक",
    tagline: "Case meanings — who does what, to whom, with what.",
    color: "#2f8f5b",
    icon: "target",
    types: [
      { key: "karaka", label: "Identify the kāraka", verb: "Identify the kāraka" },
      { key: "vibhakti-arth", label: "Choose the right case", verb: "Choose the right case" },
      SUTRA,
    ],
  },
  {
    slug: "krdanta-prakarana",
    short: "Kṛdanta",
    deva: "कृदन्त",
    tagline: "Participles and words formed from roots.",
    color: "#8e4fa8",
    icon: "sprout",
    types: [
      { key: "krt-rupa", label: "Form the kṛdanta", verb: "Form the kṛdanta" },
      { key: "pratyaya", label: "Identify the pratyaya", verb: "Identify the pratyaya" },
      SUTRA,
    ],
  },
  {
    slug: "samasa-prakarana",
    short: "Samāsa",
    deva: "समास",
    tagline: "Compounds — joining words, and breaking them apart.",
    color: "#b7860b",
    icon: "link",
    types: [
      { key: "samasa", label: "Name the compound", verb: "Name the compound" },
      { key: "vigraha", label: "Split the compound (vigraha)", verb: "Split the compound" },
      SUTRA,
    ],
  },
  {
    slug: "taddhita-prakarana",
    short: "Taddhita",
    deva: "तद्धित",
    tagline: "Words built from nouns with secondary suffixes.",
    color: "#b4566f",
    icon: "puzzle",
    types: [
      { key: "taddhita-rupa", label: "Form the taddhita word", verb: "Form the taddhita word" },
      { key: "pratyaya", label: "Identify the pratyaya", verb: "Identify the pratyaya" },
      SUTRA,
    ],
  },
];

const FALLBACK: PracticeSection = {
  slug: "",
  short: "Practice",
  deva: "अभ्यास",
  tagline: "",
  color: "#c9a227",
  icon: "book",
  types: [GENERAL, SUTRA],
};

export function sectionFor(slug: string): PracticeSection {
  return SECTIONS.find((s) => s.slug === slug) ?? FALLBACK;
}

/** Kinds an editor may choose for questions of a chapter (the section's own, plus "general"). */
export function typesFor(slug: string): QType[] {
  const s = sectionFor(slug);
  return s.types.some((t) => t.key === "mcq") ? s.types : [...s.types, GENERAL];
}

const ALL: Record<string, QType> = {};
for (const t of [GENERAL, SUTRA, ...SECTIONS.flatMap((s) => s.types)]) ALL[t.key] = t;
export const allTypeKeys = Object.keys(ALL);

/** Label / prompt-verb for any stored type (unknown ones degrade gracefully). */
export const typeInfo = (key: string): QType => ALL[key] ?? GENERAL;
