import { balaramaToUtf8 } from "@/lib/hnv/balarama";

// Reads the text of a PDF page with its typography, using pdf.js (works in the
// browser and in Node). The HNV PDFs are set in Tamal (a Balarama font): the
// font name tells what a piece of text IS — regular = sūtra / prose, italic =
// Sanskrit words and synonyms, bold = translation, bold small caps = the
// labels "Vṛtti", "Amṛta", "Saṁśodhinī". Legacy Devanagari glyph fonts are
// dropped (the same text is printed in roman letters next to it).

export type Piece = { t: string; x: number; w: number; i?: 1; b?: 1; sc?: 1; /** superscript (footnote mark) */ u?: 1; z?: number };
export type Line = { page: number; y: number; size: number; pieces: Piece[] };
type PdfPage = {
  getOperatorList(): Promise<unknown>;
  getTextContent(): Promise<{ items: { str: string; transform: number[]; width: number; height: number; fontName: string }[] }>;
  commonObjs: { get(k: string): { name?: string } };
};
export type PdfDoc = { numPages: number; getPage(n: number): Promise<PdfPage> };

const fontFlags = (name: string) => {
  const n = decodeURIComponent(name.replace(/#/g, "%")).replace(/^[A-Z]{6}\+/, "");
  return {
    dev: /devanagari|^RM|symbol|dingbat/i.test(n),
    i: /italic|oblique/i.test(n),
    b: /bold/i.test(n),
    sc: /-SC\d*$|smallcap/i.test(n),
    overlay: /Tamal,Italic$/i.test(n), // accent glyphs drawn over a letter (the macron of ḹ)
    times: /times/i.test(n),
  };
};

export async function extractPage(doc: PdfDoc, pageNo: number): Promise<Line[]> {
  const page = await doc.getPage(pageNo);
  await page.getOperatorList(); // loads the fonts, so their real names are known
  const c = await page.getTextContent();
  const fl = new Map<string, ReturnType<typeof fontFlags>>();
  const flagsOf = (f: string) => {
    let v = fl.get(f);
    if (!v) {
      let name = "";
      try {
        name = page.commonObjs.get(f).name ?? "";
      } catch {}
      fl.set(f, (v = fontFlags(name)));
    }
    return v;
  };

  const rows: { y: number; size: number; items: Piece[]; chars: Record<number, number> }[] = [];
  for (const it of c.items) {
    if (!it.str) continue;
    const f = flagsOf(it.fontName);
    if (f.dev || f.overlay) continue;
    const y = it.transform[5];
    const size = Math.abs(it.transform[3]) || it.height;
    let row = rows.find((r) => Math.abs(r.y - y) < 1.6 || (size < 8.6 && Math.abs(r.y - y) < 4 && r.size > size));
    if (!row) rows.push((row = { y, size, items: [], chars: {} }));
    row.chars[size] = (row.chars[size] ?? 0) + it.str.trim().length;
    const p: Piece = { t: balaramaToUtf8(it.str), x: it.transform[4], w: it.width, z: size };
    if (f.i) p.i = 1;
    if (f.b) p.b = 1;
    if (f.sc) p.sc = 1;
    row.items.push(p);
  }
  for (const r of rows) {
    // the row's size is the size most of its letters have (not an odd big glyph)
    let best = r.size;
    let n = -1;
    for (const [sz, c] of Object.entries(r.chars)) if (c > n) [best, n] = [Number(sz), c];
    r.size = best;
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) => {
    const pieces = r.items.sort((a, b) => a.x - b.x);
    for (const p of pieces) {
      if (r.size > 9 && (p.z ?? r.size) < r.size * 0.8 && /^(\d{1,3}|i|ii|iii|iv|[a-e])$/.test(p.t.trim())) p.u = 1;
      delete p.z;
    }
    return { page: pageNo, y: Math.round(r.y * 10) / 10, size: Math.round(r.size * 10) / 10, pieces };
  });
}
