import type { Line, Piece } from "@/lib/hnv/pdf-extract";

// Turns the typographic lines of an HNV volume into one record per sūtra.
//
// What the typography means in this book (checked on the real pages):
//   "Chapter …" 18 pt + centred titles     a prakaraṇa begins; prose up to the first sūtra = its introduction
//   centred 12 pt heading (+ subtitle)    a section begins; prose up to the next sūtra = its introduction
//   regular 10 pt "N. text"                the sūtra (verse sūtras continue on regular lines)
//   italic words + "—" meanings            the synonyms (word for word)
//   bold paragraph                         the English translation of the sūtra
//   italic paragraph                       the Sanskrit vṛtti
//   bold small-caps label + "—"            Vṛtti / Amṛta / Saṁśodhinī / Bāla
//   8.5 pt lines starting with a number    footnotes (the mark in the text is a raised number)
//   rows of cells with wide gaps           tables
//
// Sūtras are only accepted in strict order (1, 2, 3 …), so a number inside the
// text can never start a sūtra by mistake. Every oddity is reported.

export type Commentary = { key: string; label: string; html: string };
export type SutraBlock = {
  number: string;
  prakarana: string;
  /** plain IAST text of the sūtra (verse lines joined with " / ") */
  sutra: string;
  synonyms: string;
  translation: string;
  /** Sanskrit vṛtti followed by the English “Vṛtti—” part, as HTML */
  vrtti: string;
  commentaries: Commentary[];
  /** title of the section that begins just before this sūtra */
  section: string;
  pages: [number, number];
  warnings: string[];
};
export type Intro = { kind: "chapter" | "section"; title: string; html: string; beforeSutra: string; page: number };
export type ParseResult = { blocks: SutraBlock[]; intros: Intro[]; issues: string[] };

