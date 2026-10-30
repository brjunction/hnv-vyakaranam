// Shared, client-safe helpers for the Scriptures module: URL paths, verse
// keys, display numbers, and the shapes passed from server to the reader.

export type BookInfo = {
  id: number;
  code: string;
  title: string;
  titleDeva: string;
  tagline: string;
  description: string;
  author: string;
  abbrev: string;
  levels: string[];
  verseLabel: string;
  verseLabelPlural: string;
  /** Language of the verses ("sanskrit", "bengali" for CC …). */
  verseLanguage: string;
  coverUrl: string;
  introHtml: string;
  status: string;
  categoryId: number | null;
};

/** One division in a book's tree (canto, chapter, part …). */
export type TreeNode = {
  id: number;
  parentId: number | null;
  depth: number;
  key: string;
  number: string;
  title: string;
  titleDeva: string;
  subtitle: string;
  expected: number | null;
  /** Published verses directly inside this division. */
  verses: number;
  /** First / last verse key (for crossing chapter boundaries). */
  firstVerse: string | null;
  lastVerse: string | null;
  hasBody: boolean;
  /** Keys from the top level down to this division. */
  path: string[];
};

export type CommentaryType = {
  id: number;
  key: string;
  name: string;
  nameDeva: string;
  author: string;
  description: string;
  language: "sanskrit" | "english" | "hindi" | "bengali" | "nepali" | "odia" | "other";
  appliesTo: "verse" | "division" | "both";
  pane: "commentary" | "verse" | "anvaya" | "translation";
};

export type VerseData = {
  id: number;
  key: string;
  verseNo: string;
  /** Original text: Devanagari for Sanskrit, Bengali script for Bengali verses (CC) … */
  devanagari: string;
  /** Typed transliteration (never generated for non-Sanskrit verses). */
  iast: string;
  speaker: string;
  /** Effective language of this verse. */
  language: string;
  /** typeId → sanitized HTML */
  c: Record<number, string>;
  audio: { title: string; speaker: string; url: string }[];
};

/** Everything a reader needs for one division (usually a chapter). */
export type DivisionData = {
  book: BookInfo;
  division: TreeNode & { bodyHtml: string; c: Record<number, string>; audio: VerseData["audio"] };
  types: CommentaryType[];
  verses: VerseData[];
  children: TreeNode[];
};

export const SCR_BASE = "/scriptures";
/** Codes a book may not use (they are admin/public route names). */
export const RESERVED_CODES = ["d", "v", "new", "read", "search", "api", "syllabus"];

export function bookPath(code: string) {
  return `${SCR_BASE}/${code}`;
}
export function divisionPath(code: string, path: string[]) {
  return `${SCR_BASE}/${code}${path.length ? "/" + path.join("/") : ""}`;
}
export function versePath(code: string, path: string[], key: string) {
  return `${divisionPath(code, path)}/${key}`;
}

/** "SB 1.12.1" (or "1.12.1" when the book has no abbreviation). */
export function verseRef(book: Pick<BookInfo, "abbrev">, verseNo: string) {
  return book.abbrev ? `${book.abbrev} ${verseNo}` : verseNo;
}

const KEY_RE = /^(\d+)(?:-(\d+))?$/;
/** "16-18" → {from:16,to:18}; "5" → {5,5}; anything else → null. */
export function parseVerseKey(key: string): { from: number; to: number } | null {
  const m = KEY_RE.exec(key.trim());
  if (!m) return null;
  const from = parseInt(m[1], 10);
  const to = m[2] ? parseInt(m[2], 10) : from;
  return to >= from ? { from, to } : null;
}

/**
 * Display number from the divisions' displayed numbers and the verse key:
 * ["1","12"] + "1" → "1.12.1"; ["Ādi","1"] + "1" → "Ādi 1.1".
 */
export function composeVerseNo(path: string[], key: string) {
  const parts = [...path, key];
  return parts.reduce((out, p, i) => (i === 0 ? p : out + (/\d$/.test(parts[i - 1]) ? "." : " ") + p), "");
}

/** Ordered list of leaf-ish divisions (the ones that hold verses or text) for prev/next. */
export function readingOrder(tree: TreeNode[]): TreeNode[] {
  const kids = new Map<number | null, TreeNode[]>();
  for (const n of tree) {
    const list = kids.get(n.parentId) ?? [];
    list.push(n);
    kids.set(n.parentId, list);
  }
  const out: TreeNode[] = [];
  const walk = (parent: number | null) => {
    for (const n of kids.get(parent) ?? []) {
      if (n.verses > 0 || n.hasBody) out.push(n);
      walk(n.id);
    }
  };
  walk(null);
  return out;
}

export function childrenOf(tree: TreeNode[], parentId: number | null) {
  return tree.filter((n) => n.parentId === parentId);
}

/** Label of a division, e.g. "Canto 1" / "Chapter 12". */
export function levelName(book: Pick<BookInfo, "levels">, depth: number) {
  return book.levels[depth] ?? book.levels[book.levels.length - 1] ?? "Part";
}

/**
 * Parse a jump string relative to a book: "1.12.1", "1 12 1", "12.1" (relative
 * to the current top-level division), "16-18". Returns division keys + verse key.
 */
