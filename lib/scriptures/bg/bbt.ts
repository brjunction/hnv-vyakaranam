import { blocks, cleanInline, cssClasses, styleSpans, type ClassStyle } from "@/lib/scriptures/sb/html";
import { balaramaToUtf8 } from "@/lib/hnv/balarama";
import type { BbtResult, SbChapter, SbVerse } from "@/lib/scriptures/sb/bbt";

// Bhagavad-gītā As It Is, BBT e-book (Śrīla Prabhupāda), set in the Balarama
// font (ä = ā, ç = ś …). Every chapter:
//   h1             "- Chapter 4 -" <br> "Transcendental Knowledge"
//   paragraph(s)   the chapter summary
//   "TEXT 1" / "TEXTS 10–11"
//   a paragraph of the old Devanagari font (garbage as text: skipped)
//   centred italic paragraphs — the verse, one line each (first may be "… uvāca")
//   "Audio"        (skipped)
//   the synonyms   (italic word — meaning; …)
//   a bold paragraph — the translation
//   the rest       — the purport (centred italic paragraphs are verses quoted in it)
// Classes differ between editions, so their look is read from the stylesheet.
// The result has the shape of the Bhāgavatam parser (canto is always 1).

/** Balarama letters → IAST, in the text only (tags and entities are left alone). */
const textToIast = (xhtml: string) => xhtml.replace(/>([^<]+)</g, (_, t: string) => `>${balaramaToUtf8(t.normalize("NFC"))}<`);

const TEXT_REF = /^TEXTS?\s+(\d+)(?:\s*[–—-]\s*(\d+))?\s*$/i;
const CHAPTER = /^-?\s*Chapter\s+(\d+)\s*-?\s*\n?([\s\S]*)$/i;
const JUNK = /\)\)\s*\d+\s*\)\)|\)\s*$/;

/** Italic turned the other way round: a summary set in italics with its Sanskrit words upright. */
function invertItalic(html: string): string {
  const plain = html.replace(/<[^>]+>/g, "").length || 1;
  const italic = [...html.matchAll(/<i>([\s\S]*?)<\/i>/g)].reduce((n, m) => n + m[1].replace(/<[^>]+>/g, "").length, 0);
  if (italic / plain < 0.6) return html;
  let out = "";
  let inI = false;
  for (const part of html.split(/(<\/?i>)/)) {
    if (part === "<i>") inI = true;
    else if (part === "</i>") inI = false;
    else if (inI || !part.trim() || /^<[^>]+>$/.test(part)) out += part;
    else out += part.replace(/^(\s*)([\s\S]*?)(\s*)$/, (_, a, t, z) => (t.replace(/[\s.,;:()—–-]/g, "") ? `${a}<i>${t}</i>${z}` : `${a}${t}${z}`));
  }
  return out.replace(/<i>(\(?)([\s\S]*?)(\)?)<\/i>/g, "$1<i>$2</i>$3");
}