const text = (l: Line) => l.pieces.map((p) => p.t).join("");
const letters = (s: string) => s.replace(/[^\p{L}]/gu, "").length;
const ratio = (l: Line, f: "i" | "b") => {
  let all = 0;
  let on = 0;
  for (const p of l.pieces) {
    const n = letters(p.t);
    all += n;
    if (p[f]) on += n;
  }
  return all ? on / all : 0;
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// ------------------------------------------------------------------ labels
const KEYS: [RegExp, string, string][] = [
  [/\bsamsodhini\b/, "samsodhini", "Saṁśodhinī"],
  [/\bamrta\b/, "amrta", "Amṛta"],
  [/\bbala\b/, "bala", "Bāla"],
  [/\bvrtti\b/, "vrtti", "Vṛtti"],
];
const PLAIN = new Set(["vrtti", "amrta", "samsodhini", "bala"]);

/** A label at the start of a line (bold small caps up to the dash), or null. */
const BOLD_LABELS: Record<string, string> = {
  vrtti: "vrtti",
  amrta: "amrta",
  amrtasvadini: "amrta",
  amrtasvaditika: "amrta",
  amrtasvadinitika: "amrta",
  samsodhini: "samsodhini",
  bala: "bala",
  balatosani: "bala",
  balatosanitika: "bala",
};
const LABEL_NAME: Record<string, string> = { vrtti: "Vṛtti", amrta: "Amṛta", samsodhini: "Saṁśodhinī", bala: "Bāla" };

/** Bṛhat volumes: the label is bold (italic), not small caps — "Amṛta—", "Bāla-toṣaṇī-ṭīkā²—". */
function boldLabelOf(l: Line): { key: string; label: string; heading: string; rest: Piece[] } | null {
  const first = l.pieces.find((p) => p.t.trim());
  if (!first?.b) return null;
  let acc = "";
  for (let i = 0; i < l.pieces.length && i < 10; i++) {
    const p = l.pieces[i];
    if (/[—–]/.test(p.t)) {
      const before = (acc + p.t.split(/[—–]/)[0]).trim();
      const key = BOLD_LABELS[fold(before).replace(/[^a-z]/g, "")];
      if (!key) return null;
      const after = p.t.split(/[—–]/).slice(1).join("—");
      const rest = [...(after.trim() ? [{ ...p, t: after }] : []), ...l.pieces.slice(i + 1)];
      return { key, label: LABEL_NAME[key], heading: "", rest };
    }
    if (!p.b && !p.u) return null;
    if (!p.u) acc += p.t;
  }
  return null;
}

function labelOf(l: Line): { key: string; label: string; heading: string; rest: Piece[] } | null {
  if (!l.pieces[0]?.sc) return boldLabelOf(l);
  let acc = "";
  let i = 0;
  let dash = false;
  for (; i < l.pieces.length && i < 16; i++) {
    const p = l.pieces[i];
    if (!p.sc && !/^[\s—–-]*$/.test(p.t)) break;
    acc += p.t;
    if (/[—–]/.test(p.t)) {
      dash = true;
      i++;
      break;
    }
  }
  const name = acc.replace(/[—–]\s*$/, "").replace(/\s+/g, " ").trim();
  // small caps come out as capitals (“AmṛtA”, “SAṁśodhinī”): write the name properly
  const f = fold(name).replace(/\s+/g, " ");
  const nice = f.replace(/\b([a-z])/g, (m) => m.toUpperCase());
  const plainName = f.replace(/ /g, "");
  for (const [re, key, label] of KEYS) {
    if (PLAIN.has(plainName) && plainName === key) return { key, label, heading: "", rest: l.pieces.slice(i) };
    if (re.test(f)) {
      const sub = name.replace(/^\S+\s*/, "");
      return { key, label, heading: prettify(`${label} ${sub}`.trim()), rest: l.pieces.slice(i) };
    }
  }
  if (/\bbrhat\b/.test(f)) return { key: "vrtti", label: "Vṛtti", heading: prettify(name), rest: l.pieces.slice(i) };
  if (!dash) return null; // small caps inside a line (a name, a table title …)
  return { key: "vrtti", label: "Vṛtti", heading: prettify(nice), rest: l.pieces.slice(i) };
}
/** "BṛhAt 784" → "Bṛhat 784" (small caps arrive as capitals). */
const prettify = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (/^\p{L}/u.test(w) ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ")
    .replace(/\bOn\b/g, "on")
    .replace(/\bFor\b/g, "for")
    .replace(/\bAnd\b/g, "and");

// ------------------------------------------------------------------ html
const ENGLISH = /(?<![\p{L}\p{M}-])(the|of|and|is|are|an|a|in|on|to|for|with|by|from|as|or|this|that|grammar|book|volume|chapter|edition|language|school|press)(?![\p{L}\p{M}-])/iu;
type Tok = { t: string; i: boolean; b: boolean; u: boolean };
const toks = (pieces: Piece[]): Tok[] => pieces.map((p) => ({ t: p.t, i: !!p.i, b: !!p.b, u: !!p.u }));

/** Tokens → HTML. Only style that differs from the section's normal look is marked. */
function html(tokens: Tok[], base: { i: boolean; b: boolean }): string {
  let out = "";
  let cur: (Tok & { s: string }) | null = null;
  const flush = () => {
    if (!cur || !cur.s) return;
    let s = esc(cur.s);
    if (cur.u) s = `<sup>${s.trim()}</sup>`;
    else {
      const lead = /^\s*/.exec(s)![0];
      const trail = /\s*$/.exec(s)![0];
      let core = s.trim();
      if (core && /\p{L}/u.test(core)) {
        // italic = a Sanskrit term (converted when the reader switches script), unless it reads as English
        if (cur.i && !base.i) core = ENGLISH.test(core) ? `<i>${core}</i>` : `<i lang="sa">${core}</i>`;
        if (cur.b && !base.b) core = `<b>${core}</b>`;
      }
      s = lead + core + trail;
    }
    out += s;
  };
  for (const t of tokens) {
    const blank = !t.t.trim();
    if (cur && !cur.u && (blank || (cur.i === t.i && cur.b === t.b && !t.u))) {
      cur.s += t.t;
      continue;
    }
    flush();
    cur = { ...t, s: t.t };
  }
  flush();
  return tidy(out);
}

/** Small typographic tidying of generated HTML. */
const tidy = (h: string) =>
  h
    .replace(/<\/i>(\s*)<i>/g, "$1")
    .replace(/<\/i>(\s*)<i lang="sa">/g, "$1")
    .replace(/<\/b>(\s*)<b>/g, "$1")
    .replace(/<i>(\s*)<\/i>/g, "$1")
    .replace(/<b>(\s*)<\/b>/g, "$1")
    .replace(/ {2,}/g, " ")
    .replace(/\s+([,;:.)\]])(?![^<]*<\/sup>)/g, (m, p) => (/\d/.test(m) ? m : p))
    .trim();

function baseOf(lines: Line[]) {
  let all = 0;
  let b = 0;
  let i = 0;
  for (const l of lines)
    for (const p of l.pieces) {
      const n = letters(p.t);
      all += n;
      if (p.b) b += n;
      if (p.i) i += n;
    }
  // italic is never the base look: in this book italic always marks Sanskrit
  void i;
  return { b: all > 0 && b / all > 0.6, i: false };
}

/** Pieces of a line split into cells where the gap is wider than a word space. */
function cellsOf(l: Line): Piece[][] {
  const cells: Piece[][] = [];
  let cur: Piece[] = [];
  let end = -1e9;
  for (const p of l.pieces) {
    if (!p.t.trim() && cur.length) {
      cur.push(p);
      end = Math.max(end, p.x + p.w);
      continue;
    }
    if (cur.length && p.x - end > 8.5 * G.scale) {
      cells.push(cur);
      cur = [];
    }
    cur.push(p);
    end = Math.max(end, p.x + p.w);
  }
  if (cur.length) cells.push(cur);
  return cells.filter((c) => c.some((p) => p.t.trim()));
}
const isBullet = (c: Piece[]) => {
  const t = c.map((p) => p.t).join("").trim();
  return t.length <= 2 && !/\p{L}|\d/u.test(t);
};

