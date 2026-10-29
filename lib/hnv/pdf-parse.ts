import type { Line, Piece } from "@/lib/hnv/pdf-extract";

// Turns the typographic lines of an HNV volume into one record per sūtra.
//
// What the typography means in this book (checked on the real pages):
//   regular, 10 pt, "N. text"      the sūtra (verse sūtras continue on regular lines)
//   italic words + "—" meanings    the synonyms (word-for-word)
//   bold paragraph                 the English translation of the sūtra
//   italic paragraph               the Sanskrit vṛtti
//   bold small-caps label + "—"    Vṛtti / Amṛta / Saṁśodhinī / Bālā  → a commentary
//   8.5 pt lines with a number     footnotes (the mark in the text is a raised number)
//
// Nothing is guessed silently: every oddity goes to `warnings` of that sūtra.

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
  /** centred headings printed just before this sūtra */
  headings: string[];
  pages: [number, number];
  warnings: string[];
};
export type ParseResult = { blocks: SutraBlock[]; issues: string[] };

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

const LABELS: [RegExp, string, string][] = [
  [/^v\s*[ṛr]tti$/i, "vrtti", "Vṛtti"],
  [/^a\s*m\s*[ṛr]ta$/i, "amrta", "Amṛta"],
  [/^s\s*a\s*[ṁm]\s*ś\s*o\s*dhin[īi]$/i, "samsodhini", "Saṁśodhinī"],
  [/^b[āa]l[āa]$/i, "bala", "Bāla"],
];

/** The label at the start of a line (bold small caps up to the dash), or null. */
function labelOf(l: Line): { key: string; label: string; rest: Piece[] } | null {
  const first = l.pieces[0];
  if (!first?.sc) return null;
  let acc = "";
  let i = 0;
  for (; i < l.pieces.length && i < 14; i++) {
    const p = l.pieces[i];
    acc += p.t;
    if (/[—–-]/.test(p.t)) {
      i++;
      break;
    }
  }
  const name = acc.replace(/[—–-]\s*$/, "").replace(/\s+/g, " ").trim();
  for (const [re, key, label] of LABELS) if (re.test(name.replace(/\s+/g, ""))) return { key, label, rest: l.pieces.slice(i) };
  // “Amṛta on Bṛhat 784—”, “Vṛtti for Bṛhat 1212”: keep as its own, named commentary
  const nice = name.replace(/\b(\p{L})(\p{L}*)/gu, (_, a: string, b: string) => a.toUpperCase() + b.toLowerCase());
  return { key: "other:" + nice.toLowerCase().replace(/[^a-zā-ž0-9]+/g, "-"), label: nice, rest: l.pieces.slice(i) };
}

type Tok = { t: string; i: boolean; b: boolean; u: boolean };

function toTokens(pieces: Piece[]): Tok[] {
  return pieces.map((p) => ({ t: p.t, i: !!p.i, b: !!p.b, u: !!p.u }));
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Tokens → HTML. Style that is the section's normal look is not marked; only what differs is. */
function html(tokens: Tok[], base: { i: boolean; b: boolean }): string {
  let out = "";
  let cur: { i: boolean; b: boolean; u: boolean; s: string } | null = null;
  const flush = () => {
    if (!cur || !cur.s) return;
    let s = esc(cur.s);
    if (cur.u) s = `<sup>${s.trim()}</sup>`;
    else {
      const lead = /^\s*/.exec(s)![0];
      const trail = /\s*$/.exec(s)![0];
      let core = s.trim();
      if (core) {
        if (cur.i !== base.i && cur.i) core = `<i>${core}</i>`;
        if (cur.b !== base.b && cur.b) core = `<b>${core}</b>`;
      }
      s = lead + core + trail;
    }
    out += s;
  };
  for (const t of tokens) {
    const blank = !t.t.trim();
    if (cur && (blank || (cur.i === t.i && cur.b === t.b && cur.u === t.u))) {
      cur.s += t.t;
      continue;
    }
    flush();
    cur = { i: t.i, b: t.b, u: t.u, s: t.t };
  }
  flush();
  return out.replace(/<\/i>(\s*)<i>/g, "$1").replace(/<\/b>(\s*)<b>/g, "$1");
}

/** Lines → paragraphs of tokens (a new paragraph after a gap larger than a line). */
function paragraphs(lines: Line[]): Tok[][] {
  const paras: Tok[][] = [];
  let cur: Tok[] = [];
  let prev: Line | null = null;
  for (const l of lines) {
    const toks = toTokens(l.pieces);
    if (!toks.length) continue;
    const gap = prev && prev.page === l.page ? prev.y - l.y : 0;
    if (prev && gap > 16.5 && cur.length) {
      paras.push(cur);
      cur = [];
    }
    if (cur.length) {
      const last = cur[cur.length - 1];
      if (!/-\s*$/.test(last.t) || /\s$/.test(last.t)) cur.push({ t: " ", i: last.i, b: last.b, u: false });
    }
    cur.push(...toks);
    prev = l;
  }
  if (cur.length) paras.push(cur);
  return paras;
}

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
  return { b: all > 0 && b / all > 0.6, i: all > 0 && i / all > 0.6 };
}

