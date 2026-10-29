import type { BbtResult } from "@/lib/scriptures/sb/bbt";
import type { VcResult } from "@/lib/scriptures/sb/vc";
import { COMMENTARY_KINDS, OTHER_KIND, kindOf, type CommentaryVerse } from "@/lib/scriptures/sb/commentaries";
import { similarity } from "@/lib/hnv/pdf-sutras";

// Turns the parsed e-books into the rows the scripture import takes
// (lib/actions/scriptures.ts › importScriptureRows): one row per verse in
// Śrīla Prabhupāda's numbering, with every ācārya's commentary attached to
// the verse it explains — matched by the verse text, so verses that are
// numbered or grouped differently in the commentary edition still land on
// the right BBT verse.

export type SbRow = { location: string; verse: string; iast?: string; speaker?: string; c: Record<string, string> };
export type SbDivision = { location: string; number?: string; title?: string; body?: string };
export type SbKind = { key: string; name: string; author: string; language: "sanskrit" | "english"; pane: "commentary" | "verse" | "translation" };
export type SbBuild = {
  rows: SbRow[];
  divisions: SbDivision[];
  kinds: SbKind[];
  report: {
    verses: number;
    chapters: number;
    fromCollection: number;
    textDiffers: { ref: string; bbt: string; collection: string }[];
    commentaries: { matched: number; byText: number; byNumberOnly: number; unmatched: { ref: string; text: string }[] };
    perKind: Record<string, number>;
  };
};

type Base = { canto: number; chapter: number; key: string; from: number; to: number; speaker: string; lines: string[]; synonyms: string; translation: string; purport: string };

const ENGLISH = /(?<![\p{L}\p{M}-])(the|of|and|is|are|in|on|to|for|with|by|from|as|or|this|that|ad|infinitum|et|cetera|per|se|vice|versa)(?![\p{L}\p{M}-])/iu;
/** Italic words in Śrīla Prabhupāda's English are Sanskrit terms: mark them so the script switcher converts them. */
const markSanskrit = (html: string) => html.replace(/<i>([\s\S]*?)<\/i>/g, (m, t: string) => (ENGLISH.test(t.replace(/<[^>]+>/g, "")) ? m : `<i lang="sa">${t}</i>`));

const verseText = (lines: string[]) =>
  lines
    .filter((l) => !/uvāca\s*[—–-]?\s*$/.test(l))
    .join(" ")
    .replace(/[|।॥]/g, " ");

type KindDef = { key: string; name: string; author: string; match: (author: string, work: string) => boolean };
export type BuildOptions = {
  /** the location of a chapter in the book ("1.5" for the Bhāgavatam, "5" for the Gītā) */
  location?: (canto: number, chapter: number) => string;
  /** the commentary kinds of this book (default: the Bhāgavatam's) */
  kinds?: KindDef[];
};
const foldName = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]+/g, "");