export function parseJump(input: string, depthCount: number, current: string[] = []): { path: string[]; verse?: string } | null {
  const parts = input
    .trim()
    .replace(/^[a-z]{1,4}\s+/i, "")
    .split(/[\s.:/,]+/)
    .filter(Boolean);
  if (!parts.length || parts.some((p) => !/^\d+(-\d+)?$/.test(p))) return null;
  if (parts.length === depthCount + 1) return { path: parts.slice(0, depthCount), verse: parts[depthCount] };
  if (parts.length === depthCount) return { path: parts };
  if (parts.length < depthCount + 1) {
    // fill the missing upper levels from the current location
    const need = depthCount + 1 - parts.length;
    if (current.length >= need) return { path: [...current.slice(0, need), ...parts.slice(0, -1)], verse: parts[parts.length - 1] };
    return { path: parts };
  }
  return null;
}

/** Split stored text on "/" line markers. */
export function lines(text: string): string[] {
  return (text ?? "")
    .split(/\s*\/\s*|\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export type ScriptName = "iast" | "devanagari" | "bengali" | "oriya";
export const SCRIPT_LABELS: Record<ScriptName, string> = { iast: "IAST", devanagari: "देवनागरी", bengali: "বাংলা", oriya: "ଓଡ଼ିଆ" };

/** Which Indic script a text is written in (for non-Sanskrit verses, e.g. Bengali in CC). */
export function detectScript(text: string): ScriptName | null {
  if (/[\u0980-\u09FF]/.test(text)) return "bengali";
  if (/[\u0B00-\u0B7F]/.test(text)) return "oriya";
  if (/[\u0900-\u097F]/.test(text)) return "devanagari";
  return null;
}

/**
 * IAST as printed in books separates words and marks compounds with hyphens
 * ("karma-phala-hetur bhūr mā te saṅgo 'stv akarmaṇi"). Indic scripts write
 * the same verse joined ("कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि"):
 *   - compound hyphens are dropped,
 *   - a word ending in a consonant runs into the next word,
 *   - an avagraha (') attaches to the word before it.
 * Words ending in a vowel, ṁ or ḥ stay separate, as in printed Devanagari.
 */
export function joinIastSandhi(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[’‘ʼ]/g, "'")
    .replace(/(\p{L}\p{M}*)-(?=\p{L})/gu, "$1")
    .replace(/\s+'/g, "'")
    .replace(/([kgcjṭḍtdpbmyrlvśṣsnñṅṇh])\s+(?=[\p{L}'])/gu, "$1");
}

/** Bengali printing conventions: khaṇḍa-ta (ৎ) for a dead t, য় for a non-initial ya. */
function bengaliOrthography(s: string) {
  return s
    .replace(/ত্(?![তথনমযরব])/g, "ৎ")
    .replace(/(?<=[\u0980-\u09FF])(?<!্)য(?!়)/g, "য়");
}

/** Convert text between scripts (lazy-loads the library). IAST → Indic joins sandhi (see joinIastSandhi). */
export async function convertScript(text: string, from: ScriptName, to: ScriptName, opts: { sanskrit?: boolean; join?: boolean } = {}): Promise<string> {
  if (!text || from === to) return text;
  const sanskrit = opts.sanskrit !== false;
  const join = sanskrit && opts.join !== false;
  const { default: Sanscript } = await import("@indic-transliteration/sanscript");
  const src =
    from === "iast"
      ? (join ? joinIastSandhi(text) : text.normalize("NFC").replace(/[’‘ʼ]/g, "'").replace(/(\p{L}\p{M}*)-(?=\p{L})/gu, "$1")).replace(/ṁ/g, "ṃ")
      : from === "bengali"
        ? text.normalize("NFC").replace(/য়/g, "য").replace(/ৎ/g, "ত্")
        : from === "oriya"
          ? text.replace(/\u0B5F/g, "\u0B2F")
          : text;
  const out = Sanscript.t(src, from, to);
  // keep the daṇḍas as daṇḍas in IAST (Sanscript writes | and ||)
  if (to === "iast") return out.replace(/\|\|/g, "॥").replace(/\|/g, "।");
  // Bengali, Hindi, Odia … as languages don't write a dead consonant at the end of a word.
  const dropFinal = (t: string, virama: string) => (sanskrit ? t : t.replace(new RegExp(`${virama}(?=[\\s,.;:!?।॥|]|$)`, "gu"), ""));
  if (to === "bengali") return dropFinal(bengaliOrthography(out), "\u09CD");
  if (to === "oriya") return dropFinal(out.replace(/(?<=[\u0B00-\u0B7F])(?<!\u0B4D)\u0B2F(?!\u0B3C)/g, "\u0B5F"), "\u0B4D");
  return dropFinal(out, "\u094D");
}

/**
 * Translation languages: a kind whose key ends in "_hi" is the Hindi version
 * of the kind without it (translation_hi ↔ translation). In Hindi, those
 * replace the English ones; in English, the Hindi ones are hidden.
 */
export function typesForLang<T extends { key: string }>(types: T[], _lang: "en" | "hi"): T[] {
  // Hindi is switched off for now (owner, 2026-10-30): Hindi kinds are never shown.
  return types.filter((t) => !t.key.endsWith("_hi"));
}
export const hasHindi = (_types: { key: string }[]) => false;