const toHtml = (lines: Line[], fnText: Map<string, string>, used: Set<string>) => {
  if (!lines.length) return "";
  const base = baseOf(lines);
  const body = paragraphs(lines)
    .map((p) => `<p>${html(p, base).trim()}</p>`)
    .join("");
  // footnotes whose mark appears in this text
  const marks = [...body.matchAll(/<sup>([^<]+)<\/sup>/g)].map((m) => m[1].trim());
  const notes = [...new Set(marks)]
    .map((m) => {
      const k = lines.find((l) => l.pieces.some((p) => p.u && p.t.trim() === m))?.page;
      const key = `${k}:${m}`;
      const t = fnText.get(key);
      if (t) used.add(key);
      return t ? `<p><sup>${esc(m)}</sup> ${esc(t)}</p>` : "";
    })
    .filter(Boolean)
    .join("");
  return body + (notes ? `<hr>${notes}` : "");
};

/**
 * Footnote marks are raised numbers. Usually pdf.js reports them as a small separate
 * piece (flag u); sometimes the digits are glued to the word before them or stand
 * alone without a size change. For each footnote of a page (in order) the mark is
 * found in the text of that page and flagged, so it can be shown as a raised number.
 */
function attachMarks(body: Line[], fnText: Map<string, string>) {
  const pages = new Map<number, string[]>();
  for (const k of fnText.keys()) {
    const [pg, mark] = [Number(k.split(":")[0]), k.split(":")[1]];
    pages.set(pg, [...(pages.get(pg) ?? []), mark]);
  }
  for (const [pg, marks] of pages) {
    const ls = body.filter((l) => l.page === pg);
    let from = 0;
    for (const mark of marks.filter((m) => /^\d+$/.test(m)).sort((a, b) => Number(a) - Number(b))) {
      // already flagged by the extractor?
      let done = false;
      for (let li = 0; li < ls.length && !done; li++) done = ls[li].pieces.some((p) => p.u && p.t.trim() === mark);
      if (done) continue;
      const glued = new RegExp(`([\\p{L}\\p{M}.,;:)’”])(${mark})(?=[\\s)\\]”’,.;:]|$)`, "u");
      outer: for (let li = from; li < ls.length; li++) {
        const l = ls[li];
        for (let pi = 0; pi < l.pieces.length; pi++) {
          const p = l.pieces[pi];
          if (p.t.trim() === mark) {
            const prev = l.pieces.slice(0, pi).map((x) => x.t).join("").trim();
            if (prev && !/(sūtras?|vṛtti|verse|chapter|no\.|appendix|page|BG|SB|CC)$/i.test(prev)) {
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

const BODY_TOP = 600;
const BODY_BOTTOM = 30;
const FOOT = 8.9;

export function parseVolume(all: Line[], opts: { firstPage: number; lastPage: number; startAt: number }): ParseResult {
  const issues: string[] = [];
  const lines = all.filter((l) => l.page >= opts.firstPage && l.page <= opts.lastPage);

  // footnotes of each page: "20 For the details…" (continued on the next 8.5 pt lines)
  const fnText = new Map<string, string>();
  const body: Line[] = [];
  const lastFn = new Map<number, string>();
  for (const l of lines) {
    const t = text(l).trim();
    if (l.y > BODY_TOP || l.y < BODY_BOTTOM) continue; // running head, page number
    if (!t || /^[\s,.;:‾]*$/.test(t)) continue; // leftovers of dropped Devanagari
    if (l.size <= FOOT && l.size >= 7) {
      const m = /^(\d{1,3}|[a-z]{1,2})\s+(.+)$/.exec(t);
      if (m && (/^\d/.test(m[1]) || /^(i|ii|iii|iv|[a-e])$/.test(m[1]))) {
        const key = `${l.page}:${m[1]}`;
        fnText.set(key, m[2]);
        lastFn.set(l.page, key);
      } else if (lastFn.has(l.page)) fnText.set(lastFn.get(l.page)!, `${fnText.get(lastFn.get(l.page)!)} ${t}`);
      continue;
    }
    body.push(l);
  }

  attachMarks(body, fnText);

  // split into sūtra blocks
  type Raw = { number: number; prakarana: string; lines: Line[]; headings: string[]; first: number; last: number };
  const raws: Raw[] = [];
  let expected = opts.startAt;
  let prak = "";
  let cur: Raw | null = null;
  let pendingHeadings: string[] = [];
  let sawChapter = false;

  for (let k = 0; k < body.length; k++) {
    const l = body[k];
    const t = text(l).trim();
    if (l.size >= 13 && /^Chapter\b/i.test(t)) {
      sawChapter = true;
      continue;
    }
    if (sawChapter && l.size >= 13) {
      prak = t.replace(/-?prakaraṇam$/i, "").replace(/-+$/, "");
      continue;
    }
    const m = /^(\d{1,4})\.(?:\s+\S.*|\s*)$/.exec(t);
    if (m && Number(m[1]) === expected && !l.pieces[0].i && !l.pieces[0].b && l.size >= 9.5 && l.size <= 10.5) {
      cur = { number: expected, prakarana: prak, lines: [l], headings: pendingHeadings, first: l.page, last: l.page };
      pendingHeadings = [];
      raws.push(cur);
      expected++;
      continue;
    }
    // centred bold heading between sūtras
    const centred = l.pieces[0].x >= 105 && l.size >= 9.5 && ratio(l, "b") > 0.7 && t.length < 90;
    const nextIsStart = body.slice(k + 1, k + 4).some((n) => new RegExp(`^${expected}\\.(\\s|$)`).test(text(n).trim()));
    if (centred && (nextIsStart || pendingHeadings.length)) {
      pendingHeadings.push(t.replace(/^\[|\]$/g, ""));
      continue;
    }
    if (/^\s*(\d{1,3}\s+)?[\p{L}ā-ž -]*\s*\d{0,3}\s*$/u.test(t) && t.length < 3) continue;
    if (cur) {
      cur.lines.push(l);
      cur.last = l.page;
      if (pendingHeadings.length) {
        // a heading that was not followed by a sūtra belongs to the text
        pendingHeadings = [];
      }
    }
  }
  if (raws.length && raws[raws.length - 1].number + 1 !== expected) issues.push("Internal: sūtra counter mismatch.");

  const used = new Set<string>();
  const blocks: SutraBlock[] = raws.map((r) => {
    const warnings: string[] = [];
    const ls = r.lines;
    // 1 · sūtra text
    let idx = 0;
    const sut: string[] = [];
    const first = text(ls[0]).trim().replace(/^\d+\.\s*/, "");
    if (first) sut.push(first);
    idx = 1;
    while (idx < ls.length) {
      const l = ls[idx];
      if (l.pieces.some((p) => p.i || p.b || p.sc)) break;
      if (labelOf(l)) break;
      sut.push(text(l).trim());
      idx++;
    }
    // 2 · the rest: synonyms → translation → Sanskrit vṛtti → labelled commentaries
    const syn: Line[] = [];
    const tr: Line[] = [];
    const skt: Line[] = [];
    const com: { key: string; label: string; lines: Line[]; lead: Piece[]; page: number; y: number }[] = [];
    let state: "syn" | "tr" | "skt" | "com" = "syn";
    for (; idx < ls.length; idx++) {
      const l = ls[idx];
      const lab = labelOf(l);
      if (lab) {
        state = "com";
        com.push({ key: lab.key, label: lab.label, lines: [], lead: lab.rest, page: l.page, y: l.y });
        continue;
      }
      if (state === "com") {
        com[com.length - 1].lines.push(l);
        continue;
      }
      const b = ratio(l, "b");
      const i = ratio(l, "i");
      if (state === "syn") {
        if (b > 0.5) {
          state = "tr";
          tr.push(l);
        } else syn.push(l);
      } else if (state === "tr") {
        if (b <= 0.5 && i > 0.6) {
          state = "skt";
          skt.push(l);
        } else tr.push(l);
      } else skt.push(l);
    }

    const synH = toHtml(syn, fnText, used);
    const trH = toHtml(tr, fnText, used);
    const sktH = skt.length ? `<p>${esc(paragraphs(skt).map((p) => p.map((t) => t.t).join("").replace(/\s+/g, " ").trim()).join(" "))}</p>`.replace(/<p>\s*<\/p>/, "") : "";

    // commentaries: the English “Vṛtti—” joins the Sanskrit vṛtti in the vṛtti field
    const commentaries: Commentary[] = [];
    let vrtti = sktH;
    for (const c of com) {
      // the rest of the label line is the first part of the paragraph
      const lead: Line = { page: c.page, y: c.y, size: 10, pieces: c.lead };
      const h = toHtml([lead, ...c.lines].filter((x) => x.pieces.length), fnText, used);
      if (!h) {
        warnings.push(`${c.label}: no text`);
        continue;
      }
      if (c.key === "vrtti") vrtti += h;
      else commentaries.push({ key: c.key, label: c.label, html: h });
    }

    const sutra = sut.join(" / ").replace(/\s+/g, " ").trim();
    if (!sutra) warnings.push("no sūtra text");
    if (!trH && !synH) warnings.push("no synonyms or translation found");
    return { number: String(r.number), prakarana: r.prakarana, sutra, synonyms: synH, translation: trH, vrtti, commentaries, headings: r.headings, pages: [r.first, r.last], warnings };
  });

  const lost = [...fnText.keys()].filter((k) => !used.has(k));
  if (lost.length) issues.push(`${lost.length} footnote(s) were not attached to any text (first: ${lost.slice(0, 5).join(", ")}).`);
  return { blocks, issues };
}