export function buildSb(input: { bbt?: BbtResult | null; vc?: VcResult | null; comm?: CommentaryVerse[] }, opts: BuildOptions = {}): SbBuild {
  const loc = opts.location ?? ((c: number, ch: number) => `${c}.${ch}`);
  const KINDS = opts.kinds ?? COMMENTARY_KINDS;
  const kindFor = (c: CommentaryVerse["commentaries"][number]) => (opts.kinds ? KINDS.find((k) => k.match(foldName(c.author), foldName(c.work))) ?? null : kindOf(c));
  const { bbt, vc } = input;
  const comm = input.comm ?? [];
  const report: SbBuild["report"] = {
    verses: 0,
    chapters: 0,
    fromCollection: 0,
    textDiffers: [],
    commentaries: { matched: 0, byText: 0, byNumberOnly: 0, unmatched: [] },
    perKind: {},
  };

  // 1 · the verses, in Śrīla Prabhupāda's numbering
  const base: Base[] = [];
  const vcKey = (c: number, ch: number, k: string) => `${c}.${ch}.${k}`;
  const vcMap = new Map((vc?.verses ?? []).map((v) => [vcKey(v.canto, v.chapter, v.key), v]));
  if (bbt) {
    for (const v of bbt.verses) {
      const col = vcMap.get(vcKey(v.canto, v.chapter, v.key));
      let lines = v.lines;
      if (col && col.lines.length) {
        const sim = similarity(col.lines.join(" "), v.lines.join(" "));
        if (sim < 0.97) report.textDiffers.push({ ref: `${v.canto}.${v.chapter}.${v.key}`, bbt: v.lines.join(" / "), collection: col.lines.join(" / ") });
        // the verse collection is the checked verse text — when it is clearly the same verse
        if (sim >= 0.9) {
          lines = col.lines;
          report.fromCollection++;
        }
      }
      base.push({ ...v, lines, speaker: v.speaker || col?.speaker || "" });
    }
  } else if (vc) {
    for (const v of vc.verses) base.push({ ...v, synonyms: "", translation: "", purport: "" });
    report.fromCollection = vc.verses.length;
  }
  report.verses = base.length;

  // 2 · the ācāryas' commentaries, attached by verse text (falling back to the number)
  const byChapter = new Map<string, Base[]>();
  for (const b of base) {
    const k = `${b.canto}.${b.chapter}`;
    byChapter.set(k, [...(byChapter.get(k) ?? []), b]);
  }
  const attached = new Map<Base, Record<string, string[]>>();
  const add = (b: Base, key: string, html: string) => {
    const m = attached.get(b) ?? {};
    (m[key] ??= []).push(html);
    attached.set(b, m);
  };
  const usedKinds = new Set<string>();
  for (const cv of comm) {
    if (!cv.commentaries.length) continue;
    const list = byChapter.get(`${cv.canto}.${cv.chapter}`) ?? [];
    const text = verseText(cv.lines);
    let target = list.find((b) => b.from <= cv.from && cv.from <= b.to);
    let how: "text" | "number" = "number";
    if (text.length > 12) {
      const sim = target ? similarity(text, verseText(target.lines)) : 0;
      if (sim >= 0.45) how = "text";
      else {
        const best = list
          .map((b) => ({ b, s: similarity(text, verseText(b.lines)) }))
          .sort((x, y) => y.s - x.s)[0];
        if (best && best.s >= 0.5) {
          target = best.b;
          how = "text";
        } else if (target && sim >= 0.25) how = "number";
        else target = undefined;
      }
    }
    if (!target) {
      report.commentaries.unmatched.push({ ref: cv.ref, text: text.slice(0, 120) });
      continue;
    }
    report.commentaries.matched++;
    if (how === "text") report.commentaries.byText++;
    else report.commentaries.byNumberOnly++;
    const sameNumber = target.key === (cv.from === cv.to ? String(cv.from) : `${cv.from}-${cv.to}`);
    for (const c of cv.commentaries) {
      const k = kindFor(c);
      const key = k?.key ?? OTHER_KIND.key;
      usedKinds.add(key);
      report.perKind[key] = (report.perKind[key] ?? 0) + 1;
      // the verse number of that edition is shown when it differs, or when several verses join one
      const label = sameNumber ? "" : `<p><b>(${cv.ref})</b></p>`;
      const head = k ? "" : `<h4>${c.author}${c.work ? ` — ${c.work}` : ""}</h4>`;
      add(target, key, label + head + c.html);
    }
  }

  // 3 · rows
  const rows: SbRow[] = base.map((b) => {
    const c: Record<string, string> = {};
    if (b.synonyms) c.synonyms = markSanskrit(`<p>${b.synonyms}</p>`);
    if (b.translation) c.translation = markSanskrit(b.translation);
    if (b.purport) c.purport = markSanskrit(b.purport);
    const m = attached.get(b);
    if (m) for (const [k, parts] of Object.entries(m)) c[k] = parts.join("");
    return { location: loc(b.canto, b.chapter), verse: b.key, iast: b.lines.join("\n"), speaker: b.speaker || undefined, c };
  });

  // 4 · cantos and chapters (titles, and the chapter summaries of Cantos 10–12)
  const divisions: SbDivision[] = [];
  const cantoTitles = { ...(vc?.cantoTitles ?? {}), ...(bbt?.cantoTitles ?? {}) };
  // cantos already exist with the titles chosen in the admin: they are not touched
  void cantoTitles;
  const chapterKeys = new Set(base.map((b) => `${b.canto}.${b.chapter}`));
  for (const k of chapterKeys) {
    const [c, ch] = k.split(".").map(Number);
    const fromBbt = bbt?.chapters.find((x) => x.canto === c && x.chapter === ch);
    divisions.push({ location: loc(c, ch), number: String(ch), title: fromBbt?.title || vc?.chapterTitles[k] || "", body: fromBbt?.summary ? markSanskrit(fromBbt.summary) : undefined });
  }
  report.chapters = chapterKeys.size;

  const kinds: SbKind[] = [];
  if (base.some((b) => b.synonyms)) kinds.push({ key: "synonyms", name: "Synonyms", author: "Śrīla Prabhupāda", language: "english", pane: "verse" });
  if (base.some((b) => b.translation)) kinds.push({ key: "translation", name: "Translation", author: "Śrīla Prabhupāda", language: "english", pane: "translation" });
  if (base.some((b) => b.purport)) kinds.push({ key: "purport", name: "Purport", author: "Śrīla Prabhupāda", language: "english", pane: "commentary" });
  for (const k of KINDS) if (usedKinds.has(k.key)) kinds.push({ key: k.key, name: k.name, author: k.author, language: "sanskrit", pane: "commentary" });
  if (usedKinds.has(OTHER_KIND.key)) kinds.push({ key: OTHER_KIND.key, name: OTHER_KIND.name, author: "", language: "sanskrit", pane: "commentary" });

  return { rows, divisions, kinds, report };
}
