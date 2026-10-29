import { blocks, cleanInline, toText, type Block } from "@/lib/scriptures/sb/html";

// Śrīmad-Bhāgavatam, BBT e-book (Śrīla Prabhupāda): every verse with its
// speaker, text, synonyms, translation and purport, and every chapter's title
// (and, in Cantos 10–12, its summary). Two layouts occur in the same e-book:
//   Cantos 1–9:  div.verse-number-heading "SB 1.14.1", div.textnum "TEXT 1",
//                div.verse-text (one per line), div.synonyms, div.translation,
//                div.normal-level … (purport)
//   Cantos 10–12: div.text "TEXT 14.1" / "TEXTS 14.3–4", div.sans (lines with <br>),
//                the synonyms in the next div, div.trans, then the purport.

export type SbVerse = {
  canto: number;
  chapter: number;
  /** "1", "16-18" */
  key: string;
  from: number;
  to: number;
  speaker: string;
  lines: string[];
  synonyms: string;
  translation: string;
  purport: string;
};
export type SbChapter = { canto: number; chapter: number; title: string; summary: string };
export type BbtResult = { verses: SbVerse[]; chapters: SbChapter[]; cantoTitles: Record<number, string>; issues: string[] };

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
/** "Fourteen", "Thirty-Two", "FIFTY" → 14, 32, 50 */
export function wordsToNumber(s: string): number | null {
  const parts = s.toLowerCase().replace(/[^a-z\s-]/g, "").split(/[\s-]+/).filter(Boolean);
  if (!parts.length) return null;
  let n = 0;
  for (const p of parts) {
    if (!(p in NUMBER_WORDS)) return null;
    n += NUMBER_WORDS[p];
  }
  return n;
}

const PURPORT_VERSE = /verse-in-purp|prose-verse|verse-ref/;

/** A block of the purport as HTML. */
function para(b: Block): string {
  const h = cleanInline(b.html);
  if (!h) return "";
  if (PURPORT_VERSE.test(b.cls)) return `<p style="text-align: center">${h}</p>`;
  return `<p>${h}</p>`;
}

/** "SB 1.14.1" / "SB-4.21.44" / "SB 4.30.39, SB 4.30.40, …" → [canto, chapter] */
const headingRef = (t: string) => {
  const m = /SB[\s-]*(\d+)\.(\d+)/.exec(t);
  return m ? [Number(m[1]), Number(m[2])] : null;
};
/** "TEXT 1", "TEXTS 16–18", "TEXT 14.1", "TEXTS 51.1–6", "TEXT 10b" */
const textRef = (t: string) => {
  const m = /^TEXTS?\s+(?:(\d+)\.)?(\d+[a-z]?)(?:\s*[–—-]\s*(\d+[a-z]?))?/i.exec(t.trim());
  if (!m) return null;
  return { chapter: m[1] ? Number(m[1]) : null, from: m[2], to: m[3] ?? null };
};

