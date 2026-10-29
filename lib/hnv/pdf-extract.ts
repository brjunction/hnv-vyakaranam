import { balaramaToUtf8 } from "@/lib/hnv/balarama";

// Reads the text of a PDF page with its typography, using pdf.js (works in the
// browser and in Node). The HNV PDFs are set in Tamal (a Balarama font): the
// font name tells what a piece of text IS — regular = sūtra / prose, italic =
// Sanskrit words and synonyms, bold = translation, bold small caps = the
// labels "Vṛtti", "Amṛta", "Saṁśodhinī". The legacy Devanagari glyph font
// (RM Devanagari) is dropped: the same text is always printed in roman
// letters next to it, and the site shows Devanagari from the roman text.
//
// Two quirks of the typesetting are repaired here:
//  • ḹ is drawn as ḷ with a macron glyph placed over it ("ü" or "‾" at the
//    same x). The macron is removed and the ḷ under it becomes ḹ.
//  • footnote marks are raised, smaller digits → flag `u`.

export type Piece = { t: string; x: number; w: number; i?: 1; b?: 1; sc?: 1; /** raised footnote mark */ u?: 1 };
export type Line = {
  page: number;
  y: number;
  size: number;
  pieces: Piece[];
  /** This row is the Devanagari heading "N / …" printed above sūtra N. */
  devSutra?: number;
  /** Text printed over other text (a sign of a hidden duplicate layer): check this page by eye. */
  overlap?: 1;
};
type PdfItem = { str: string; transform: number[]; width: number; height: number; fontName: string };
type PdfPage = {
  view?: number[];
  getOperatorList(): Promise<unknown>;
  getTextContent(): Promise<{ items: PdfItem[] }>;
  commonObjs: { get(k: string): { name?: string } };
};
export type PdfDoc = { numPages: number; getPage(n: number): Promise<PdfPage> };