type Segment = { kind: "text"; lines: Line[] } | { kind: "table"; rows: Piece[][][]; lines: Line[] };

function segments(lines: Line[]): Segment[] {
  const segs: Segment[] = [];
  const multi = lines.map((l) => {
    const c = cellsOf(l);
    return c.length >= 2 && !isBullet(c[0]) ? c : null;
  });
  for (let k = 0; k < lines.length; k++) {
    let j = k;
    const aligned = (a: Piece[][], b: Piece[][]) => a.filter((ca) => b.some((cb) => Math.abs(ca[0].x - cb[0].x) < 4)).length >= 2;
    while (
      j < lines.length &&
      multi[j] &&
      (j === k ||
        (lines[j].page === lines[j - 1].page &&
          (lines[j - 1].y - lines[j].y < 17 * G.scale || (lines[j - 1].y - lines[j].y < 48 * G.scale && aligned(multi[j - 1]!, multi[j]!)))))
    )
      j++;
    if (j - k >= 2) {
      segs.push({ kind: "table", rows: multi.slice(k, j) as Piece[][][], lines: lines.slice(k, j) });
      k = j - 1;
      continue;
    }
    const last = segs[segs.length - 1];
    if (last?.kind === "text") last.lines.push(lines[k]);
    else segs.push({ kind: "text", lines: [lines[k]] });
  }
  return segs;
}

const rightEdge = (l: Line) => Math.max(...l.pieces.map((p) => p.x + p.w));

/** Lines → paragraphs of tokens. A new paragraph starts after a vertical gap, or after a short last line across a page break. */
function paragraphs(lines: Line[], maxRight: number): { t: Tok[]; ls: Line[] }[] {
  const paras: { t: Tok[]; ls: Line[] }[] = [];
  let cur: Tok[] = [];
  let curLs: Line[] = [];
  let prev: Line | null = null;
  for (const l of lines) {
    const ts = toks(l.pieces);
    if (!ts.length) continue;
    let br = false;
    if (prev) {
      if (prev.page === l.page) br = prev.y - l.y > 16.5 * G.scale;
      else br = rightEdge(prev) < maxRight - 30 && /[.:!?”’)]\s*$/.test(text(prev));
      // a centred line (heading, verse) is its own paragraph
      const centred = (x: Line) => x.pieces[0].x >= G.left + 50 && rightEdge(x) < maxRight - 30;
      if (centred(l) !== centred(prev)) br = true;
    }
    // a bullet line always starts a new paragraph
    if (/^\s*[♦•▪◆➢]/.test(text(l))) br = true;
    if (prev && br && cur.length) {
      paras.push({ t: cur, ls: curLs });
      cur = [];
      curLs = [];
    }
    if (cur.length) {
      const last = cur[cur.length - 1];
      if (!/[-‐]$/.test(last.t) || /\s$/.test(last.t)) cur.push({ t: " ", i: last.i, b: last.b, u: false });
    }
    cur.push(...ts);
    curLs.push(l);
    prev = l;
  }
  if (cur.length) paras.push({ t: cur, ls: curLs });
  return paras;
}

type Notes = { text: Map<string, string>; used: Set<string> };

