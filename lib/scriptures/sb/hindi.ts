import { chanakyaToUnicode } from "@/lib/text/chanakya";

// Śrīmad-Bhāgavatam in Hindi (BBT PDFs "hindi-sb-canto-04-part-1.pdf" …), set
// in the Chanakya font. What the type tells:
//   "Chapter <Hindi number>" (Times + Chanakya)    a chapter begins
//   bold ~15pt                                   the verse (ends "॥ १२॥")
//   "शब्दार्थ"                                     the synonyms follow (~12pt)
//   bold ~16pt                                   the translation
//   regular ~16pt, from "तात्पर्य :"                the purport (italics kept)
// Paragraphs begin indented. Running heads / page numbers are dropped.

export type PdfLine = { page: number; y: number; x: number; size: number; bold: boolean; parts: { t: string; i: boolean; b: boolean; f?: string }[] };
export type HindiVerse = { chapter: number; key: string; from: number; to: number; synonyms: string; translation: string; purport: string };
export type HindiResult = { canto: number; verses: HindiVerse[]; chapters: number[]; titles: Record<number, string>; issues: string[] };

const NUM: Record<string, number> = {};
"एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पन्द्रह सोलह सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्यासी अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अठासी नवासी नब्बे"
  .split(" ")
  .forEach((w, i) => (NUM[w] = i + 1));
const ALT: Record<string, number> = { "तेइस": 23, "तेईस": 23, "अ_ाईस": 28, "अट्ठाईस": 28, "अट्ठारह": 18, "अट्ठावन": 58,  छः: 6, छ: 6, पांच: 5, पन्द्रह: 15, पंद्रह: 15, चौंतीस: 34, उन्तीस: 29, उन्नचास: 49, सडसठ: 67 };
const hindiNumber = (w: string) => NUM[w.trim()] ?? ALT[w.trim()] ?? (/^[०-९0-9]+$/.test(w.trim()) ? deva(w.trim()) : 0);
const deva = (s: string) => Number(s.replace(/[०-९]/g, (d) => String("०१२३४५६७८९".indexOf(d))));

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A line's Unicode text (and HTML with italics). */
function lineText(l: PdfLine): { text: string; html: string } {
  let text = "";
  let html = "";
  let prevI: boolean | null = null;
  for (const p of l.parts) {
    // only Chanakya text is converted (numbers and English in other fonts stay as they are)
    const u = !p.f || /chanakya/i.test(p.f) ? chanakyaToUnicode(p.t) : p.t;
    if (prevI !== null && prevI !== p.i && !/\s$/.test(text) && !/^\s/.test(u)) {
      text += " ";
      html += " ";
    }
    text += u;
    html += p.i ? `<i>${esc(u)}</i>` : esc(u);
    prevI = p.i;
  }
  return { text: text.replace(/\s+/g, " ").trim(), html: html.replace(/<\/i>(\s*)<i>/g, "$1").replace(/\s+/g, " ").trim() };
}

/** "नन्दिवर्धन:—नन्दिवर्धन; तत्-पुत्र:—उसका पुत्र;" → Sanskrit words marked (script switching converts them). */
function synonymsHtml(s: string): string {
  const body = s.replace(/।\s*\.?\s*$/, "").trim();
  return (
    "<p>" +
    body
      .split(/;\s*/)
      .filter(Boolean)
      .map((pair) => {
        const k = pair.indexOf("—");
        return k > 0 ? `<i lang="sa">${esc(pair.slice(0, k).trim())}</i> — ${esc(pair.slice(k + 1).trim())}` : esc(pair);
      })
      .join("; ") +
    "।</p>"
  );
}