const fontFlags = (name: string) => {
  let n = name;
  try {
    n = decodeURIComponent(name.replace(/#/g, "%"));
  } catch {}
  n = n.replace(/^[A-Z]{6}\+/, "");
  return {
    dev: /devanagari|^RM\b/i.test(n),
    i: /italic|oblique/i.test(n),
    b: /bold/i.test(n),
    sc: /-SC\d*$|smallcap/i.test(n),
    // Balarama letters only exist in the Tamal / Minion text fonts
    roman: /tamal|minion|balaram/i.test(n),
    bullet: /wingding/i.test(n),
  };
};

type Raw = Piece & { z: number; raw: string };
type Row = { y: number; items: Raw[]; chars: Record<string, number>; size: number; dev: string };

const MACRON = /^[ü‾¯]$/;

function toLongL(p: Piece, x: number) {
  // the character of piece p that lies under x
  const len = [...p.t].length;
  const at = p.w > 0 ? Math.round(((x - p.x) / p.w) * len) : 0;
  const chars = [...p.t];
  for (const d of [0, -1, 1, -2, 2, -3, 3]) {
    let k = at + d;
    // in "ḷ ḷ" / "ḷ-ḷ" the long one always comes second
    if ((chars[k] === "ḷ" || chars[k] === "Ḷ") && /[ḷḶ]/.test(chars[k + 2] ?? "") && /[\s,-]/.test(chars[k + 1] ?? "")) k += 2;
    if (chars[k] === "ḷ") return (chars[k] = "ḹ"), (p.t = chars.join("")), true;
    if (chars[k] === "Ḷ") return (chars[k] = "Ḹ"), (p.t = chars.join("")), true;
  }
  return false;
}

/** a and b agree for at least 90 % of the shorter one, from the start. */
function nearSame(a: string, b: string) {
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  if (s.length < 12) return false;
  let k = 0;
  while (k < s.length && s[k] === l[k]) k++;
  return k / s.length >= 0.9;
}

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

  const rows: Row[] = [];
  // some pages carry a second, overprinted copy of a text run: keep it once
  const seen: { s: string; x: number; y: number }[] = [];
  const pageW = page.view ? page.view[2] - page.view[0] : 1e9;
  for (const it of c.items) {
    if (!it.str && !flagsOf(it.fontName).bullet) continue;
    // text set outside the page (overset frames on the pasteboard) is not printed
    if (it.transform[4] < 20 || it.transform[4] > pageW - 20) continue;
    if (it.str.trim().length > 1) {
      const [x, y] = [it.transform[4], it.transform[5]];
      if (seen.some((q) => q.s === it.str && Math.abs(q.x - x) < 2 && Math.abs(q.y - y) < 4)) continue;
      seen.push({ s: it.str, x, y });
    }
    const f = flagsOf(it.fontName);
    const y = it.transform[5];
    const size = Math.abs(it.transform[3]) || it.height;
    let row = rows.find((r) => Math.abs(r.y - y) < 1.6);
    if (!row) rows.push((row = { y, items: [], chars: {}, size, dev: "" }));
    if (f.dev) {
      row.dev += it.str;
      continue;
    }
    const key = (Math.round(size * 10) / 10).toFixed(1);
    row.chars[key] = (row.chars[key] ?? 0) + it.str.trim().length;
    // the arrow-head bullets are set in Wingdings
    if (f.bullet && row.items.some((q) => q.t === "➢ " && Math.abs(q.x - it.transform[4]) < 14)) continue; // one bullet, drawn in parts
    const t = f.bullet ? "➢ " : f.roman ? balaramaToUtf8(it.str) : it.str.normalize("NFC");
    const p: Raw = { t, raw: it.str, x: it.transform[4], w: it.width, z: size };
    if (f.i) p.i = 1;
    if (f.b) p.b = 1;
    if (f.sc) p.sc = 1;
    row.items.push(p);
  }

  for (const r of rows) {
    // the row's size is the size most of its letters have (not an odd big glyph)
    let best = r.size;
    let n = -1;
    for (const [sz, cnt] of Object.entries(r.chars)) if (cnt > n) [best, n] = [Number(sz), cnt];
    r.size = best;
  }

  // raised footnote marks sit a little above their line: put them back into it
  for (const r of rows) {
    const marks = r.items.filter((p) => p.raw.trim());
    if (!marks.length || marks.length > 2 || !marks.every((p) => /^(\d{1,3}|i|ii|iii|iv|[a-e])$/.test(p.raw.trim()))) continue;
    const host = rows
      .filter((o) => o !== r && o.items.length && Math.abs(o.y - r.y) < 5.5 && o.size > r.size * 1.15)
      .sort((a, b) => Math.abs(a.y - r.y) - Math.abs(b.y - r.y))[0];
    if (!host) continue;
    host.items.push(...r.items);
    r.items = [];
  }

  // macrons drawn over ḷ: inside the same row, or as a tiny row just above it
  for (const r of rows) {
    r.items = r.items.filter((p) => {
      if (!MACRON.test(p.raw.trim())) return true;
      const host = r.items.find((o) => o !== p && o.x - 0.5 <= p.x && p.x < o.x + o.w);
      if (host) {
        toLongL(host, p.x + p.w / 2);
        return false;
      }
      return true;
    });
  }
  for (const r of rows) {
    const marks = r.items.filter((p) => p.raw.trim());
    if (marks.length !== 1 || !MACRON.test(marks[0].raw.trim())) continue;
    const m = marks[0];
    const below = rows.find((o) => o !== r && o.y < r.y && r.y - o.y < 6 && o.items.some((p) => Math.abs(p.x - m.x) < 1.5 || (p.x <= m.x && m.x < p.x + p.w)));
    if (!below) continue;
    const host = below.items.find((p) => Math.abs(p.x - m.x) < 1.5 || (p.x <= m.x && m.x < p.x + p.w))!;
    toLongL(host, m.x + m.w / 2);
    r.items = [];
  }

  for (const r of rows) {
    const m = /^\s*(\d{1,4})(?=\s|\/)/.exec(r.dev);
    if (m && r.items.every((p) => /^[\s,.;:|/]*$/.test(p.raw))) (r as Row & { devSutra?: number }).devSutra = Number(m[1]);
  }
  // Some frames (mostly tables) are in the file twice: a hidden copy sits about one
  // line lower. A row is such a ghost when an earlier row holds the same text at the
  // same size and column, 10–32 pt higher — or nearly the same text at another size.
  const sorted = [...rows].sort((a, b) => b.y - a.y);
  const kept: Row[] = [];
  const norm = (r: Row) => r.items.map((p) => p.t).join("").replace(/\s+/g, " ").trim();
  for (const r of sorted) {
    const t = norm(r);
    const x0 = Math.min(...r.items.map((p) => p.x));
    const ghost =
      t.length >= 8 &&
      kept.some((k) => {
        const dy = k.y - r.y;
        if (dy < 6 || dy > 32) return false;
        const kt = norm(k);
        const kx = Math.min(...k.items.map((p) => p.x));
        if (kt === t && Math.abs(k.size - r.size) < 0.15 && Math.abs(kx - x0) <= 2.5 && dy >= 10) return true;
        return Math.abs(k.size - r.size) >= 0.2 && nearSame(kt, t);
      });
    if (ghost) {
      r.items = [];
      continue;
    }
    kept.push(r);
  }
  // rows whose letters overlap another row cannot both be visible
  const live = rows.filter((r) => r.items.some((p) => p.raw.trim()));
  const span = (r: Row) => [Math.min(...r.items.map((p) => p.x)), Math.max(...r.items.map((p) => p.x + p.w))];
  for (const r of live)
    for (const o of live) {
      if (o === r || Math.abs(o.y - r.y) >= Math.min(o.size, r.size) * 0.55) continue;
      const [a1, a2] = span(r);
      const [b1, b2] = span(o);
      if (Math.min(a2, b2) - Math.max(a1, b1) > 20 && r.size >= 9 && o.size >= 9) (r as Row & { overlap?: 1 }).overlap = 1;
    }
  return rows
    .filter((r) => r.items.length || (r as Row & { devSutra?: number }).devSutra)
    .sort((a, b) => b.y - a.y)
    .map((r) => {
      if ((r as Row & { devSutra?: number }).devSutra) r.items = []; // only stray punctuation of the Devanagari line
      const pieces: Piece[] = r.items
        .sort((a, b) => a.x - b.x)
        .map((p) => {
          const out: Piece = { t: p.t, x: Math.round(p.x * 10) / 10, w: Math.round(p.w * 10) / 10 };
          if (p.i) out.i = 1;
          if (p.b) out.b = 1;
          if (p.sc) out.sc = 1;
          if (r.size > 9 && p.z < r.size * 0.8 && /^(\d{1,3}|i|ii|iii|iv|[a-e])$/.test(p.t.trim())) out.u = 1;
          return out;
        });
      const line: Line = { page: pageNo, y: Math.round(r.y * 10) / 10, size: Math.round(r.size * 10) / 10, pieces };
      const ds = (r as Row & { devSutra?: number }).devSutra;
      if (ds) line.devSutra = ds;
      if ((r as Row & { overlap?: 1 }).overlap) line.overlap = 1;
      return line;
    });
}