/** HTML of some lines (paragraphs and tables), with the footnotes whose marks are in it appended. */
function render(lines: Line[], notes: Notes, opts: { plain?: boolean; en?: boolean } = {}): string {
  const L = opts.en ? ' lang="en"' : "";
  const ls = lines.filter((l) => l.pieces.some((p) => p.t.trim()));
  if (!ls.length) return "";
  const base = baseOf(ls);
  const maxRight = Math.max(...ls.map(rightEdge));
  const parts: string[] = [];
  for (const seg of segments(ls)) {
    if (seg.kind === "table") {
      const b = baseOf(seg.lines);
      const width = Math.max(...seg.rows.map((r) => r.length));
      const rows = seg.rows.map((r, ri) => {
        const head = ri === 0 && seg.lines[0].pieces.every((p) => p.b || !p.t.trim() || p.i);
        const tag = head && seg.rows.length > 2 && r.length === width ? "th" : "td";
        const cells = r.map((c) => `<${tag}>${html(toks(c), b)}</${tag}>`);
        while (cells.length < width) cells.push("<td></td>");
        return `<tr>${cells.join("")}</tr>`;
      });
      parts.push(`<table${L}><tbody>${rows.join("")}</tbody></table>`);
    } else {
      for (const p of paragraphs(seg.lines, maxRight)) {
        const h = opts.plain ? tidy(esc(p.t.map((t) => (t.u ? "" : t.t)).join(""))) : html(p.t, base);
        if (!h) continue;
        // a short centred line on its own (not a verse quarter) is a small heading inside the text
        const plainLen = p.t.map((t) => t.t).join("").trim().length;
        const one = p.ls.length === 1 ? p.ls[0] : null;
        if (!opts.plain && one && plainLen < 60 && one.pieces[0].x >= G.left + 50 && ratio(one, "i") < 0.5 && !/[.,;:/]$/.test(text(one).trim())) parts.push(`<h4${L}>${h}</h4>`);
        else if (p.ls.every((l) => l.pieces[0].x >= G.left + 25) && p.ls.length <= 8 && ratio(p.ls[0], "i") > 0.6) {
          // an indented verse: keep its lines
          const lineH = (l: Line) => (opts.plain ? tidy(esc(l.pieces.filter((x) => !x.u).map((x) => x.t).join(""))) : html(toks(l.pieces), base));
          parts.push(`<p${L} style="text-align: center">${p.ls.map(lineH).join("<br>")}</p>`);
        }
        else parts.push(`<p${L}>${h}</p>`);
      }
    }
  }
  const body = parts.join("");
  // footnotes whose mark is in these lines
  const marks: string[] = [];
  for (const l of ls) for (const p of l.pieces) if (p.u) marks.push(`${l.page}:${p.t.trim()}`);
  const out: string[] = [];
  for (const key of [...new Set(marks)]) {
    const t = notes.text.get(key);
    if (!t || notes.used.has(key)) continue;
    notes.used.add(key);
    out.push(`<p${L}><sup>${esc(key.split(":")[1])}</sup> ${t}</p>`);
  }
  return body + (out.length ? `<hr>${out.join("")}` : "");
}

// ------------------------------------------------------------------ footnote marks
/**
 * Footnote marks are raised numbers. pdf.js usually reports them as a small,
 * separate piece (flag u); sometimes the digits are glued to the word before
 * them, or stand alone at text size. For each footnote of a page (in order),
 * the mark is looked for in the text of that page and flagged.
 */
