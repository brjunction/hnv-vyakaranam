import type { Line } from "@/lib/hnv/pdf-extract";
import { parseVolume, type Intro, type SutraBlock } from "@/lib/hnv/pdf-parse";
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

export function analyseVolume(lines: Line[], numPages: number): Analysis {
  const heads = lines
    .filter((l) => l.size >= 16 && /^(Chapter|Invocation|Afterword|Appendix|Foreword|Introduction|Preface|Bibliography|Index|Glossary|Contents)\b/i.test(txt(l)))
    .map((l) => ({ page: l.page, t: txt(l) }));
  const nextAfter = (page: number) => heads.find((h) => h.page > page && !/^Chapter\b/i.test(h.t))?.page ?? numPages + 1;
  const parts: Part[] = [];
  const inv = heads.find((h) => /^Invocation\b/i.test(h.t));
  const ch = heads.filter((h) => /^Chapter\b/i.test(h.t));
  const aft = heads.find((h) => /^Afterword\b/i.test(h.t));
  if (inv) parts.push({ kind: "invocation", first: inv.page, last: (heads.find((h) => h.page > inv.page)?.page ?? numPages + 1) - 1, label: "Invocation (Maṅgalācaraṇa)" });
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
      startAt = first?.devSutra ?? Number(/^(\d+)\./.exec(lines.find((l) => l.page >= p.first && /^\d+\.\s/.test(txt(l)))?.pieces[0]?.t ?? "")?.[1] ?? 1);
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
  if (!parts.some((p) => p.kind === "sutras")) out.issues.push("No chapter of sūtras was found in this file (no “Chapter …” heading).");
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
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function toItems(a: Analysis): ImportItem[] {
  return a.blocks.map((b) => {
    const intros = a.intros.filter((i) => i.beforeSutra === b.number && i.html.trim());
    const intro = intros.map((i) => (i.title ? `<h3>${esc(i.title)}</h3>` : "") + i.html).join("");
    const com: ImportItem["commentaries"] = [];
    if (intro) com.push({ key: "intro", html: intro });
    for (const c of b.commentaries) if (c.key === "amrta" || c.key === "samsodhini" || c.key === "bala") com.push({ key: c.key, html: c.html });
    return { number: b.number, sutra: b.sutra, synonyms: b.synonyms, translation: b.translation, vrtti: b.vrtti, commentaries: com, pages: b.pages };
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