export function parseHindiSb(lines: PdfLine[], canto: number): HindiResult {
  const verses: HindiVerse[] = [];
  const chapters: number[] = [];
  const titles: Record<number, string> = {};
  let wantTitle = false;
  const issues: string[] = [];
  let chapter = 0;
  let mode: "" | "verse" | "syn" | "trans" | "purp" = "";
  let verseNums: number[] = [];
  let syn = "";
  let cur: HindiVerse | null = null;
  let para = "";
  let paraIsTrans = false;
  let numberless = 0;
  let quote: string[] = [];
  let modeBefore: "" | "verse" | "syn" | "trans" | "purp" = "";
  // body size and left margin, from the regular text
  const sizes = lines.map((l) => l.size).sort((a, b) => a - b);
  const body = sizes[Math.floor(sizes.length * 0.6)] || 16;
  const left = Math.min(...lines.filter((l) => Math.abs(l.size - body) < 1).map((l) => l.x));

  const flushPara = () => {
    if (!cur || !para.trim()) return (para = "");
    if (paraIsTrans) cur.translation += `<p>${para.trim()}</p>`;
    else cur.purport += `<p>${para.trim()}</p>`;
    para = "";
  };
  const finishVerse = () => {
    flushPara();
    cur = null;
  };

  for (let k = 0; k < lines.length; k++) {
    const l = lines[k];
    const raw = l.parts.map((p) => p.t).join("");
    // ---- chapter
    const ch = /^\s*Chapter\s+(.+)$/.exec(raw);
    if (ch) {
      finishVerse();
      const n = hindiNumber(chanakyaToUnicode(ch[1]).replace(/[^ऀ-ॿ0-9]/g, ""));
      if (!n) issues.push(`Page ${l.page}: chapter number not read (“${chanakyaToUnicode(ch[1])}”).`);
      chapter = n || chapter + 1;
      chapters.push(chapter);
      mode = "";
      wantTitle = true;
      continue;
    }
    if (!chapter) continue;
    const { text, html } = lineText(l);
    // the chapter's Hindi title: the first line after "Chapter …" (one or two lines in the large type)
    if (wantTitle && text && !/^[०-९0-9]+$/.test(text)) {
      if (!titles[chapter]) titles[chapter] = text;
      else if (l.size >= (lines[k - 1]?.size ?? 0) - 0.5 && l.size > body + 1) titles[chapter] += " " + text;
      else wantTitle = false;
      if (wantTitle) continue;
    }
    if (!text || /^[०-९0-9]+$/.test(text)) continue; // page numbers
    if (/^शब्दार्थ$/.test(text)) {
      mode = "syn";
      syn = "";
      continue;
    }
    // ---- verse lines (bold, a little smaller than the body)
    const speaker = l.bold && /उवाच\s*[—:–-]?\s*$/.test(text) && text.length < 60;
    const isVerse = speaker || (l.bold && l.size < body - 0.4 && l.size > body - 3 && !/—/.test(text));
    if (isVerse) {
      if (mode !== "verse") {
        // don't close the purport yet: a verse quoted in it looks the same
        quote = [];
        modeBefore = mode;
        verseNums = [];
      }
      mode = "verse";
      quote.push(html);
      for (const m of text.matchAll(/॥\s*([०-९0-9]+)\s*॥/g)) verseNums.push(deva(m[1]));
      for (const m of raw.matchAll(/\|\|\s*([0-9]+)\s*\|\|/g)) verseNums.push(Number(m[1]));
      continue;
    }
    if (mode === "syn" && l.size < body - 2) {
      syn += (syn && !syn.endsWith("-") ? " " : "") + text;
      continue;
    }
    if (mode === "verse") {
      // no "शब्दार्थ" after it: a verse quoted in the purport
      if (cur && (modeBefore as string) === "purp") {
        flushPara();
        cur.purport += `<p style="text-align:center"><i lang="sa">${quote.join("<br>")}</i></p>`;
        mode = "purp";
        paraIsTrans = false;
      } else mode = modeBefore;
    }
    if (mode === "syn") {
      finishVerse();
      // the translation begins
      if (!verseNums.length) {
        // printed without its number (the prose verses of Canto 5 …): the next one
        const last = verses.filter((v) => v.chapter === chapter).pop();
        verseNums = [last ? last.to + 1 : 1];
        numberless++;
      }
      // the digit ५ (5) is missing from the font's text in some PDFs ("१५" reads "१"):
      // a number that is the expected one without its 5s is the expected one
      {
        const last = verses.filter((v) => v.chapter === chapter).pop();
        let expect = last ? last.to + 1 : 1;
        verseNums = verseNums.map((n) => {
          const fixed = n !== expect && String(expect).replace(/5/g, "") === String(n) ? expect : n;
          expect = fixed + 1;
          return fixed;
        });
      }
      const from = Math.min(...verseNums);
      const to = Math.max(...verseNums);
      const key = from === to ? String(from) : `${from}-${to}`;
      if (verses.some((v) => v.chapter === chapter && v.key === key)) issues.push(`${canto}.${chapter}.${key} appears twice.`);
      cur = { chapter, key, from, to, synonyms: syn ? synonymsHtml(syn) : "", translation: "", purport: "" };
      verses.push(cur);
      mode = "trans";
      paraIsTrans = true;
      para = "";
    }
    if (!cur) continue;
    const indented = l.x > left + 8;
    const purportStart = /^तात्पर्य\s*:/.test(text);
    if (purportStart || (mode === "trans" && !l.bold)) {
      flushPara();
      mode = "purp";
      paraIsTrans = false;
      para = html.replace(/^(?:<b>)?तात्पर्य\s*:\s*/, "").replace(/^<i>\s*<\/i>/, "");
      continue;
    }
    if (indented) flushPara();
    para += (para && !para.endsWith("-") ? " " : "") + html;
  }
  finishVerse();
  if (numberless) issues.push(`${numberless} verse(s) printed without a number were numbered in sequence.`);
  return { canto, verses, chapters, titles, issues };
}
