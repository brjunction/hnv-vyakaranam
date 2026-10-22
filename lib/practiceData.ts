// Practice content for the Sandhi practice engine.
//
// CORRECTED per HNV-Wiki: Saṁjñā (sutras 1-40, terminology/naming) is NOT
// a sandhi topic — it's a separate category within the same chapter.
// Sandhi proper (sutras 41-86) has exactly three real types, each with its
// own HNV name (see public/hnv-wiki.html, "Chapter 1B — Sandhi"):
//
//   Vowel Sandhi      sutras 42-60   HNV name: Sarveśvara-sandhi
//   Consonant Sandhi  sutras 61-78   HNV name: Viṣṇujana-sandhi
//   Visarga Sandhi    sutras 79-86   HNV name: Viṣṇusarga-sandhi
//
// Every question below is built from a real sutra + a real worked example
// taken directly from the HNV-Wiki's own example tables for that section,
// not invented — the sutra number cited in each question's explanation is
// the one the wiki cites for that exact example.

export type Difficulty = "easy" | "medium" | "hard";
export type PracticeType = "sandhi" | "viccheda"; // join vs split

export type Topic = {
  slug: string;
  title: string;
  subtitle: string;
};

export const SANDHI_TOPICS: Topic[] = [
  { slug: "vowel-sandhi", title: "Sarveśvara-sandhi", subtitle: "Vowel Sandhi — sutras 41-60" },
  { slug: "consonant-sandhi", title: "Viṣṇujana-sandhi", subtitle: "Consonant Sandhi — sutras 61-78" },
  { slug: "visarga-sandhi", title: "Viṣṇusarga-sandhi", subtitle: "Visarga Sandhi — sutras 79-86" },
];

