// Configuration of the books in the "Scripture Anvyayas" section.
// (No file-system code here, so it is safe to import anywhere.)
//
// TO ADD A NEW BOOK LATER: add one entry to BOOKS below, create the folder
// content/anvyaya/<dir>/ and put its .xlsx files in it. Nothing else needed.

export type Division = {
  number: number;
  title: string;
  subtitle?: string;
  /** Known number of chapters (cantos only) — shown on the card. */
  chapterCount?: number;
};

export type BookConfig = {
  code: "SB" | "BG";
  /** Folder under content/anvyaya/ and the prefix of its file names. */
  dir: string;
  title: string;
  titleDeva: string;
  tagline: string;
  description: string;
  /** "Canto" / "Chapter" — the top-level unit shown on the book page. */
  divisionLabel: string;
  divisionPlural: string;
  /** true = division → chapters → verses (SB). false = division → verses (BG). */
  hasChapters: boolean;
  divisions: Division[];
  /** Short "who wrote the anvyayas" line for cards. */
  anvyayaBy: string;
  anvyayaCredit: string;
  translationCredit: string;
};

const TRANSLATION_CREDIT =
  "The translations are of His Divine Grace A.C. Bhaktivedanta Swami Śrīla Prabhupāda, the founder-ācārya of ISKCON, referenced from Vedabase.";

export const BOOKS: BookConfig[] = [
  {
    code: "SB",
    dir: "sb",
    title: "Śrīmad-Bhāgavatam",
    titleDeva: "श्रीमद्भागवतम्",
    tagline: "The ripened fruit of the tree of Vedic literature",
    description:
      "The complete Bhāgavata Purāṇa in twelve cantos — every verse with its anvyaya (prose order) and translation.",
    divisionLabel: "Canto",
    divisionPlural: "Cantos",
    hasChapters: true,
    divisions: [
      { number: 1, title: "Creation", chapterCount: 19 },
      { number: 2, title: "The Cosmic Manifestation", chapterCount: 10 },
      { number: 3, title: "The Status Quo", chapterCount: 33 },
      { number: 4, title: "The Creation of the Fourth Order", chapterCount: 31 },
      { number: 5, title: "The Creative Impetus", chapterCount: 26 },
      { number: 6, title: "Prescribed Duties for Human Society", chapterCount: 19 },
      { number: 7, title: "The Science of God", chapterCount: 15 },
      { number: 8, title: "Withdrawal of the Cosmic Creations", chapterCount: 24 },
      { number: 9, title: "Liberation", chapterCount: 24 },
      { number: 10, title: "The Summum Bonum", chapterCount: 90 },
      { number: 11, title: "General History", chapterCount: 31 },
      { number: 12, title: "The Age of Deterioration", chapterCount: 13 },
    ],
    anvyayaBy: "Bhaktisiddhānta Sarasvatī Ṭhākura",
    anvyayaCredit:
      "The Anvyayas (prose order) are of His Divine Grace Śrī Śrīmad Bhaktisiddhānta Sarasvatī Ṭhākura Prabhupāda, the Guru Mahārāja of Śrīla Prabhupāda, founder-ācārya of ISKCON.",
    translationCredit: TRANSLATION_CREDIT,
  },
  {
    code: "BG",
    dir: "bg",
    title: "Śrīmad Bhagavad-gītā",
    titleDeva: "श्रीमद्भगवद्गीता",
    tagline: "The song of the Lord, in eighteen chapters",
    description:
      "All eighteen chapters of the Bhagavad-gītā — every verse with its anvyaya (prose order) and translation.",
    divisionLabel: "Chapter",
    divisionPlural: "Chapters",
    hasChapters: false,
    divisions: [
      { number: 1, title: "Observing the Armies on the Battlefield of Kurukṣetra", subtitle: "Arjuna-viṣāda-yoga" },
      { number: 2, title: "Contents of the Gītā Summarized", subtitle: "Sāṅkhya-yoga" },
      { number: 3, title: "Karma-yoga", subtitle: "Karma-yoga" },
      { number: 4, title: "Transcendental Knowledge", subtitle: "Jñāna-karma-sannyāsa-yoga" },
      { number: 5, title: "Karma-yoga—Action in Kṛṣṇa Consciousness", subtitle: "Karma-sannyāsa-yoga" },
      { number: 6, title: "Dhyāna-yoga", subtitle: "Ātma-saṁyama-yoga" },
      { number: 7, title: "Knowledge of the Absolute", subtitle: "Jñāna-vijñāna-yoga" },
      { number: 8, title: "Attaining the Supreme", subtitle: "Akṣara-brahma-yoga" },
      { number: 9, title: "The Most Confidential Knowledge", subtitle: "Rāja-vidyā-rāja-guhya-yoga" },
      { number: 10, title: "The Opulence of the Absolute", subtitle: "Vibhūti-yoga" },
      { number: 11, title: "The Universal Form", subtitle: "Viśvarūpa-darśana-yoga" },
      { number: 12, title: "Devotional Service", subtitle: "Bhakti-yoga" },
      { number: 13, title: "Nature, the Enjoyer and Consciousness", subtitle: "Kṣetra-kṣetrajña-vibhāga-yoga" },
      { number: 14, title: "The Three Modes of Material Nature", subtitle: "Guṇa-traya-vibhāga-yoga" },
      { number: 15, title: "The Yoga of the Supreme Person", subtitle: "Puruṣottama-yoga" },
      { number: 16, title: "The Divine and Demoniac Natures", subtitle: "Daivāsura-sampad-vibhāga-yoga" },
      { number: 17, title: "The Divisions of Faith", subtitle: "Śraddhā-traya-vibhāga-yoga" },
      { number: 18, title: "Conclusion—The Perfection of Renunciation", subtitle: "Mokṣa-sannyāsa-yoga" },
    ],
    anvyayaBy: "Viśvanātha Cakravartī Ṭhākura",
    anvyayaCredit:
      "The Anvyayas (prose order) are of the most celebrated Gauḍīya Ācārya, Śrīla Viśvanātha Cakravartī Ṭhākura Prabhupāda.",
    translationCredit: TRANSLATION_CREDIT,
  },
];

/** Case-insensitive lookup: "sb", "SB" and "Sb" all work. */
export function getBook(code: string): BookConfig | undefined {
  return BOOKS.find((b) => b.code.toLowerCase() === code.toLowerCase());
}

/** Human label for a verse, e.g. "SB 1.12.1" or "BG 18.6". */
export function verseLabel(book: BookConfig, verseNo: string): string {
  return `${book.code} ${verseNo}`;
}

/** URL path (under /anvyaya) of a verse, e.g. /anvyaya/SB/1/12/1 or /anvyaya/BG/18/6 */
export function versePath(
  book: Pick<BookConfig, "code" | "hasChapters">,
  v: { division: number; chapter: number; verseKey: string }
): string {
  return book.hasChapters
    ? `/anvyaya/${book.code}/${v.division}/${v.chapter}/${v.verseKey}`
    : `/anvyaya/${book.code}/${v.chapter}/${v.verseKey}`;
}
