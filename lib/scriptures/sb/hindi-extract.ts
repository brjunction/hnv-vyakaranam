import type { PdfLine } from "@/lib/scriptures/sb/hindi";

// Lines of a PDF page with their font size, bold / italic, and left edge —
// from pdf.js (browser or Node). The font's real name ("ChanakyaBold") is
// read from the page's common objects after the operator list is loaded.

type Doc = { numPages: number; getPage(n: number): Promise<Page> };
type Page = {
  getOperatorList(): Promise<unknown>;
  getTextContent(): Promise<{ items: unknown[] }>;
  commonObjs: { get(id: string): { name?: string } };
};
type Item = { str: string; transform: number[]; fontName: string; width: number };

export async function pdfLines(doc: Doc, onPage?: (n: number) => void): Promise<PdfLine[]> {
  const out: PdfLine[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    onPage?.(n);
    const page = await doc.getPage(n);
    await page.getOperatorList();
    const tc = await page.getTextContent();
    const names = new Map<string, string>();
    const rows: (PdfLine & { cnt: { b: number; all: number } })[] = [];
    for (const it of tc.items as Item[]) {
      if (!it.str) continue;
      let name = names.get(it.fontName);
      if (name === undefined) {
        try {
          name = page.commonObjs.get(it.fontName)?.name ?? "";
        } catch {
          name = "";
        }
        names.set(it.fontName, name);
      }
      const y = Math.round(it.transform[5]);
      const size = Math.round(Math.abs(it.transform[0]) * 10) / 10;
      let r = rows.find((q) => Math.abs(q.y - y) <= 2);
      if (!r) rows.push((r = { page: n, y, x: Math.round(it.transform[4]), size, bold: false, parts: [], cnt: { b: 0, all: 0 } }));
      const b = /bold/i.test(name);
      const i = /italic/i.test(name);
      r.x = Math.min(r.x, Math.round(it.transform[4]));
      r.size = Math.max(r.size, size);
      r.parts.push({ t: it.str, i, b });
      const len = it.str.trim().length;
      r.cnt.all += len;
      if (b) r.cnt.b += len;
    }
    rows.sort((a, b) => b.y - a.y);
    for (const { cnt, ...r } of rows) out.push({ ...r, bold: cnt.all > 0 && cnt.b / cnt.all > 0.6 });
  }
  return out;
}