export type Question = {
  id: string;
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

export const QUESTIONS: Question[] = [
  // ============ Vowel Sandhi (Sarveśvara-sandhi), sutras 42-55 ============
  {
    id: "v1", topicSlug: "vowel-sandhi", difficulty: "easy", type: "sandhi",
    prompt: "राम + अर्जुन", promptSub: "rāma + arjuna",
    options: ["रामार्जुन", "रामेऽर्जुन", "रामोऽर्जुन", "रामाअर्जुन"],
    correctIndex: 0,
    explanation: "Sutra 42: a + a → ā. rāma + arjuna → rāmārjuna.",
    sutraRefs: ["42"],
  },
  {
    id: "v2", topicSlug: "vowel-sandhi", difficulty: "easy", type: "sandhi",
    prompt: "महा + आत्मा", promptSub: "mahā + ātmā",
    options: ["महात्मा", "महाआत्मा", "महैत्मा", "महोत्मा"],
    correctIndex: 0,
    explanation: "Sutra 42: ā + ā → ā. mahā + ātmā → mahātmā.",
    sutraRefs: ["42"],
  },
  {
    id: "v3", topicSlug: "vowel-sandhi", difficulty: "easy", type: "sandhi",
    prompt: "राम + इन्द्र", promptSub: "rāma + indra",
    options: ["रामेन्द्र", "रामइन्द्र", "रामीन्द्र", "रामयिन्द्र"],
    correctIndex: 0,
    explanation: "Sutra 43: a + i → e. rāma + indra → rāmendra.",
    sutraRefs: ["43"],
  },
  {
    id: "v4", topicSlug: "vowel-sandhi", difficulty: "medium", type: "sandhi",
    prompt: "महा + ईश्वर", promptSub: "mahā + īśvara",
    options: ["महेश्वर", "महाईश्वर", "महैश्वर", "महीश्वर"],
    correctIndex: 0,
    explanation: "Sutra 43: a/ā + i/ī → e, regardless of the vowel's length. mahā + īśvara → maheśvara.",
    sutraRefs: ["43"],
  },
  {
    id: "v5", topicSlug: "vowel-sandhi", difficulty: "easy", type: "sandhi",
    prompt: "राम + उदय", promptSub: "rāma + udaya",
    options: ["रामोदय", "रामउदय", "रामूदय", "रामावुदय"],
    correctIndex: 0,
    explanation: "Sutra 44: a + u → o. rāma + udaya → rāmodaya.",
    sutraRefs: ["44"],
  },
  {
    id: "v6", topicSlug: "vowel-sandhi", difficulty: "medium", type: "viccheda",
    prompt: "महोर्जा", promptSub: "mahorjā",
    options: ["महा + ऊर्जा", "महा + उर्जा", "मही + ऊर्जा", "महस् + ऊर्जा"],
    correctIndex: 0,
    explanation: "Sutra 44: a/ā + u/ū → o. Split mahorjā back: mahā + ūrjā.",
    sutraRefs: ["44"],
  },
  {
    id: "v7", topicSlug: "vowel-sandhi", difficulty: "medium", type: "sandhi",
    prompt: "देव + ऋषि", promptSub: "deva + ṛṣi",
    options: ["देवर्षि", "देवऋषि", "देवार्षि", "देविर्षि"],
    correctIndex: 0,
    explanation: "Sutra 45: a + ṛ → ar. deva + ṛṣi → devarṣi.",
    sutraRefs: ["45"],
  },
  {
    id: "v8", topicSlug: "vowel-sandhi", difficulty: "medium", type: "sandhi",
    prompt: "राम + एकः", promptSub: "rāma + ekaḥ",
    options: ["रामैकः", "रामेकः", "रामाएकः", "रामयेकः"],
    correctIndex: 0,
    explanation: "Sutra 46: a + e → ai. rāma + ekaḥ → rāmaikaḥ.",
    sutraRefs: ["46"],
  },
  {
    id: "v9", topicSlug: "vowel-sandhi", difficulty: "hard", type: "viccheda",
    prompt: "महौषधि", promptSub: "mahauṣadhi",
    options: ["महा + ओषधि", "महा + औषधि", "मही + ओषधि", "मह + औषधि"],
    correctIndex: 0,
    explanation: "Sutra 47: a/ā + o → au. Split mahauṣadhi back: mahā + oṣadhi.",
    sutraRefs: ["47"],
  },
  {
    id: "v10", topicSlug: "vowel-sandhi", difficulty: "hard", type: "sandhi",
    prompt: "गोपि + अत्र", promptSub: "gopi + atra",
    options: ["गोप्यत्र", "गोपिअत्र", "गोपेत्र", "गोप्यात्र"],
    correctIndex: 0,
    explanation: "Sutra 50: i/ī is replaced by y before a following vowel. gopi + atra → gopyatra.",
    sutraRefs: ["50"],
  },
  {
    id: "v11", topicSlug: "vowel-sandhi", difficulty: "hard", type: "sandhi",
    prompt: "मधु + अरि", promptSub: "madhu + ari",
    options: ["मध्वरि", "मधुअरि", "मधोरि", "मध्वारि"],
    correctIndex: 0,
    explanation: "Sutra 51: u/ū is replaced by v before a following vowel. madhu + ari → madhvari.",
    sutraRefs: ["51"],
  },
  {
    id: "v12", topicSlug: "vowel-sandhi", difficulty: "hard", type: "sandhi",
    prompt: "पितृ + आदौ", promptSub: "pitṛ + ādau",
    options: ["पित्रादौ", "पितृआदौ", "पितरादौ", "पित्रआदौ"],
    correctIndex: 0,
    explanation: "Sutra 52: ṛ/ṝ is replaced by r before a following vowel. pitṛ + ādau → pitrādau.",
    sutraRefs: ["52"],
  },

  // ============ Consonant Sandhi (Viṣṇujana-sandhi), sutras 61-73 ============
  {
    id: "c1", topicSlug: "consonant-sandhi", difficulty: "easy", type: "sandhi",
    prompt: "वाक् + देव", promptSub: "vāk + deva",
    options: ["वाग्देव", "वाक्देव", "वागदेव", "वाग्धेव"],
    correctIndex: 0,
    explanation: "Sutra 61: a voiceless stop becomes voiced before a voiced sound. vāk + deva → vāgdeva.",
    sutraRefs: ["61"],
  },
  {
    id: "c2", topicSlug: "consonant-sandhi", difficulty: "medium", type: "sandhi",
    prompt: "भगवत् + भ्याम्", promptSub: "bhagavat + bhyām",
    options: ["भगवद्भ्याम्", "भगवत्भ्याम्", "भगवध्भ्याम्", "भगवत्त्भ्याम्"],
    correctIndex: 0,
    explanation: "Sutra 61: t → d before a voiced sound. bhagavat + bhyām → bhagavadbhyām.",
    sutraRefs: ["61"],
  },
  {
    id: "c3", topicSlug: "consonant-sandhi", difficulty: "hard", type: "sandhi",
    prompt: "वाक् + नरः", promptSub: "vāk + naraḥ",
    options: ["वाङ्नरः", "वाक्नरः", "वाग्नरः", "वाङ्क्नरः"],
    correctIndex: 0,
    explanation: "Sutra 62: a stop may optionally become the nasal of its own class before a following nasal. vāk + naraḥ → vāṅnaraḥ.",
    sutraRefs: ["62"],
  },
  {
    id: "c4", topicSlug: "consonant-sandhi", difficulty: "hard", type: "viccheda",
    prompt: "तच्छ्रुत्वा", promptSub: "tacchrutvā",
    options: ["तत् + श्रुत्वा", "तच् + श्रुत्वा", "तद् + श्रुत्वा", "त + च्छ्रुत्वा"],
    correctIndex: 0,
    explanation: "Sutra 64: ś may optionally become ch after a stop. Split tacchrutvā back: tat + śrutvā.",
    sutraRefs: ["64"],
  },
  {
    id: "c5", topicSlug: "consonant-sandhi", difficulty: "easy", type: "sandhi",
    prompt: "कृष्णम् + नमामि", promptSub: "kṛṣṇam + namāmi",
    options: ["कृष्णं नमामि", "कृष्णम्नमामि", "कृष्णन्नमामि", "कृष्ण नमामि"],
    correctIndex: 0,
    explanation: "Sutra 72: final m becomes anusvāra (ṃ) before a following consonant. kṛṣṇam + namāmi → kṛṣṇaṃ namāmi.",
    sutraRefs: ["72"],
  },
  {
    id: "c6", topicSlug: "consonant-sandhi", difficulty: "medium", type: "sandhi",
    prompt: "सं + गच्छति", promptSub: "saṃ + gacchati",
    options: ["सङ्गच्छति", "संगच्छति", "सन्गच्छति", "सग्गच्छति"],
    correctIndex: 0,
    explanation: "Sutra 73: anusvāra becomes the nasal of the following consonant's class (here, the guttural class before g). saṃ + gacchati → saṅgacchati.",
    sutraRefs: ["73"],
  },
  {
    id: "c7", topicSlug: "consonant-sandhi", difficulty: "medium", type: "sandhi",
    prompt: "सं + तोष", promptSub: "saṃ + toṣa",
    options: ["सन्तोष", "संतोष", "सङ्तोष", "सत्तोष"],
    correctIndex: 0,
    explanation: "Sutra 73: anusvāra becomes the nasal of the following consonant's class (here, the dental class before t). saṃ + toṣa → santoṣa.",
    sutraRefs: ["73"],
  },

  // ============ Visarga Sandhi (Viṣṇusarga-sandhi), sutras 79-86 ============
  {
    id: "s1", topicSlug: "visarga-sandhi", difficulty: "easy", type: "sandhi",
    prompt: "रामः + च", promptSub: "rāmaḥ + ca",
    options: ["रामश्च", "रामःच", "रामस्च", "रामाश्च"],
    correctIndex: 0,
    explanation: "Sutra 79: visarga becomes ś before ca/cha. rāmaḥ + ca → rāmaśca.",
    sutraRefs: ["79"],
  },
  {
    id: "s2", topicSlug: "visarga-sandhi", difficulty: "medium", type: "sandhi",
    prompt: "रामः + टीका", promptSub: "rāmaḥ + ṭīkā",
    options: ["रामष्टीका", "रामःटीका", "रामश्टीका", "रामस्टीका"],
    correctIndex: 0,
    explanation: "Sutra 79: visarga becomes ṣ before ṭa/ṭha. rāmaḥ + ṭīkā → rāmaṣṭīkā.",
    sutraRefs: ["79"],
  },
  {
    id: "s3", topicSlug: "visarga-sandhi", difficulty: "easy", type: "sandhi",
    prompt: "रामः + तरति", promptSub: "rāmaḥ + tarati",
    options: ["रामस्तरति", "रामःतरति", "रामश्तरति", "रामत्तरति"],
    correctIndex: 0,
    explanation: "Sutra 79: visarga becomes s before ta/tha. rāmaḥ + tarati → rāmastarati.",
    sutraRefs: ["79"],
  },
  {
    id: "s4", topicSlug: "visarga-sandhi", difficulty: "easy", type: "sandhi",
    prompt: "रामः + गच्छति", promptSub: "rāmaḥ + gacchati",
    options: ["रामो गच्छति", "रामःगच्छति", "रामॐगच्छति", "रामगच्छति"],
    correctIndex: 0,
    explanation: "Sutra 80: visarga after a becomes u (written as o) before a or a voiced sound. rāmaḥ + gacchati → rāmo gacchati.",
    sutraRefs: ["80"],
  },
  {
    id: "s5", topicSlug: "visarga-sandhi", difficulty: "medium", type: "sandhi",
    prompt: "रामः + अस्ति", promptSub: "rāmaḥ + asti",
    options: ["रामोऽस्ति", "रामःअस्ति", "राम अस्ति", "रामाअस्ति"],
    correctIndex: 0,
    explanation: "Sutra 80: visarga after a becomes o before a, and the a is marked with an avagraha (ऽ). rāmaḥ + asti → rāmo'sti.",
    sutraRefs: ["80"],
  },
  {
    id: "s6", topicSlug: "visarga-sandhi", difficulty: "hard", type: "viccheda",
    prompt: "राम उवाच", promptSub: "rāma uvāca",
    options: ["रामः + उवाच", "राम + उवाच", "रामा + उवाच", "रामो + उवाच"],
    correctIndex: 0,
    explanation: "Sutra 81: visarga after a is simply dropped before most following vowels, with no further sandhi. Split rāma uvāca back: rāmaḥ + uvāca.",
    sutraRefs: ["81"],
  },
  {
    id: "s7", topicSlug: "visarga-sandhi", difficulty: "medium", type: "sandhi",
    prompt: "हविः + भ्याम्", promptSub: "haviḥ + bhyām",
    options: ["हविर्भ्याम्", "हविःभ्याम्", "हविभ्याम्", "हविष्भ्याम्"],
    correctIndex: 0,
    explanation: "Sutra 83: visarga after i/u becomes r before a vowel or voiced sound. haviḥ + bhyām → havirbhyām.",
    sutraRefs: ["83"],
  },
  {
    id: "s8", topicSlug: "visarga-sandhi", difficulty: "medium", type: "sandhi",
    prompt: "गुरुः + अत्र", promptSub: "guruḥ + atra",
    options: ["गुरुरत्र", "गुरुःअत्र", "गुरूअत्र", "गुरोऽत्र"],
    correctIndex: 0,
    explanation: "Sutra 83: visarga after i/u becomes r before a vowel. guruḥ + atra → gurur atra.",
    sutraRefs: ["83"],
  },
  {
    id: "s9", topicSlug: "visarga-sandhi", difficulty: "hard", type: "sandhi",
    prompt: "कृष्णः + अपि", promptSub: "kṛṣṇaḥ + api",
    options: ["कृष्णोऽपि", "कृष्णःअपि", "कृष्णअपि", "कृष्णापि"],
    correctIndex: 0,
    explanation: "Sutra 84: when a-rāma follows, visarga after a becomes o and the following a is marked by an avagraha. kṛṣṇaḥ + api → kṛṣṇo'pi.",
    sutraRefs: ["84"],
  },
  {
    id: "s10", topicSlug: "visarga-sandhi", difficulty: "hard", type: "viccheda",
    prompt: "राधा उवाच", promptSub: "rādhā uvāca",
    options: ["राधाः + उवाच", "राधा + उवाच", "राधे + उवाच", "राध + आः + उवाच"],
    correctIndex: 0,
    explanation: "Sutra 85: visarga after ā is dropped before a following sarveśvara (vowel-initial word). Split rādhā uvāca back: rādhāḥ + uvāca.",
    sutraRefs: ["85"],
  },
  {
    id: "s11", topicSlug: "visarga-sandhi", difficulty: "medium", type: "sandhi",
    prompt: "नमः + टीका", promptSub: "namaḥ + ṭīkā",
    options: ["नमष्टीका", "नमःटीका", "नमस्टीका", "नमटीका"],
    correctIndex: 0,
    explanation: "Sutra 86: visarga becomes ṣ before ṭa-varga (ṭ, ṭh, ḍ, ḍh, ṇ). namaḥ + ṭīkā → namaṣṭīkā.",
    sutraRefs: ["86"],
  },
];

export type PracticeChapter = {
  slug: string;
  number: number | null;
  title: string;
  titleEn: string;
  topics: Topic[];
  available: boolean;
  isMisc?: boolean;
};

export const PRACTICE_CHAPTERS: PracticeChapter[] = [
  { slug: "mangalacarana", number: null, title: "Maṅgalācaraṇa", titleEn: "Invocation", topics: [], available: false },
  { slug: "samjna-sandhi-prakarana", number: 1, title: "Saṁjñā-sandhi-prakaraṇa", titleEn: "Sandhi practice", topics: SANDHI_TOPICS, available: true },
  { slug: "nama-prakarana", number: 2, title: "Nāma-prakaraṇa", titleEn: "Noun declension practice", topics: [], available: false },
  { slug: "akhyata-prakarana", number: 3, title: "Ākhyāta-prakaraṇa", titleEn: "Verb conjugation practice", topics: [], available: false },
  { slug: "karaka-prakarana", number: 4, title: "Kāraka-prakaraṇa", titleEn: "Case-meaning practice", topics: [], available: false },
  { slug: "krdanta-prakarana", number: 5, title: "Kṛdanta-prakaraṇa", titleEn: "Participle practice", topics: [], available: false },
  { slug: "samasa-prakarana", number: 6, title: "Samāsa-prakaraṇa", titleEn: "Compound practice", topics: [], available: false },
  { slug: "taddhita-prakarana", number: 7, title: "Taddhita-prakaraṇa", titleEn: "Taddhita practice", topics: [], available: false },
  { slug: "afterword", number: null, title: "Afterword", titleEn: "Afterword", topics: [], available: false },
];

export const MISC_CHAPTER: PracticeChapter = {
  slug: "miscellaneous",
  number: null,
  title: "Miscellaneous",
  titleEn: "All available chapters, mixed together",
  topics: PRACTICE_CHAPTERS.filter((c) => c.available).flatMap((c) => c.topics),
  available: true,
  isMisc: true,
};

export type GameTeaser = { slug: string; title: string; titleEn: string };
export const GAME_TEASERS: GameTeaser[] = [
  { slug: "sandhi-games", title: "Sandhi Games", titleEn: "Match, race, and build words" },
  { slug: "nama-games", title: "Nāma Games", titleEn: "Declension drills, gamified" },
  { slug: "dhatu-games", title: "Dhātu Games", titleEn: "Root & conjugation challenges" },
];

export function questionsFor(topicSlug: string | "all", difficulty: Difficulty | "all"): Question[] {
  return QUESTIONS.filter(
    (q) => (topicSlug === "all" || q.topicSlug === topicSlug) && (difficulty === "all" || q.difficulty === difficulty)
  );
}
