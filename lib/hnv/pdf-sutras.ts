import { balaramaToUtf8 } from "@/lib/hnv/balarama";

// Reads "Appendix 9 — List of Sūtras in the Madhyama Version" from the HNV
// Volume 1 PDF: numbered sūtras, grouped by prakaraṇa, in IAST. Pure functions
// (no server or browser APIs), so the same code runs in the admin page and in
// tests. Every result is validated — a run that is not strictly 1, 2, 3 …
// is reported, never silently accepted.

export type PdfSutra = { number: string; text: string; prakarana: string };
export type ListParse = {
  sutras: PdfSutra[];
  /** Problems found: gaps, repeats, suspicious characters. Empty = clean. */
  issues: string[];
  prakaranas: { name: string; first: number; last: number; count: number }[];
};

const FOOTER = [
  /^\s*\d+\s*$/, // bare page number
  /^\s*(Sütra-päöha|Sūtra-pāṭha)\s+\d+\s*$/i,
  /^\s*\d+\s+(Hari-nämämåta-vyäkaraëam|Hari-nāmāmṛta-vyākaraṇam)\s*$/i,
];
const HEAD = /^\s*List of (?:sütras|sūtras) in the (.+?)-?(?:prakaraëa|prakaraṇa)s?\s*$/i;
const SUB = /^\s*([A-ZÇ][\p{L}çëäéñåöòÿ-]*-(?:sandhiù|sandhiḥ))\s*$/iu;
const START = /^\s*(\d{1,4})\.\s*(.*)$/;

const clean = (s: string) => s.replace(/\s+/g, " ").replace(/\s+([,.;])/g, "$1").trim();

/** Joins a verse split over lines ("anantara-" + "bahiraṅga…") without a stray space. */
const join = (a: string, b: string) => (a.endsWith("-") ? a + b : `${a} ${b}`);

/** `raw` = text of the appendix pages, either still in Balarama or already IAST. */
export function parseSutraList(raw: string): ListParse {
  const text = balaramaToUtf8(raw);
  const lines = text.split(/\r?\n/);
  const out: PdfSutra[] = [];
  const issues: string[] = [];
  let prak = "";
  let expected = 1;
  let cur: PdfSutra | null = null;
  let started = false;

  for (const line of lines) {
    if (FOOTER.some((r) => r.test(line))) continue;
    const h = HEAD.exec(line);
    if (h) {
      started = true;
      prak = clean(h[1]).replace(/-+$/, "");
      if (/^\s*Saṁjñā|Saṁjñā/.test(prak) === false && /Saṁjñā/i.test(prak) === false) prak = prak;
      cur = null;
      continue;
    }
    if (!started) continue;
    if (/^\s*Appendix\s+\d+/i.test(line)) break;
    if (SUB.test(line) && !START.test(line)) {
      cur = null;
      continue;
    }
    const m = START.exec(line);
    if (m && Number(m[1]) === expected) {
      cur = { number: String(expected), text: clean(m[2]), prakarana: prak };
      out.push(cur);
      expected++;
      continue;
    }
    if (m && Number(m[1]) !== expected && Number(m[1]) > expected && Number(m[1]) < expected + 5) {
      issues.push(`Expected sūtra ${expected} but found ${m[1]} (page layout may have lost sūtra ${expected}).`);
      expected = Number(m[1]) + 1;
      cur = { number: m[1], text: clean(m[2]), prakarana: prak };
      out.push(cur);
      continue;
    }
    if (cur && line.trim()) cur.text = clean(cur.text ? join(cur.text, line.trim()) : line.trim());
  }

  out.forEach((s) => {
    if (!s.text) issues.push(`Sūtra ${s.number} has no text.`);
    if (/[^\p{L}\p{M}\s\-'’‘()[\],.;:*ऀ-ॿ…°]/u.test(s.text)) issues.push(`Sūtra ${s.number} has an unusual character: “${s.text}”.`);
    if (/[äéüåèìñïöòëçàùÿû]/.test(s.text)) issues.push(`Sūtra ${s.number} still has a Balarama letter: “${s.text}”.`);
  });

  const groups: ListParse["prakaranas"] = [];
  for (const s of out) {
    const g = groups[groups.length - 1];
    if (g && g.name === s.prakarana) {
      g.last = Number(s.number);
      g.count++;
    } else groups.push({ name: s.prakarana, first: Number(s.number), last: Number(s.number), count: 1 });
  }
  return { sutras: out, issues, prakaranas: groups };
}

/** Comparison key: ignores spacing, hyphens, quotes and the final danda. */
export const looseKey = (s: string) =>
  s
    .normalize("NFC")
    .replace(/[\s\-‐‑–—'’‘ʼ|।॥/]+/g, "")
    .replace(/[(),;:.]/g, "")
    .toLowerCase();

/** Exact-ish key: only whitespace and quote style are normalised. */
export const exactKey = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").replace(/[’‘ʼ]/g, "’").trim();
