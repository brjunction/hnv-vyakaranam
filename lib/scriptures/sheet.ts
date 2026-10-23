// Spreadsheet format for the Scriptures bulk updater — shared by the server
// (template export) and the browser (reading the uploaded file).
//
// Sheet "Verses":    <one column per level> | Verse | Shown as | Devanagari | IAST | Speaker | Status | <one column per commentary>
// Sheet "Divisions": <one column per level> | Shown as | Title | Title (Devanagari) | Subtitle | Expected
// Each level has its own column so Excel can never turn "1.10" into 1.1.

/** "Text" = the verse ONCE, in any script (IAST best). Old sheets with "Devanagari" / "IAST" columns still upload. */
export const VERSE_FIXED = ["Verse", "Shown as", "Text", "Speaker", "Status"] as const;
const LEGACY_TEXT = ["Devanagari", "IAST"] as const;
export const DIV_FIXED = ["Shown as", "Title", "Title (Devanagari)", "Subtitle", "Expected"] as const;
export const TOO_LONG = "[too long for a spreadsheet cell — edit it in the admin]";
export const CELL_MAX = 32000;

export const cellText = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

/** Simple HTML (paragraphs and line breaks only) ↔ plain text with blank lines. */
export function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<\/?p>/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}
export function plainToHtml(text: string): string {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}
/** Export a commentary: plain text when that round-trips exactly, otherwise the HTML. */
export function exportCell(html: string): string {
  if (!html) return "";
  const plain = htmlToPlain(html);
  const norm = (h: string) => h.replace(/<br\s*\/?>/gi, "<br>");
  const out = !/[<>]/.test(plain) && norm(plainToHtml(plain)) === norm(html) ? plain : html;
  return out.length > CELL_MAX ? TOO_LONG : out;
}

export type ParsedSheet = {
  rows: { location: string; verse: string; verseNo?: string; devanagari?: string; iast?: string; speaker?: string; status?: string; c: Record<string, string> }[];
  divisions: { location: string; number?: string; title?: string; titleDeva?: string; subtitle?: string; expected?: string }[];
  commentaryColumns: string[];
  levelColumns: string[];
  problems: string[];
};

/** Turn sheet rows (arrays of cell text) into import rows. `levels` = the book's level names. */
export function parseSheets(levels: string[], verses: string[][], divisions: string[][]): ParsedSheet {
  const out: ParsedSheet = { rows: [], divisions: [], commentaryColumns: [], levelColumns: levels, problems: [] };
  const lower = (s: string) => s.trim().toLowerCase();
  const levelIdx = (head: string[]) => levels.map((l) => head.findIndex((h) => lower(h) === lower(l)));

  if (verses.length) {
    const head = verses[0].map(cellText);
    const li = levelIdx(head);
    if (li.some((i) => i < 0)) out.problems.push(`The Verses sheet needs a column for each level: ${levels.join(", ")}.`);
    const fixed = Object.fromEntries(VERSE_FIXED.map((f) => [f, head.findIndex((h) => lower(h) === lower(f))]));
    if (fixed["Verse"] < 0) out.problems.push("The Verses sheet needs a “Verse” column.");
    const legacy = Object.fromEntries(LEGACY_TEXT.map((f) => [f, head.findIndex((h) => lower(h) === lower(f))]));
    const known = new Set([...levels.map(lower), ...VERSE_FIXED.map(lower), ...LEGACY_TEXT.map(lower)]);
    const commCols = head.map((h, i) => ({ h, i })).filter(({ h }) => h && !known.has(lower(h)));
    out.commentaryColumns = commCols.map((c) => c.h);
    if (!out.problems.length) {
      for (const r of verses.slice(1)) {
        const get = (i: number) => (i >= 0 ? cellText(r[i]) : "");
        const loc = li.map(get);
        const verse = get(fixed["Verse"]);
        if (!verse && loc.every((x) => !x)) continue;
        const c: Record<string, string> = {};
        for (const { h, i } of commCols) {
          const v = get(i);
          if (v && v !== TOO_LONG) c[h] = v;
        }
        out.rows.push({
          location: loc.join("."),
          verse,
          verseNo: get(fixed["Shown as"]) || undefined,
          ...(() => {
            const t = get(fixed["Text"]);
            if (t) return /[\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F]/.test(t) ? { devanagari: t, iast: "" } : { iast: t, devanagari: "" };
            return { devanagari: get(legacy["Devanagari"]) || undefined, iast: get(legacy["IAST"]) || undefined };
          })(),
          speaker: get(fixed["Speaker"]) || undefined,
          status: get(fixed["Status"]) || undefined,
          c,
        });
      }
    }
  }
  if (divisions.length) {
    const head = divisions[0].map(cellText);
    const li = levelIdx(head);
    const f = Object.fromEntries(DIV_FIXED.map((x) => [x, head.findIndex((h) => lower(h) === lower(x))]));
    for (const r of divisions.slice(1)) {
      const get = (i: number) => (i >= 0 ? cellText(r[i]) : "");
      const parts = li.map(get);
      const lastFilled = parts.reduce((n, p, i) => (p ? i : n), -1);
      if (lastFilled < 0) continue;
      out.divisions.push({
        location: parts.slice(0, lastFilled + 1).join("."),
        number: get(f["Shown as"]) || undefined,
        title: get(f["Title"]) || undefined,
        titleDeva: get(f["Title (Devanagari)"]) || undefined,
        subtitle: get(f["Subtitle"]) || undefined,
        expected: get(f["Expected"]) || undefined,
      });
    }
  }
  return out;
}