function attachMarks(body: Line[], fnText: Map<string, string>) {
  const byPage = new Map<number, string[]>();
  for (const k of fnText.keys()) {
    const [pg, mark] = k.split(":");
    byPage.set(Number(pg), [...(byPage.get(Number(pg)) ?? []), mark]);
  }
  for (const [pg, marks] of byPage) {
    const ls = body.filter((l) => l.page === pg);
    let from = 0;
    for (const mark of marks.filter((m) => /^\d+$/.test(m)).sort((a, b) => Number(a) - Number(b))) {
      if (ls.some((l) => l.pieces.some((p) => p.u && p.t.trim() === mark))) continue;
      const glued = new RegExp(`([\\p{L}\\p{M}.,;:)’”])(${mark})(?=[\\s)\\]”’,.;:]|$)`, "u");
      outer: for (let li = from; li < ls.length; li++) {
        const l = ls[li];
        for (let pi = 0; pi < l.pieces.length; pi++) {
          const p = l.pieces[pi];
          if (p.t.trim() === mark) {
            const prev = l.pieces.slice(0, pi).map((x) => x.t).join("").trim();
            if (prev && !/(sūtras?|vṛtti|verse|chapter|no\.|appendix|page|text|Bṛhat|BG|SB|CC|and|to|or)$/i.test(prev) && !/[+→=(]$/.test(prev)) {
              p.u = 1;
              from = li;
              break outer;
            }
          } else {
            const m = glued.exec(p.t);
            if (m && p.t.length > mark.length) {
              const at = m.index + m[1].length;
              const head = p.t.slice(0, at);
              const tail = p.t.slice(at + mark.length);
              const w = p.w || 1;
              const parts: Piece[] = [{ ...p, t: head, w: (w * head.length) / p.t.length }, { ...p, t: mark, u: 1, w: 0 }];
              if (tail) parts.push({ ...p, t: tail, w: (w * tail.length) / p.t.length });
              l.pieces.splice(pi, 1, ...parts);
              from = li;
              break outer;
            }
          }
        }
      }
    }
  }
}

// ------------------------------------------------------------------ main
/**
 * The page geometry of the volume being read (the Madhyama and Bṛhat volumes are
 * set differently: 10 pt on 432×648 pages, 12 pt on 612×792 pages). Every size and
 * distance used above is relative to it. Set at the start of parseVolume.
 */
/** A part's own title as its heading (Bṛhat volumes have no "Chapter …" line). */
export const PART_TITLE = /(prakaraṇam\d*|maṅgalācaraṇam|granthopasaṁhāraḥ)$/i;

const G = {
  body: 10,
  left: 48,
  scale: 1,
  head: (l: Line) => l.y > 600 || l.y < 30,
};

function measure(lines: Line[]) {
  const sizes = new Map<number, number>();
  const lefts = new Map<number, number>();
  let maxY = 0;
  for (const l of lines) {
    const n = text(l).length;
    sizes.set(l.size, (sizes.get(l.size) ?? 0) + n);
    if (l.pieces[0]) lefts.set(Math.round(l.pieces[0].x), (lefts.get(Math.round(l.pieces[0].x)) ?? 0) + n);
    maxY = Math.max(maxY, l.y);
  }
  const top = (m: Map<number, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  G.body = top(sizes)[0]?.[0] ?? 10;
  G.scale = G.body / 10;
  const common = top(lefts).slice(0, 3).filter(([, c], _, arr) => c > arr[0][1] * 0.25).map(([x]) => x);
  G.left = common.length ? Math.min(...common) : 48;
  // running heads and page numbers: text repeated at the very top or bottom of many pages
  const pages = new Set(lines.map((l) => l.page)).size || 1;
  const key = (l: Line) => `${Math.round(l.y / 3)}|${text(l).replace(/\d+/g, "#").trim()}`;
  const freq = new Map<string, number>();
  for (const l of lines) if (l.y > maxY - 45 || l.y < 45) freq.set(key(l), (freq.get(key(l)) ?? 0) + 1);
  // the top line of a page that stands apart from the text below it (a running head)
  const apart = new Set<Line>();
  const byPage = new Map<number, Line[]>();
  for (const l of lines) byPage.set(l.page, [...(byPage.get(l.page) ?? []), l]);
  for (const ls of byPage.values()) {
    const s2 = [...ls].sort((a, b) => b.y - a.y);
    if (s2.length > 1 && s2[0].y - s2[1].y >= G.body * 1.8 && s2[0].y > maxY - 45) apart.add(s2[0]);
  }
  G.head = (l: Line) => {
    if (!(l.y > maxY - 45 || l.y < 45)) return false;
    const t = text(l).trim();
    if (/^\d{1,4}$/.test(t) && (l.y < 45 || l.y > maxY - 15 || apart.has(l))) return true;
    if ((freq.get(key(l)) ?? 0) >= Math.max(3, pages * 0.15)) return true;
    // "34 Hari-nāmāmṛta-vyākaraṇam", "Saṁjñā 35" — but never a sūtra ("36. upendrāt …")
    return apart.has(l) && t.length < 60 && !/^\d{1,4}\.\s/.test(t) && (/^\d{1,4}\s*[^\d.\s]/.test(t) || /[^\d\s]\s*\d{1,4}$/.test(t));
  };
}

const isCentredHeading = (l: Line) => {
  const t = text(l).trim();
  return l.pieces[0].x >= G.left + 50 && l.size >= G.body * 1.15 && l.size < G.body * 1.6 && t.length > 2 && t.length < 90 && !l.pieces[0].sc && (ratio(l, "b") > 0.6 || ratio(l, "i") > 0.6);
};

export type ParseOptions = {
  firstPage: number;
  lastPage: number;
  /** number of the first sūtra / verse */
  startAt: number;
  /** "sutras": "N. text" sūtras. "verses": the numbered verses of the Invocation / Afterword. */
  mode?: "sutras" | "verses";
  /** verses only: their numbers become "<prefix>.<n>" (e.g. "0.1" → 0.1.1) */
  prefix?: string;
};

export function parseVolume(all: Line[], opts: ParseOptions): ParseResult {
  const verses = opts.mode === "verses";
  const issues: string[] = [];
  const lines = all.filter((l) => l.page >= opts.firstPage && l.page <= opts.lastPage);
  measure(lines);

  // 1 · footnotes ("20 For the details…", continued on the following small lines)
  const fnText = new Map<string, string>();
  const body: Line[] = [];
  let lastKey = "";
  let lastNum = 0;
  for (const l of lines) {
    if (l.devSutra && !l.pieces.length) {
      body.push(l);
      continue;
    }
    if (G.head(l)) continue; // running head, page number
    const t = text(l).trim();
    if (!t || /^[\s,.;:‾/|]*$/.test(t)) continue; // leftovers of the dropped Devanagari
    if (l.size <= G.body * 0.89 && l.size >= G.body * 0.6) {
      const m = /^(\d{1,3}|i|ii|iii|iv|v|vi|[a-e])\s+(\S.*)$/.exec(t);
      // a new footnote: the next number in the series (or a restart at 1), or a letter mark
      const num = /^\d/.test(m?.[1] ?? "") ? Number(m![1]) : NaN;
      const isNew = m && (Number.isNaN(num) ? l.pieces[0].t.trim() === m[1] : num === lastNum + 1 || num === 1 || lastNum === 0);
      if (m && isNew) {
        if (!Number.isNaN(num)) lastNum = num;
        lastKey = `${l.page}:${m[1]}`;
        const rest: Line = { ...l, pieces: l.pieces.slice(1) };
        const first = l.pieces[0].t.trim() === m[1] ? rest : { ...l, pieces: [{ ...l.pieces[0], t: l.pieces[0].t.replace(/^\s*\S+\s*/, "") }, ...l.pieces.slice(1)] };
        fnText.set(lastKey, html(toks(first.pieces), { i: false, b: false }));
      } else if (lastKey) fnText.set(lastKey, `${fnText.get(lastKey)} ${html(toks(l.pieces), { i: false, b: false })}`.replace(/- (\p{Ll})/gu, "-$1"));
      continue;
    }
    body.push(l);
  }
  attachMarks(body, fnText);
  const notes: Notes = { text: fnText, used: new Set() };

  // 2 · split into chapter / section introductions and sūtra blocks
  type Raw = { number: number; prakarana: string; section: string; lines: Line[]; first: number; last: number };
  type RawIntro = { kind: "chapter" | "section"; title: string[]; lines: Line[]; page: number };
  const raws: Raw[] = [];
  const rawIntros: (RawIntro & { before: number })[] = [];
  let expected = opts.startAt;
  let prak = "";
  let cur: Raw | null = null;
  // text before the first heading is kept too (e.g. the opening line of the Invocation)
  let intro: (RawIntro & { before: number }) | null = { kind: "chapter", title: [], lines: [], page: opts.firstPage, before: opts.startAt };
  rawIntros.push(intro);
  let titleMode = false;
  let inVerseLines = false;
  // verses numbered on the page (Madhyama) or not (Bṛhat)?
  const numberedVerses =
    verses && body.filter((l) => /^\d{1,2}$/.test(text(l).trim()) && l.size >= G.body * 0.85 && l.pieces[0]?.x >= G.left + 60).length >= 2;
  const skipped: number[] = [];
  const unconfirmed: number[] = [];

  let devSeen = -1; // the last Devanagari sūtra heading ("N / …"), and where
  let devAt = -10;
  for (let li = 0; li < body.length; li++) {
    const l = body[li];
    if (l.devSutra) {
      devSeen = l.devSutra;
      devAt = li;
      if (!l.pieces.length) continue;
    }
    const t = l.pieces.filter((p) => !p.u).map((p) => p.t).join("").trim();
    if (l.size >= 16 && (/^(Chapter|Invocation|Afterword)\b/i.test(t) || PART_TITLE.test(t))) {
      intro = { kind: "chapter", title: PART_TITLE.test(t) ? [t] : [], lines: [], page: l.page, before: expected };
      rawIntros.push(intro);
      cur = null;
      titleMode = true;
      prak = /prakaraṇam$/i.test(t) ? t.replace(/-?prakaraṇam$/i, "") : "";
      continue;
    }
    if (verses) {
      const indented = (x: Line) => x.pieces[0].x >= G.left + 50 && !/—/.test(text(x)) && x.size >= G.body * 0.9;
      const synLike = (x: Line) => {
        const f = x.pieces.find((p) => p.t.trim());
        return !!f?.i && /—/.test(text(x).slice(0, 60)) && x.pieces[0].x < G.left + 20;
      };
      const nextHeading = body.slice(li + 1, li + 3).some((n) => n.size >= 16);
      // (a) a verse begins with its number alone, centred (Madhyama)
      const numbered = /^\d{1,2}$/.test(t) && Number(t) === expected && l.size >= G.body * 0.85 && l.pieces[0].x >= G.left + 60 && !nextHeading;
      // (b) or, unnumbered (Bṛhat), with its indented lines, when synonyms follow them
      let unnumbered = false;
      const curLines = (cur as Raw | null)?.lines.length ?? 0;
      if (!numberedVerses && !numbered && indented(l) && !inVerseLines && (!cur || curLines > 0)) {
        let k = li + 1;
        while (k < body.length && k < li + 10 && indented(body[k])) k++;
        unnumbered = k < body.length && synLike(body[k]);
      }
      inVerseLines = indented(l) && (inVerseLines || numbered || unnumbered || (cur !== null && curLines === 0));
      if (unnumbered) {
        const section = intro?.kind === "section" ? intro.title.join(" — ") : "";
        cur = { number: expected, prakarana: prak, section, lines: [l], first: l.page, last: l.page };
        raws.push(cur);
        intro = null;
        titleMode = false;
        expected++;
        continue;
      }
      if (numbered) {
        const section = intro?.kind === "section" ? intro.title.join(" — ") : "";
        cur = { number: expected, prakarana: prak, section, lines: [], first: l.page, last: l.page };
        raws.push(cur);
        intro = null;
        titleMode = false;
        expected++;
        continue;
      }
    }
    const m = verses ? null : /^(\d{1,4})\.(?:\s+\S.*|\s*)$/.exec(t);
    // a sūtra missing or unreadable in the PDF must not stop the rest: the next one or two are taken too
    const gap = m ? Number(m[1]) - expected : -1;
    const looksSutra =
      m && (gap === 0 || ((gap === 1 || gap === 2) && t.length > 6 && l.pieces[0].x <= G.left + 4)) && !l.pieces[0].i && !l.pieces[0].b && !l.pieces[0].sc && Math.abs(l.size - G.body) <= 0.6 &&
      // confirmed by the Devanagari heading just above, or at least not English prose
      ((devSeen === expected && li - devAt <= 3) || (t.replace(/^\d+\.\s*/, "").match(/(?<![\p{L}\p{M}-])(the|of|and|is|are|an|when|example|for|with|this|that|see|in)(?![\p{L}\p{M}-])/giu)?.length ?? 0) < 2);
    if (looksSutra) {
      if (gap > 0) {
        for (let k = expected; k < expected + gap; k++) skipped.push(k);
        expected += gap;
      }
      if (!(devSeen === expected && li - devAt <= 3)) unconfirmed.push(expected);
      const section = intro?.kind === "section" ? intro.title.join(" — ") : "";
      cur = { number: expected, prakarana: prak, section, lines: [l], first: l.page, last: l.page };
      raws.push(cur);
      intro = null;
      titleMode = false;
      expected++;
      continue;
    }
    if (titleMode && intro && intro.title.length < (intro.kind === "chapter" ? 5 : 2) && (l.pieces[0].x >= G.left + 40 || l.size >= G.body * 1.12) && t.length < 90 && !/^\d/.test(t) && (l.size >= G.body * 1.05 || intro.title.length > 0)) {
      intro.title.push(t);
      if (!prak && l.size >= 13) prak = t.replace(/-?prakaraṇam$/i, "");
      continue;
    }
    titleMode = false;
    if (isCentredHeading(l)) {
      intro = { kind: "section", title: [t.replace(/^\[|\]$/g, "")], lines: [], page: l.page, before: expected };
      rawIntros.push(intro);
      cur = null;
      titleMode = true;
      continue;
    }
    if (intro) intro.lines.push(l);
    else if (cur) {
      cur.lines.push(l);
      cur.last = l.page;
    }
  }

  // 3 · the parts of each sūtra
  const blocks: SutraBlock[] = raws.map((r) => {
    const warnings: string[] = [];
    const ls = r.lines;
    const sutLines: Line[] = [];
    let idx = 0;
    if (verses) {
      // the verse: its centred lines, up to the synonyms
      while (idx < ls.length && (ls[idx].pieces[0].x >= G.left + 40 || ratio(ls[idx], "i") > 0.6) && ls[idx].pieces[0].x > G.left + 5 && !/—/.test(text(ls[idx])) && !labelOf(ls[idx])) sutLines.push(ls[idx++]);
    } else {
      sutLines.push({ ...ls[0], pieces: stripNumber(ls[0].pieces) });
      idx = 1;
      while (idx < ls.length) {
        const l = ls[idx];
        if (l.pieces.some((p) => (p.i || p.b || p.sc) && p.t.trim()) || labelOf(l)) break;
        sutLines.push(l);
        idx++;
      }
    }
    const syn: Line[] = [];
    const tr: Line[] = [];
    const skt: Line[] = [];
    const com: { key: string; label: string; heading: string; lines: Line[] }[] = [];
    let state: "syn" | "tr" | "skt" | "com" = "syn";
    for (; idx < ls.length; idx++) {
      const l = ls[idx];
      const lab = labelOf(l);
      if (lab) {
        state = "com";
        com.push({ key: lab.key, label: lab.label, heading: lab.heading, lines: lab.rest.some((p) => p.t.trim()) ? [{ ...l, pieces: lab.rest }] : [] });
        continue;
      }
      if (state === "com") {
        com[com.length - 1].lines.push(l);
        continue;
      }
      const b = ratio(l, "b");
      const i = ratio(l, "i");
      if (state === "syn") {
        if (b > 0.5) (state = "tr"), tr.push(l);
        else syn.push(l);
      } else if (state === "tr") {
        if (b <= 0.5 && i > 0.6) (state = "skt"), skt.push(l);
        else tr.push(l);
      } else skt.push(l);
    }

    // a line that runs to the right margin wraps; a short one ends a verse quarter (" / ")
    const width = Math.max(...ls.slice(0, 40).map(rightEdge));
    let sutra = "";
    sutLines.forEach((l, k) => {
      const t = l.pieces.filter((p) => !p.u).map((p) => p.t).join("").replace(/\s+/g, " ").trim();
      if (!t) return;
      if (!sutra) sutra = t;
      else if (verses) sutra += ` / ${t}`;
      else if (/[-‐]$/.test(sutra) && rightEdge(sutLines[k - 1]) > width - 40) sutra += t;
      else if (rightEdge(sutLines[k - 1]) > width - 40) sutra += ` ${t}`;
      else sutra += ` / ${t}`;
    });
    const sutNotes = render(sutLines, notes).split("<hr>")[1] ?? ""; // footnotes on the sūtra itself
    let synonyms = render(syn, notes);
    if (sutNotes) synonyms += synonyms.includes("<hr>") ? sutNotes : `<hr>${sutNotes}`;
    const translation = render(tr, notes);
    let vrtti = render(skt, notes, { plain: true });

    const byKey = new Map<string, Commentary>();
    for (const c of com) {
      const h = render(c.lines, notes, { en: c.key === "vrtti" });
      if (!h && !c.heading) {
        warnings.push(`${c.label}: no text`);
        continue;
      }
      const piece = (c.heading ? `<h4${c.key === "vrtti" ? ' lang="en"' : ""}>${esc(c.heading)}</h4>` : "") + h;
      if (c.key === "vrtti") {
        vrtti += piece;
        continue;
      }
      const prev = byKey.get(c.key);
      if (prev) prev.html += piece;
      else byKey.set(c.key, { key: c.key, label: c.label, html: piece });
    }
    vrtti = vrtti.trim();
    sutra = sutra.replace(/^\d{1,4}\.\s*/, "").replace(/([[(])\s+/g, "$1").replace(/\s+([\])])/g, "$1");
    if (!sutra) warnings.push("no sūtra text");
    if (!translation) warnings.push("no translation found");
    if (!synonyms) warnings.push("no synonyms found");
    if (/[äéüåèìïöòëçàùÿû]/.test(sutra)) warnings.push("a Balarama letter was left in the sūtra");
    return {
      number: verses ? `${opts.prefix ?? "0"}.${r.number}` : String(r.number),
      prakarana: r.prakarana,
      sutra,
      synonyms,
      translation,
      vrtti,
      commentaries: [...byKey.values()],
      section: r.section,
      pages: [r.first, r.last],
      warnings,
    };
  });

  // pages with overlapping text: flag every sūtra printed on them
  const overlapPages = [...new Set(lines.filter((l) => l.overlap).map((l) => l.page))];
  for (const pg of overlapPages)
    for (const b of blocks)
      if (b.pages[0] <= pg && pg <= b.pages[1]) b.warnings.push(`page ${pg}: text printed over other text in the PDF — compare with the printed page`);
  if (overlapPages.length) issues.push(`${overlapPages.length} page(s) have text printed over other text (hidden layers in the PDF): ${overlapPages.join(", ")}.`);

  const intros: Intro[] = rawIntros
    .map((i) => ({ kind: i.kind, title: i.title.join(" — "), html: render(i.lines, notes), beforeSutra: verses ? `${opts.prefix ?? "0"}.${i.before}` : String(i.before), page: i.page }))
    .filter((i) => i.title || i.html);

  if (raws.length && raws[raws.length - 1].number + 1 !== expected) issues.push("Internal: sūtra counter mismatch.");
  if (skipped.length) issues.push(`${skipped.length} sūtra(s) not found in the PDF (the next one was taken): ${skipped.join(", ")} — check them after the import.`);
  if (unconfirmed.length) issues.push(`${unconfirmed.length} sūtra(s) found without the Devanagari heading above them (checked by style only): ${unconfirmed.slice(0, 40).join(", ")}${unconfirmed.length > 40 ? " …" : ""}.`);
  // A footnote whose mark was not found is never dropped: it goes to the end of
  // the sūtra (or introduction) printed on its page, with a warning.
  const lost = [...fnText.keys()].filter((k) => !notes.used.has(k));
  for (const key of lost) {
    const [pg, mark] = key.split(":");
    const note = `<hr><p><sup>${esc(mark)}</sup> ${fnText.get(key)}</p>`;
    const b = [...blocks].reverse().find((x) => x.pages[0] <= Number(pg) && Number(pg) <= x.pages[1]);
    const i = intros.find((x) => x.page <= Number(pg) && (!b || Number(b.number) < Number(x.beforeSutra)));
    if (b && !(i && i.page > b.pages[0])) {
      const last = b.commentaries[b.commentaries.length - 1];
      if (last) last.html += note;
      else b.vrtti += note;
      b.warnings.push(`footnote ${mark} (page ${pg}): mark not found in the text, note placed at the end`);
    } else if (i) i.html += note;
    else issues.push(`Footnote ${mark} on page ${pg} belongs to no sūtra.`);
  }
  if (lost.length) issues.push(`${lost.length} footnote mark(s) not found in the text; those notes were put at the end of their sūtra.`);
  return { blocks, intros, issues };
}

/** The first line of a sūtra without its "N." */
function stripNumber(pieces: Piece[]): Piece[] {
  const out = pieces.map((p) => ({ ...p }));
  for (const p of out) {
    if (!p.t.trim()) continue;
    p.t = p.t.replace(/^\s*\d{1,4}\.\s*/, "");
    break;
  }
  return out;
}