export function parseBbtGita(files: { path: string; xhtml: string }[], css: string): BbtResult {
  const styles = cssClasses(css);
  const st = (cls: string): ClassStyle => cls.split(/\s+/).map((c) => styles.get(c) ?? {}).reduce((a, b) => ({ ...a, ...b }), {});
  const docs = files.map((f) => ({ path: f.path, bl: blocks(styleSpans(textToIast(f.xhtml), styles)) }));

  // the classes of the old-Devanagari paragraphs (they end in ")) 12 ))")
  const seen = new Map<string, [number, number]>();
  for (const d of docs)
    for (const b of d.bl) {
      const s = seen.get(b.cls) ?? [0, 0];
      s[0]++;
      if (/\)\)\s*\d+\s*\)\)/.test(b.text)) s[1]++;
      seen.set(b.cls, s);
    }
  const junkClass = new Set([...seen].filter(([, [n, j]]) => j >= 3 && j / n > 0.5).map(([c]) => c));

  const verses: SbVerse[] = [];
  const chapters: SbChapter[] = [];
  const issues: string[] = [];
  let chapter = 0;
  let cur: SbVerse | null = null;
  let mode: "" | "summary" | "verse" | "trans" | "purp" = "";
  let chap: SbChapter | null = null;

  for (const d of docs) {
    for (const b of d.bl) {
      const t = b.text.trim();
      if (!t) continue;
      if (/^h[1-6]$/.test(b.tag)) {
        const c = CHAPTER.exec(t);
        if (c && Number(c[1]) >= 1 && Number(c[1]) <= 18) {
          chapter = Number(c[1]);
          chap = chapters.find((x) => x.chapter === chapter) ?? null;
          if (!chap) chapters.push((chap = { canto: 1, chapter, title: c[2].replace(/\s+/g, " ").trim(), summary: "" }));
          cur = null;
          mode = "summary";
        } else if (b.tag === "h1") {
          chapter = 0; // Introduction, glossary …
          cur = null;
          mode = "";
        }
        continue;
      }
      if (!chapter) continue;
      const r = TEXT_REF.exec(t);
      if (r) {
        const from = Number(r[1]);
        const to = r[2] ? Number(r[2]) : from;
        const key = r[2] ? `${from}-${to}` : String(from);
        if (verses.some((v) => v.chapter === chapter && v.key === key)) {
          issues.push(`Bg ${chapter}.${key} appears twice; the second copy was skipped.`);
          cur = null;
          mode = "";
          continue;
        }
        cur = { canto: 1, chapter, key, from, to, speaker: "", lines: [], synonyms: "", translation: "", purport: "" };
        verses.push(cur);
        mode = "verse";
        continue;
      }
      const s = st(b.cls);
      if (mode === "summary" && chap) {
        const h = cleanInline(b.html);
        if (h) chap.summary += `<p>${invertItalic(h).replace(/(<br>)+$/, "")}</p>`;
        continue;
      }
      if (!cur) continue;
      if (/^Audio$/i.test(t)) continue;
      if (mode === "verse") {
        if (junkClass.has(b.cls) || (JUNK.test(t) && !cur.lines.length && /[A-Z]{2}|[&\[\]]/.test(t))) continue;
        if (!cur.synonyms && /—/.test(t) && /<i>/.test(cleanInline(b.html)) && cur.lines.length) {
          cur.synonyms = cleanInline(b.html).replace(/<\/i>\s*[-–—]\s*/g, "</i> — ");
          mode = "trans";
          continue;
        }
        for (const line of t.split("\n").map((x) => x.trim()).filter(Boolean)) {
          if (!cur.lines.length && !cur.speaker && /uvāca\s*[—–-]?$/.test(line)) cur.speaker = line;
          else cur.lines.push(line);
        }
        continue;
      }
      if (mode === "trans") {
        cur.translation = `<p>${cleanInline(b.html)}</p>`;
        mode = "purp";
        continue;
      }
      if (mode === "purp") {
        const h = cleanInline(b.html);
        if (!h) continue;
        if (/^Thus end the Bhaktivedanta Purports/i.test(t)) cur.purport += `<p><i>${h.replace(/<\/?i>/g, "")}</i></p>`;
        else if (s.center) cur.purport += `<p style="text-align: center">${s.i && !/<i>/.test(h) ? `<i>${h}</i>` : h}</p>`;
        else cur.purport += `<p>${h}</p>`;
      }
    }
  }

  verses.sort((a, b) => a.chapter - b.chapter || a.from - b.from);
  chapters.sort((a, b) => a.chapter - b.chapter);
  for (const v of verses) {
    if (!v.lines.length) issues.push(`Bg ${v.chapter}.${v.key}: no verse text.`);
    if (!v.synonyms) issues.push(`Bg ${v.chapter}.${v.key}: no synonyms.`);
    if (!v.translation) issues.push(`Bg ${v.chapter}.${v.key}: no translation.`);
  }
  // chapters without a gap in the numbering
  for (const c of chapters) {
    const list = verses.filter((v) => v.chapter === c.chapter);
    let next = 1;
    for (const v of list) {
      if (v.from !== next) issues.push(`Bg ${c.chapter}: after verse ${next - 1} comes ${v.key}.`);
      next = v.to + 1;
    }
  }
  return { verses, chapters, cantoTitles: {}, issues };
}
