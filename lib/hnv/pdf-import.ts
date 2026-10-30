import type { Line } from "@/lib/hnv/pdf-extract";
import { PART_TITLE, parseVolume, type Intro, type SutraBlock } from "@/lib/hnv/pdf-parse";
import { looseKey, parseSutraList, type ListParse } from "@/lib/hnv/pdf-sutras";

// Finds the parts of an HNV volume (Invocation, chapters, Afterword, the list of
// sūtras) from its headings, parses each part, and turns the result into the
// records the import sends to the server. Pure: runs in the browser and in Node.

export type Part = { kind: "invocation" | "sutras" | "afterword" | "list"; first: number; last: number; label: string };
export type Analysis = {
  parts: Part[];
  blocks: SutraBlock[];
  intros: Intro[];
  issues: string[];
  list: ListParse | null;
};

const txt = (l: Line) => l.pieces.map((p) => p.t).join("").trim();

/**
 * Some volumes were exported smaller (body ~9pt instead of 12) and with Word's
 * comment balloons in the right margin ("Deleted: …", "Comment [1]: …").
 * The balloons are dropped and the page is scaled to the 12pt body the
 * parser's measures expect.
 */
export function normaliseLines(lines: Line[]): Line[] {
  const chars = new Map<number, number>();
  for (const l of lines) {
    const n = l.pieces.reduce((s, p) => s + p.t.length, 0);
    const k = Math.round(l.size * 10) / 10;
    chars.set(k, (chars.get(k) ?? 0) + n);
  }
  const body = [...chars.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 12;
  // the balloons: small lines that start far to the right
  const lefts = lines.filter((l) => Math.abs(l.size - body) < 0.3 && l.pieces[0]).map((l) => l.pieces[0].x).sort((a, b) => a - b);
  const left = lefts[Math.floor(lefts.length * 0.1)] ?? 40;
  const notes = lines.filter((l) => l.size < body * 0.82 && l.pieces[0] && l.pieces[0].x > left + 300 * (body / 12));
  let out = lines;
  if (notes.length >= 3) {
    const cut = Math.min(...notes.map((l) => l.pieces[0].x)) - 2;
    out = lines
      .map((l) => ({ ...l, pieces: l.pieces.filter((p) => p.x < cut) }))
      .filter((l) => l.pieces.some((p) => p.t.trim()));
  }
  if (body > 10.5) return out;
  const f = 12 / body;
  return out.map((l) => ({ ...l, size: l.size * f, y: l.y * f, pieces: l.pieces.map((p) => ({ ...p, x: p.x * f, w: p.w * f })) }));
}

export function analyseVolume(input: Line[], numPages: number): Analysis {
  const lines = normaliseLines(input);
  const heads = lines
    .filter((l) => (l.size >= 13.5 || (txt(l).length < 50 && /^(Atha\s|Invocation$)|prakaraṇam\d*$/i.test(txt(l)))) && (/^(Chapter|Invocation|Afterword|Appendix|Foreword|Introduction|Preface|Bibliography|Index|Glossary|Contents)\b/i.test(txt(l)) || PART_TITLE.test(txt(l)) || /prayers?\b/i.test(txt(l))))
    .map((l) => ({ page: l.page, t: txt(l) }));
  const isInv = (t: string) => /^Invocation\b|maṅgalācaraṇam$/i.test(t);
  const isAft = (t: string) => /^Afterword\b|granthopasaṁhāraḥ$/i.test(t);
  const isCh = (t: string) => /^Chapter\b|prakaraṇam\d*$/i.test(t) && !isInv(t);
  const nextAfter = (page: number) => heads.find((h) => h.page > page && !isCh(h.t))?.page ?? numPages + 1;
  const parts: Part[] = [];
  const inv = heads.find((h) => isInv(h.t));
  const ch = heads.filter((h) => isCh(h.t));
  const aft = heads.find((h) => isAft(h.t));
  // a prakaraṇa that opens with its own invocation verse (Bṛhat volumes): it belongs to the chapter's introduction
  const chFirst = heads.find((h) => isCh(h.t));
  if (inv && chFirst && chFirst.page <= inv.page && heads.indexOf(chFirst) < heads.indexOf(inv)) {
    // handled as the introduction before the first sūtra
  } else if (inv) parts.push({ kind: "invocation", first: inv.page, last: (heads.find((h) => h.page > inv.page)?.page ?? numPages + 1) - 1, label: "Invocation (Maṅgalācaraṇa)" });
  if (ch.length) parts.push({ kind: "sutras", first: ch[0].page, last: nextAfter(ch[ch.length - 1].page) - 1, label: ch.map((c) => c.t).join(", ") });
  if (aft) parts.push({ kind: "afterword", first: aft.page, last: (heads.find((h) => h.page > aft.page)?.page ?? numPages + 1) - 1, label: "Afterword (Granthopasaṁhāra)" });
  const listHead = lines.find((l) => /^List of S[uū]tras in the \S+ Version/i.test(txt(l)));
  if (listHead) {
    const end = heads.find((h) => h.page > listHead.page)?.page ?? numPages + 1;
    parts.push({ kind: "list", first: listHead.page, last: end - 1, label: "List of sūtras (appendix)" });
  }

  const out: Analysis = { parts, blocks: [], intros: [], issues: [], list: null };
  for (const p of parts) {
    if (p.kind === "list") {
      const t = lines
        .filter((l) => l.page >= p.first && l.page <= p.last && l.y < 600 && l.y > 30)
        .map(txt)
        .join("\n");
      out.list = parseSutraList(t, { unicode: true });
      continue;
    }
    let startAt = 1;
    if (p.kind === "sutras") {
      const first = lines.find((l) => l.page >= p.first && l.page <= p.last && l.devSutra);
      startAt = first?.devSutra ?? Number(/^(\d+)\./.exec(lines.find((l) => l.page >= p.first && /^\d+\.(\s|$)/.test(txt(l)))?.pieces[0]?.t ?? "")?.[1] ?? 1);
    }
    const r = parseVolume(lines, {
      firstPage: p.first,
      lastPage: p.last,
      startAt,
      mode: p.kind === "sutras" ? "sutras" : "verses",
      prefix: p.kind === "invocation" ? "0.1" : "0.2",
    });
    out.blocks.push(...r.blocks);
    out.intros.push(...r.intros);
    out.issues.push(...r.issues.map((i) => `${p.label}: ${i}`));
  }
  if (!parts.some((p) => p.kind === "sutras")) out.issues.push("No chapter of sūtras was found in this file (no “Chapter …” or “…-prakaraṇam” heading).");
  return out;
}

/** What is sent to the server for one sūtra. */
export type ImportItem = {
  number: string;
  sutra: string;
  synonyms: string;
  translation: string;
  vrtti: string;
  commentaries: { key: "intro" | "amrta" | "samsodhini" | "bala"; html: string }[];
  pages: [number, number];
  prakarana?: string;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function toItems(a: Analysis): ImportItem[] {
  return a.blocks.map((b) => {
    const intros = a.intros.filter((i) => i.beforeSutra === b.number && i.html.trim());
    const intro = intros.map((i) => (i.title ? `<h3>${esc(i.title)}</h3>` : "") + i.html).join("");
    const com: ImportItem["commentaries"] = [];
    if (intro) com.push({ key: "intro", html: intro });
    for (const c of b.commentaries) if (c.key === "amrta" || c.key === "samsodhini" || c.key === "bala") com.push({ key: c.key, html: c.html });
    return { number: b.number, sutra: b.sutra, synonyms: b.synonyms, translation: b.translation, vrtti: b.vrtti, commentaries: com, pages: b.pages, prakarana: b.prakarana };
  });
}

/** Sūtra text in the body vs. the list of sūtras printed in the appendix. */
export function crossCheck(blocks: SutraBlock[], list: ListParse | null) {
  if (!list) return null;
  const diffs: { number: string; body: string; list: string }[] = [];
  let same = 0;
  let longer = 0;
  for (const b of blocks) {
    if (b.number.startsWith("0.")) continue;
    const l = list.sutras.find((s) => s.number === b.number);
    if (!l) continue;
    const A = looseKey(b.sutra);
    const B = looseKey(l.text);
    if (A === B) same++;
    else if (B.startsWith(A)) longer++;
    else diffs.push({ number: b.number, body: b.sutra, list: l.text });
  }
  return { same, longer, diffs };
}
