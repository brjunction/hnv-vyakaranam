// Types shared by server and client code for the Scripture Anvyayas section.

export type Verse = {
  /** Full verse number, e.g. "1.12.1" (Bhāgavatam) or "18.6" (Gītā). */
  verseNo: string;
  /** Last part of the verse number: "1", or "16-18" for a combined verse. */
  verseKey: string;
  /** Canto (SB) or chapter (BG) number. */
  division: number;
  /** Chapter number inside the canto (SB) — same as `division` for BG. */
  chapter: number;
  chapterName: string;
  iast: string;
  devanagari: string;
  vedabaseLink: string;
  anvyaya: string;
  translation: string;
};

export type ChapterData = {
  number: number;
  name: string;
  verses: Verse[];
};

export type ChapterSummary = {
  number: number;
  name: string;
  verseCount: number;
  /** Present when the verses are already loaded (otherwise fetched on demand). */
  verses?: Verse[];
};
