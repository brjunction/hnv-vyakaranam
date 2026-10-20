// Loads verses for the "Scripture Anvyayas" section from Excel files.
//
// FILES
//   content/anvyaya/sb/sb-01.xlsx … sb-12.xlsx   (Bhāgavatam, one file per canto;
//                                                  canto 10 may be split: sb-10-part-1.xlsx …)
//   content/anvyaya/bg/bg-01.xlsx … bg-18.xlsx   (Gītā, one file per chapter)
//
//   A file belongs to canto/chapter N if its name starts with "sb-N" / "bg-N"
//   (leading zeros optional, so "sb-1", "sb-01" both mean canto 1, while
//   "sb-10…" never gets confused with canto 1). You can add as many extra
//   files for a canto as you like — they are simply merged.
//
// COLUMNS (row 1 = header; header names are matched loosely):
//   S.N | Chapter No | Chapter Name | File Number | Verse No |
//   IAST-Verse | Devanagari-Verse | Vedabase Link | Anvyaya | English Translation

import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { getBook, type BookConfig } from "@/lib/anvyayaBooks";
import type { ChapterData, Verse } from "@/lib/anvyayaTypes";

const ROOT = path.join(process.cwd(), "content", "anvyaya");

// ---------------------------------------------------------------------------
// Header matching
// ---------------------------------------------------------------------------
const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const ALIASES: Record<string, string[]> = {
  chapterNo: ["chapterno", "chapternumber", "chno"],
  chapterName: ["chaptername", "chaptertitle"],
  verseNo: ["verseno", "versenumber", "verse"],
  iast: ["iastverse", "iast", "transliteration", "verseiast"],
  devanagari: ["devanagariverse", "devanagari", "sanskrit", "versedevanagari"],
  vedabaseLink: ["vedabaselink", "vedabase", "vedabaseurl", "link"],
  anvyaya: ["anvyaya", "anvaya", "proseorder", "prose"],
  translation: ["englishtranslation", "translation", "english"],
};

