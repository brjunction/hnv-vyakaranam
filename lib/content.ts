// Content loader.
//
// WHAT LIVES WHERE
// -----------------
// content/chapters/<chapter-slug>.xlsx
//   One spreadsheet per chapter. Columns (row 1 = header, any order is fine
//   as long as the header text matches):
//     S.No | Subchapter | Sutra Number | Sanskrit | Transliteration | Vrtti | Translation
//   "Subchapter" groups rows into sections automatically, in the order they
//   first appear in the sheet — you never have to touch this file.
//   This is a local, one-time-edit file (no internet needed to read it).
//
// Sūtra NOTES are handled separately, live, from a Google Doc — see
// lib/googleDocs.ts and lib/sutraNotesDoc.ts, and paste your doc link into
// lib/config.ts. They are merged onto sūtras at the page level, not here.
//
// This file (lib/content.ts) only needs editing if you want to add/rename a
// *chapter* (its title, summary, slug). Everything about sections and sutras
// is read live from the .xlsx files above — no rebuild-by-hand required.

import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

export type Sutra = {
  number: string; // e.g. "1.1.1"
  sutraSanskrit: string;
  sutraTransliteration: string;
  vrtti: string;
  translation: string;
};

export type Section = {
  slug: string;
  title: string; // e.g. "Sārvēśvara-sandhi"
  sutras: Sutra[];
};

export type Chapter = {
  slug: string;
  number: number;
  title: string; // e.g. "Saṁjñā-sandhi-prakaraṇa"
  titleEnglish: string; // e.g. "Terminology & Phonetic Combination"
  summary: string;
  sutraRange: string; // e.g. "1–40"
  sections: Section[];
};

// ---------------------------------------------------------------------------
// Static chapter metadata. Add a chapter here (and drop a matching .xlsx
// into content/chapters/) any time you want a new top-level chapter.
// ---------------------------------------------------------------------------
type ChapterMeta = Omit<Chapter, "sections">;

const CHAPTER_META: ChapterMeta[] = [
  {
    slug: "mangalacarana",
    number: 0,
    title: "Maṅgalācaraṇa",
    titleEnglish: "Invocation",
    summary:
      "The opening invocatory verses of Śrīla Rūpa Gosvāmī, including the celebrated verse in praise of Sarasvatī and Govinda.",
    sutraRange: "—",
  },
  {
    slug: "samjna-sandhi-prakarana",
    number: 1,
    title: "Saṁjñā-sandhi-prakaraṇa",
    titleEnglish: "Terminology & Phonetic Combination",
    summary:
      "Defines core grammatical terms and the rules of sandhi (euphonic combination) used throughout the treatise.",
    sutraRange: "1–40",
  },
  {
    slug: "nama-prakarana",
    number: 2,
    title: "Nāma-prakaraṇa",
    titleEnglish: "Noun Declension",
    summary: "Rules governing the declension of nouns across the seven cases (vibhakti) and their forms.",
    sutraRange: "TBD",
  },
  {
    slug: "akhyata-prakarana",
    number: 3,
    title: "Ākhyāta-prakaraṇa",
    titleEnglish: "Verb Conjugation",
    summary:
      "The conjugation of verbal roots across tenses, moods, and voices — the section most fully preserved in the surviving manuscript.",
    sutraRange: "569–618 (manuscript portion)",
  },
  {
    slug: "karaka-prakarana",
    number: 4,
    title: "Kāraka-prakaraṇa",
    titleEnglish: "Case Meanings",
    summary: "The semantic roles (kāraka) expressed by the case endings.",
    sutraRange: "TBD",
  },
  {
    slug: "krdanta-prakarana",
    number: 5,
    title: "Kṛdanta-prakaraṇa",
    titleEnglish: "Participles & Kṛt-formations",
    summary: "Participles and nouns derived from verbal roots by kṛt suffixes.",
    sutraRange: "TBD",
  },
  {
    slug: "samasa-prakarana",
    number: 6,
    title: "Samāsa-prakaraṇa",
    titleEnglish: "Compounds",
    summary: "The formation and classification of compound words (samāsa).",
    sutraRange: "TBD",
  },
  {
    slug: "taddhita-prakarana",
    number: 7,
    title: "Taddhita-prakaraṇa",
    titleEnglish: "Taddhita-formations",
    summary: "Nouns derived by taddhita suffixes, along with the appendixes closing the treatise.",
    sutraRange: "TBD",
  },
  {
    slug: "afterword",
    number: 8,
    title: "Afterword",
    titleEnglish: "Afterword",
    summary: "Closing reflections and colophon of the edition.",
    sutraRange: "—",
  },
];

// ---------------------------------------------------------------------------
// File locations
// ---------------------------------------------------------------------------
const CONTENT_DIR = path.join(process.cwd(), "content", "chapters");

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Normalizes a header cell so "Sutra Number", "sutra number", " Sutra_Number "
// etc. all match.
function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, " ");
}

const HEADER_ALIASES: Record<string, string[]> = {
  section: ["subchapter", "section", "sub chapter", "sub-chapter"],
  number: ["sutra number", "number", "sutra no", "sutra no."],
  sanskrit: ["sanskrit", "sutra sanskrit"],
  transliteration: ["transliteration", "sutra transliteration"],
  vrtti: ["vrtti", "vṛtti", "commentary"],
  translation: ["translation"],
};

function buildColumnMap(headerRow: unknown[]): Record<string, number> {
  const normalized = headerRow.map(normalizeHeader);
  const map: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx !== -1) map[key] = idx;
  }
  return map;
}

function loadSectionsFromXlsx(slug: string): Section[] {
  const filePath = path.join(CONTENT_DIR, `${slug}.xlsx`);
  if (!fs.existsSync(filePath)) return [];

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  if (rows.length < 2) return [];

  const colMap = buildColumnMap(rows[0]);
  const sectionsBySlug = new Map<string, Section>();
  const order: string[] = [];

  for (const row of rows.slice(1)) {
    const number = String(row[colMap.number] ?? "").trim();
    if (!number) continue; // skip blank rows

    const sectionTitle = String(row[colMap.section] ?? "").trim() || "General";
    const sectionSlug = slugify(sectionTitle);

    if (!sectionsBySlug.has(sectionSlug)) {
      sectionsBySlug.set(sectionSlug, { slug: sectionSlug, title: sectionTitle, sutras: [] });
      order.push(sectionSlug);
    }

    const sutra: Sutra = {
      number,
      sutraSanskrit: String(row[colMap.sanskrit] ?? "").trim(),
      sutraTransliteration: String(row[colMap.transliteration] ?? "").trim(),
      vrtti: String(row[colMap.vrtti] ?? "").trim(),
      translation: String(row[colMap.translation] ?? "").trim(),
    };

    sectionsBySlug.get(sectionSlug)!.sutras.push(sutra);
  }

  return order.map((s) => sectionsBySlug.get(s)!);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export const chapters: Omit<Chapter, "sections">[] = CHAPTER_META;

export function getChapter(slug: string): Chapter | undefined {
  const meta = CHAPTER_META.find((c) => c.slug === slug);
  if (!meta) return undefined;
  return { ...meta, sections: loadSectionsFromXlsx(slug) };
}

export function getAllChapterSlugs(): string[] {
  return CHAPTER_META.map((c) => c.slug);
}
