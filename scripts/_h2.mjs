import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chanakya_to_unicode } = require(process.argv[3]);
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(process.argv[2])), verbosity: 0 }).promise;
const page = await doc.getPage(Number(process.argv[4]));
await page.getOperatorList();
const tc = await page.getTextContent();
const rows = [];
for (const it of tc.items) {
  if (!it.str.trim()) continue;
  const y = Math.round(it.transform[5]);
  let r = rows.find((q) => Math.abs(q.y - y) <= 2);
  if (!r) rows.push((r = { y, x: Math.round(it.transform[4]), parts: [] }));
  let f = it.fontName; try { f = page.commonObjs.get(it.fontName).name; } catch {}
  r.parts.push({ f: f.replace(/^.*\+/, ""), s: Math.round(it.transform[0]), t: it.str });
}
for (const r of rows) console.log(r.y, r.x, [...new Set(r.parts.map((p) => p.f + "/" + p.s))].join(","), chanakya_to_unicode(r.parts.map((p) => p.t).join("")).slice(0, 60));