function buildColumnMap(headerRow: unknown[]): Record<string, number> {
  const cols = headerRow.map(norm);
  const map: Record<string, number> = {};
  for (const [key, names] of Object.entries(ALIASES)) {
    const idx = cols.findIndex((c) => names.includes(c));
    if (idx !== -1) map[key] = idx;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Verse-number parsing
//   SB: "1.12.1"  (canto.chapter.verse)     BG: "18.6"  (chapter.verse)
// A shorter form ("12.1" / "6") is completed from the file name / Chapter No.
// Combined verses like "1.16-18" are kept as-is.
// ---------------------------------------------------------------------------
function parseVerseNo(
  book: BookConfig,
  raw: string,
  chapterNoCol: string,
  fileDivision: number
): { division: number; chapter: number; verseKey: string; verseNo: string } | null {
  const parts = raw.trim().split(".").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const toInt = (v: string) => parseInt(v, 10);
  const chapterCol = /^\d+$/.test(chapterNoCol.trim()) ? toInt(chapterNoCol) : NaN;

  if (book.hasChapters) {
    // SB
    let division = fileDivision;
    let chapter = chapterCol;
    let verseKey: string;
    if (parts.length >= 3) {
      division = toInt(parts[0]);
      chapter = toInt(parts[1]);
      verseKey = parts.slice(2).join(".");
    } else if (parts.length === 2) {
      chapter = toInt(parts[0]);
      verseKey = parts[1];
    } else {
      verseKey = parts[0];
    }
    if (!Number.isFinite(division) || !Number.isFinite(chapter) || !verseKey) return null;
    return { division, chapter, verseKey, verseNo: `${division}.${chapter}.${verseKey}` };
  }

  // BG
  let chapter = Number.isFinite(chapterCol) ? chapterCol : fileDivision;
  let verseKey: string;
  if (parts.length >= 2) {
    chapter = toInt(parts[0]);
    verseKey = parts.slice(1).join(".");
  } else {
    verseKey = parts[0];
  }
  if (!Number.isFinite(chapter) || !verseKey) return null;
  return { division: chapter, chapter, verseKey, verseNo: `${chapter}.${verseKey}` };
}

function autoVedabaseLink(book: BookConfig, v: { division: number; chapter: number; verseKey: string }): string {
  const code = book.code.toLowerCase();
  return book.hasChapters
    ? `https://vedabase.io/en/library/${code}/${v.division}/${v.chapter}/${v.verseKey}/`
    : `https://vedabase.io/en/library/${code}/${v.chapter}/${v.verseKey}/`;
}

// ---------------------------------------------------------------------------
// Reading files
// ---------------------------------------------------------------------------
function filesForDivision(book: BookConfig, n: number): string[] {
  const dir = path.join(ROOT, book.dir);
  if (!fs.existsSync(dir)) return [];
  const re = new RegExp(`^${book.dir}[-_ ]?0*${n}(?!\\d)`, "i");
  return fs
    .readdirSync(dir)
    .filter((f) => /\.xlsx$/i.test(f) && !f.startsWith("~$") && re.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => path.join(dir, f));
}

function parseFile(book: BookConfig, filePath: string, fileDivision: number): Verse[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(filePath);
  } catch {
    return [];
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet || !sheet["!ref"]) return [];

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: true, defval: "" });
  if (rows.length < 2) return [];

  const col = buildColumnMap(rows[0]);
  if (col.verseNo === undefined) return [];

  const text = (row: unknown[], key: string) => (col[key] === undefined ? "" : String(row[col[key]] ?? "").trim());

  const out: Verse[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawVerseNo = text(row, "verseNo");
    if (!rawVerseNo) continue;

    const parsed = parseVerseNo(book, rawVerseNo, text(row, "chapterNo"), fileDivision);
    if (!parsed || parsed.division !== fileDivision) continue;

    // Vedabase Link: prefer the real hyperlink target if the cell is a
    // clickable link with different display text.
    let link = text(row, "vedabaseLink");
    if (col.vedabaseLink !== undefined) {
      const addr = XLSX.utils.encode_cell({ r: range.s.r + i, c: range.s.c + col.vedabaseLink });
      const target = sheet[addr]?.l?.Target;
      if (target) link = String(target).trim();
    }
    if (!/^https?:\/\//i.test(link)) link = autoVedabaseLink(book, parsed);

    out.push({
      verseNo: parsed.verseNo,
      verseKey: parsed.verseKey,
      division: parsed.division,
      chapter: parsed.chapter,
      chapterName: text(row, "chapterName"),
      iast: text(row, "iast"),
      devanagari: text(row, "devanagari"),
      vedabaseLink: link,
      anvyaya: text(row, "anvyaya"),
      translation: text(row, "translation"),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
const cache = new Map<string, ChapterData[]>();

/**
 * All chapters (with verses) of one canto (SB) or one chapter (BG).
 * For BG the result is a single ChapterData holding that chapter's verses.
 * Cached in memory in production (files only change on deploy).
 */
export function loadDivision(bookCode: string, n: number): ChapterData[] {
  const book = getBook(bookCode);
  if (!book) return [];
  const key = `${book.code}:${n}`;
  if (process.env.NODE_ENV === "production" && cache.has(key)) return cache.get(key)!;

  const verses: Verse[] = [];
  for (const file of filesForDivision(book, n)) verses.push(...parseFile(book, file, n));

  const byChapter = new Map<number, ChapterData>();
  for (const v of verses) {
    let ch = byChapter.get(v.chapter);
    if (!ch) {
      ch = { number: v.chapter, name: v.chapterName, verses: [] };
      byChapter.set(v.chapter, ch);
    }
    if (!ch.name && v.chapterName) ch.name = v.chapterName;
    ch.verses.push(v);
  }
  const result = [...byChapter.values()].sort((a, b) => a.number - b.number);
  cache.set(key, result);
  return result;
}

/** Finds a verse by URL part. "17" also matches a combined verse "16-18". */
export function findVerse(
  chapters: ChapterData[],
  chapterNo: number,
  verseParam: string
): { chapterIdx: number; verseIdx: number } | null {
  const chapterIdx = chapters.findIndex((c) => c.number === chapterNo);
  if (chapterIdx === -1) return null;
  const verses = chapters[chapterIdx].verses;

  let verseIdx = verses.findIndex((v) => v.verseKey === verseParam);
  if (verseIdx === -1 && /^\d+$/.test(verseParam)) {
    const n = parseInt(verseParam, 10);
    verseIdx = verses.findIndex((v) => {
      const m = v.verseKey.match(/^(\d+)-(\d+)$/);
      return m ? n >= parseInt(m[1], 10) && n <= parseInt(m[2], 10) : false;
    });
  }
  return verseIdx === -1 ? null : { chapterIdx, verseIdx };
}

/** Every verse of a book (used by the sitemap). */
export function loadAllVerses(book: BookConfig): Verse[] {
  return book.divisions.flatMap((d) => loadDivision(book.code, d.number).flatMap((c) => c.verses));
}

/** Newest modification time among a book's Excel files. */
export function bookLastModified(book: BookConfig): Date {
  const dir = path.join(ROOT, book.dir);
  let latest = 0;
  try {
    for (const f of fs.readdirSync(dir)) {
      if (/\.xlsx$/i.test(f)) latest = Math.max(latest, fs.statSync(path.join(dir, f)).mtimeMs);
    }
  } catch {
    /* folder missing */
  }
  return latest ? new Date(latest) : new Date();
}

