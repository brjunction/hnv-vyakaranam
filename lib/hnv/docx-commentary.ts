import { unzipSync, strFromU8 } from "fflate";

// Bṛhat commentaries in Word files (amrta_nama.docx, bala_samasa.docx …):
//   "Sūtra 12" / "Sūtras 63-66" / "Sūtras 1858 to 1859"   a sūtra's commentary begins
//       (sometimes the commentary follows on the same line)
//   "2066 ādi-sarveśvarasya …"  (bold)  the Bāla files of Taddhita: number + sūtra text
//   everything before the first sūtra: the introduction (Maṅgalācaraṇa)
// Paragraphs keep bold / italic; verse lines (with " / " or short indented
// lines) are centred.

export type DocxItem = { number: string; to?: string; sutra: string; html: string };
export type DocxResult = { kind: "amrta" | "bala" | null; prakarana: string; intro: string; items: DocxItem[]; issues: string[] };

const PRAKARANA: [RegExp, string][] = [
  [/samjna|sandhi/i, "Saṁjñā-sandhi-prakaraṇa"],
  [/nama/i, "Nāma-prakaraṇa"],
  [/akhyata/i, "Ākhyāta-prakaraṇa"],
  [/karaka/i, "Kāraka-prakaraṇa"],
  [/krdanta|krt/i, "Kṛdanta-prakaraṇa"],
  [/samasa/i, "Samāsa-prakaraṇa"],
  [/taddhita/i, "Taddhita-prakaraṇa"],
];

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dec = (t: string) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

type Para = { text: string; html: string; bold: boolean; italicAll: boolean };

function paragraphs(xml: string): Para[] {
  const out: Para[] = [];
  for (const p of xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []) {
    const pBold = /<w:pPr>[\s\S]*?<w:rPr>[\s\S]*?<w:b\/>[\s\S]*?<\/w:rPr>[\s\S]*?<\/w:pPr>/.test(p);
    let html = "";
    let text = "";
    let italicChars = 0;
    let boldChars = 0;
    for (const r of p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? []) {
      const rpr = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(r)?.[1] ?? "";
      const b = /<w:b\/>|<w:b w:val="(?:1|true)"\/>/.test(rpr);
      const i = /<w:i\/>|<w:i w:val="(?:1|true)"\/>/.test(rpr);
      let t = "";
      for (const m of r.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)) t += m[1] !== undefined ? dec(m[1]) : m[0] === "<w:br/>" ? "\n" : " ";
      if (!t) continue;
      text += t;
      if (i) italicChars += t.trim().length;
      if (b) boldChars += t.trim().length;
      let h = esc(t).replace(/\n/g, "<br>");
      if (i) h = `<i>${h}</i>`;
      if (b) h = `<b>${h}</b>`;
      html += h;
    }
    const len = text.trim().length || 1;
    out.push({ text: text.normalize("NFC"), html: html.normalize("NFC"), bold: pBold || boldChars / len > 0.8, italicAll: italicChars / len > 0.8 });
  }
  return out;
}

const HEAD = /^\s*S[ūu]tras?\s+(\d{1,4})(?:\s*(?:[-–]|to)\s*(\d{1,4}))?\s*[.:]?\s*/i;
const BALA_HEAD = /^\s*(\d{1,4})\s*(?=\S)/;

/** Body HTML of one paragraph: the italic of a wholly italic text (the Sanskrit) is dropped; verse lines are centred. */
function paraHtml(p: Para, html = p.html): string {
  let h = html;
  if (p.italicAll) h = h.replace(/<\/?i>/g, "");
  h = h.replace(/<\/i><i>/g, "").replace(/<\/b><b>/g, "").trim();
  if (!h.replace(/<[^>]+>/g, "").trim()) return "";
  const t = p.text.trim();
  const verse = /\S\s?\/\s?\S/.test(t) && t.length < 160 || (/^\s{2,}/.test(p.text) && t.length < 70 && !/\.\s*$/.test(t));
  return verse ? `<p style="text-align:center">${h}</p>` : `<p>${h}</p>`;
}

/** Cut the leading "Sūtra 12" (or "2066") off a paragraph's HTML. */
function cutHead(html: string, chars: number): string {
  let left = chars;
  let out = "";
  for (const part of html.split(/(<[^>]+>)/)) {
    if (part.startsWith("<")) {
      out += part;
      continue;
    }
    const raw = dec(part);
    if (left >= raw.length) {
      left -= raw.length;
      continue;
    }
    out += esc(raw.slice(left));
    left = 0;
  }
  return out.replace(/<(b|i)>\s*<\/\1>/g, "");
}

export function parseCommentaryDocx(name: string, bytes: Uint8Array): DocxResult {
  const files = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" });
  const xml = files["word/document.xml"] ? strFromU8(files["word/document.xml"]) : "";
  const kind = /bala/i.test(name) ? "bala" : /amrta|amrita/i.test(name) ? "amrta" : null;
  const prakarana = PRAKARANA.find(([r]) => r.test(name))?.[1] ?? "";
  const issues: string[] = [];
  const items: DocxItem[] = [];
  let intro = "";
  let cur: DocxItem | null = null;
  const ps = paragraphs(xml);
  // Files that number their sūtras "2066 ādi-…" (bold) instead of "Sūtra 2066"
  const balaStyle = !ps.some((p) => HEAD.test(p.text));
  let last = 0;
  let lastTo = 0;
  for (const p of ps) {
    const t = p.text.trim();
    let m = HEAD.exec(p.text);
    // "Sūtra 79" quoted inside a commentary is not a heading: headings go forward, a little at a time
    if (m && last && (Number(m[1]) <= last || Number(m[1]) - last > 60)) m = null;
    let sutra = "";
    if (!m && balaStyle && p.bold) {
      const b = BALA_HEAD.exec(p.text);
      const n = b ? Number(b[1]) : 0;
      if (b && n > last && (last === 0 || n - last <= 40)) {
        m = b;
        sutra = p.text.slice(b[0].length).trim();
      }
    }
    if (m) {
      const from = Number(m[1]);
      let to = m[2] ? Number(m[2]) : from;
      // "1377-79" = 1377–1379
      if (to < from) to = Number(String(from).slice(0, String(from).length - String(to).length) + String(to));
      if (to < from) to = from;
      if (lastTo && from > lastTo + 1) issues.push(`${name}: no commentary for sūtra ${lastTo + 1}${from - 1 > lastTo + 1 ? `–${from - 1}` : ""}.`);
      // the next heading must come after this one's first number (a range may be misprinted)
      last = from;
      lastTo = Math.max(to, from);
      cur = { number: String(from), to: to !== from ? String(to) : undefined, sutra, html: "" };
      items.push(cur);
      // text on the same line (not the sūtra itself) begins the commentary
      if (!sutra) {
        const rest = cutHead(p.html, m[0].length);
        if (rest.replace(/<[^>]+>/g, "").trim()) cur.html += paraHtml(p, rest);
      }
      continue;
    }
    if (!t) continue;
    if (!cur) intro += paraHtml(p);
    else cur.html += paraHtml(p);
  }
  if (!kind) issues.push(`${name}: the file name says neither "amrta" nor "bala".`);
  if (!prakarana) issues.push(`${name}: the file name does not name a prakaraṇa.`);
  return { kind, prakarana, intro, items, issues };
}
