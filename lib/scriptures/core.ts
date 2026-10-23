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
export const RESERVED_CODES = ["d", "v", "new", "read", "search", "api"];

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

/** Convert text between scripts (lazy-loads the library). */
export async function convertScript(text: string, from: ScriptName, to: ScriptName): Promise<string> {
  if (!text || from === to) return text;
  const { default: Sanscript } = await import("@indic-transliteration/sanscript");
  const src = from === "iast" ? text.normalize("NFC").replace(/ṁ/g, "ṃ") : text;
  const out = Sanscript.t(src, from, to);
  // keep the daṇḍas as daṇḍas in IAST (Sanscript writes | and ||)
  return to === "iast" ? out.replace(/\|\|/g, "॥").replace(/\|/g, "।") : out;
}