export function parseBbt(files: { path: string; xhtml: string }[]): BbtResult {
  const verses: SbVerse[] = [];
  const chapters: SbChapter[] = [];
  const cantoTitles: Record<number, string> = {};
  const issues: string[] = [];
  let cur: SbVerse | null = null;
  let mode: "" | "verse" | "syn" | "trans" | "purp" | "summary" = "";
  let canto = 0;
  let chapter = 0;
  let pendingTitle = "";
  let chapterSummary: string[] = [];

  const chapterOf = (c: number, ch: number) => {
    let x = chapters.find((y) => y.canto === c && y.chapter === ch);
    if (!x) chapters.push((x = { canto: c, chapter: ch, title: "", summary: "" }));
    return x;
  };
  const flushSummary = () => {
    if (canto && chapter && chapterSummary.length) chapterOf(canto, chapter).summary += chapterSummary.join("");
    chapterSummary = [];
  };

  for (const f of files) {
    const folder = /(?:^|\/)(\d{1,2})\//.exec(f.path)?.[1];
    const fileCanto = folder ? Number(folder) : 0;
    // Cantos 10–12: ENSB1014XT → canto 10, chapter 14
    const ens = /ENSB(\d\d)(\d\d\d)XT/i.exec(f.path);
    const title = /<title>([^<]*)<\/title>/i.exec(f.xhtml)?.[1] ?? "";
    const ct = /Canto\s+(\d+)\s*-\s*"?([^"]+)"?/i.exec(title);
    if (ct && !cantoTitles[Number(ct[1])]) cantoTitles[Number(ct[1])] = ct[2].replace(/\s+(Preface|Introduction|Chapter.*)$/i, "").trim();

    for (const b of blocks(f.xhtml)) {
      const cls = b.cls;
      const t = b.text;
      // ---- chapter starts
      if (cls === "chapnum" || cls === "chapter1") {
        const n = wordsToNumber(t.replace(/^chapter\s+/i, ""));
        if (n) {
          flushSummary();
          cur = null;
          mode = "summary";
          canto = ens ? Number(ens[1]) : fileCanto || canto;
          chapter = n;
          chapterOf(canto, chapter);
        } else mode = "";
        continue;
      }
      if (cls === "chapter-desc" || cls === "ch-title") {
        if (canto && chapter) chapterOf(canto, chapter).title = t;
        else pendingTitle = t;
        continue;
      }
      // ---- verse starts
      if (cls === "verse-number-heading") {
        const r = headingRef(t);
        if (r) [canto, chapter] = r;
        continue;
      }
      if (cls === "textnum" || cls === "text") {
        const r = textRef(t);
        if (!r) continue;
        flushSummary();
        if (r.chapter) {
          canto = ens ? Number(ens[1]) : fileCanto || canto;
          chapter = r.chapter;
        }
        const from = parseInt(r.from, 10);
        const to = r.to ? parseInt(r.to, 10) : from;
        const key = r.to ? `${r.from}-${r.to}` : r.from;
        if (verses.some((v) => v.canto === canto && v.chapter === chapter && v.key === key)) {
          issues.push(`SB ${canto}.${chapter}.${key} appears twice; the second copy was skipped.`);
          cur = null;
          mode = "";
          continue;
        }
        cur = { canto, chapter, key, from, to, speaker: "", lines: [], synonyms: "", translation: "", purport: "" };
        verses.push(cur);
        mode = "verse";
        if (pendingTitle) {
          chapterOf(canto, chapter).title ||= pendingTitle;
          pendingTitle = "";
        }
        continue;
      }
      if (mode === "summary") {
        if (/^(para|calibre1|normal-level)$/.test(cls) && t) chapterSummary.push(para(b));
        continue;
      }
      if (!cur) continue;
      // ---- parts of a verse
      if (cls === "book" && /^TEXT$/i.test(t)) continue;
      if (/uvaca/.test(cls)) {
        cur.speaker = t;
        continue;
      }
      if (cls === "verse-text" || cls === "sans" || cls === "sans-prose" || (mode === "verse" && /prose-verse|verse-in-purp/.test(cls) && !cur.synonyms)) {
        cur.lines.push(...t.split("\n").map((x) => x.trim()).filter(Boolean));
        mode = "verse";
        continue;
      }
      if (cls === "synonyms-section") {
        mode = "syn";
        continue;
      }
      if (/^(verse-section|trans-title)$/.test(cls)) {
        if (/^TRANSLATION$/i.test(t)) mode = "trans";
        else if (/^PURPORT$/i.test(t)) mode = "purp";
        else mode = "";
        continue;
      }
      if (cls === "synonyms" || (mode === "verse" && cur.lines.length && !cur.synonyms && /–|-/.test(t) && b.html.includes("<i"))) {
        cur.synonyms = cleanInline(b.html).replace(/<\/i>\s*[-–—]\s*/g, "</i> — ");
        mode = "syn";
        continue;
      }
      if (mode === "trans" && (cls === "translation" || cls === "trans" || t)) {
        const h = cleanInline(b.html);
        if (h) cur.translation += `<p>${h}</p>`;
        continue;
      }
      if (mode === "purp") {
        if (cls === "thus-end" || cls === "ch-end") {
          const h = cleanInline(b.html);
          if (h) cur.purport += `<p><i>${h.replace(/<\/?i>/g, "")}</i></p>`;
          continue;
        }
        cur.purport += para(b);
      }
    }
  }
  flushSummary();

  for (const v of verses) {
    if (!v.lines.length) issues.push(`SB ${v.canto}.${v.chapter}.${v.key}: no verse text.`);
    if (!v.translation) issues.push(`SB ${v.canto}.${v.chapter}.${v.key}: no translation.`);
  }
  return { verses, chapters, cantoTitles, issues };
}

export { toText };
