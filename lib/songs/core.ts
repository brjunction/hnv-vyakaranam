// Shared (client-safe) helpers for the Vaiṣṇava songs section.
import Sanscript from "@indic-transliteration/sanscript";
import { fold } from "@/lib/dict/translit";

export type SongLanguage = "bengali" | "sanskrit" | "brajabuli" | "hindi" | "odia" | "other";
export const SONG_LANGUAGE_LABEL: Record<SongLanguage, string> = {
  bengali: "Bengali",
  sanskrit: "Sanskrit",
  brajabuli: "Brajabuli",
  hindi: "Hindi",
  odia: "Odia",
  other: "Other",
};
/** Suggestions for the "Type" field (free text — any other type may be typed). */
export const SONG_KINDS = ["Song", "Aṣṭakam", "Stotram", "Prayer", "Kīrtana", "Ārati", "Padyāvalī verse", "Bhajana", "Daśakam", "Gīta"];

export type SongVerse = { text: string; printed?: string; translation?: string; synonyms?: string };
export type SongLink = { label: string; url: string };

/** Everything the list page needs about one song (kept small). */
export type SongEntry = {
  slug: string;
  title: string;
  firstLine: string;
  author: string;
  book: string;
  bookPlace: string;
  kind: string;
  language: SongLanguage;
  verses: number;
  /** Folded search key (title, other names, first line, author, book, verse openings). */
  key: string;
};

export type Song = {
  id: number;
  slug: string;
  title: string;
  altTitles: string;
  author: string;
  book: string;
  bookPlace: string;
  kind: string;
  language: SongLanguage;
  verses: SongVerse[];
  introHtml: string;
  purportHtml: string;
  translator: string;
  links: SongLink[];
  status: string;
};

/**
 * Search key: like the dictionary's fold(), plus spellings that differ
 * between Bengali and Sanskrit transliteration (doyā/dayā, bande/vande,
 * krishna/kṛṣṇa). Applied to the songs AND to what is typed.
 */
export function songKey(s: string): string {
  return fold(s)
    .replace(/o/g, "a")
    .replace(/v/g, "b")
    .replace(/ri(?=[^aeiu]|$)/g, "r")
    .replace(/y/g, "j");
}

/** What someone typed, in any script → search key. */
export function queryKey(q: string): string {
  const t = q.trim().normalize("NFC");
  if (!t) return "";
  let iast = t;
  if (/[ঀ-৿]/.test(t)) iast = Sanscript.t(t.replace(/য়/g, "য").replace(/ৎ/g, "ত্"), "bengali", "iast");
  else if (/[଀-୿]/.test(t)) iast = Sanscript.t(t, "oriya", "iast");
  else if (/[ऀ-ॿ]/.test(t)) iast = Sanscript.t(t, "devanagari", "iast");
  return songKey(iast);
}

/** First line of the first verse (for lists), without line markers. */
export function firstLineOf(verses: SongVerse[]): string {
  const v = verses.find((x) => x.printed?.trim() || x.text?.trim());
  const t = (v?.printed?.trim() || v?.text?.trim() || "").split(/\s*\/\s*|\n/)[0] ?? "";
  return t.trim();
}

/** A–Z letter of a title (diacritics removed). */
export function letterOf(title: string): string {
  const c = title.normalize("NFD").replace(/\p{M}+/gu, "").replace(/^(śrī|sri|shri|śrīla)[\s-]+/i, "").trim()[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(c) ? c : "#";
}

/** "Song 3", "1.4", "12" → sortable tuple. */
export function placeSort(place: string): number[] {
  return (place.match(/\d+/g) ?? []).map(Number).concat([Number.MAX_SAFE_INTEGER]);
}
export function comparePlace(a: string, b: string): number {
  const x = placeSort(a);
  const y = placeSort(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return a.localeCompare(b);
}

export const songPath = (slug: string) => `/songs/${slug}`;
