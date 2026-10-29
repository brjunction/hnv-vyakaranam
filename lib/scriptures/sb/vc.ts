import { blocks, toText } from "@/lib/scriptures/sb/html";
import { wordsToNumber } from "@/lib/scriptures/sb/bbt";

// "Śrīmad Bhāgavatam Verses Collection" e-book (BBT verse texts only):
//   h? .heading_sf  "Canto 9: Liberation"
//   .class_sh / h2  "CHAPTER ONE: King Sudyumna Becomes a Woman"
//   .class_sk       "Text 1" / "Texts 16–18", then the verse (speaker first when
//                   the rest is in span.class_sykf)

export type VcVerse = { canto: number; chapter: number; key: string; from: number; to: number; speaker: string; lines: string[] };
export type VcResult = { verses: VcVerse[]; cantoTitles: Record<number, string>; chapterTitles: Record<string, string> };

export function parseVerseCollection(files: { path: string; xhtml: string }[]): VcResult {
  const verses: VcVerse[] = [];
  const cantoTitles: Record<number, string> = {};
  const chapterTitles: Record<string, string> = {};
  let canto = 0;
  let chapter = 0;
  let want: { key: string; from: number; to: number } | null = null;
  for (const f of files) {
    for (const b of blocks(f.xhtml)) {
      const t = b.text;
      const c = /^Canto\s+(\d+)\s*:\s*(.+)$/i.exec(t);
      if (c && t.length < 120) {
        canto = Number(c[1]);
        cantoTitles[canto] ||= c[2].trim();
        want = null;
        continue;
      }
      const ch = /^CHAPTER\s+([A-Z-\s]+?)\s*:\s*(.+)$/i.exec(t);
      if (ch && t.length < 200) {
        const n = wordsToNumber(ch[1]);
        if (n) {
          chapter = n;
          chapterTitles[`${canto}.${chapter}`] = ch[2].trim();
        }
        want = null;
        continue;
      }
      const tx = /^Texts?\s+(\d+)(?:\s*[–—-]\s*(\d+))?\s*$/i.exec(t);
      if (tx) {
        const from = Number(tx[1]);
        const to = tx[2] ? Number(tx[2]) : from;
        want = { key: tx[2] ? `${from}-${to}` : String(from), from, to };
        continue;
      }
      if (want && canto && chapter) {
        let speaker = "";
        let body = b.html;
        const sp = /^([\s\S]*?)<br[^>]*>\s*<span[^>]*class_sykf[^>]*>([\s\S]*)<\/span>\s*$/i.exec(b.html);
        if (sp) {
          speaker = toText(sp[1]);
          body = sp[2];
        }
        const lines = toText(body)
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean);
        // "Texts 16–18": the verses follow in several paragraphs, all belong to it
        const last = verses[verses.length - 1];
        if (last && last.canto === canto && last.chapter === chapter && last.key === want.key) {
          last.lines.push(...(speaker ? [speaker] : []), ...lines);
        } else verses.push({ canto, chapter, ...want, speaker, lines });
      }
    }
  }
  return { verses, cantoTitles, chapterTitles };
}
