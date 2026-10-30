// npx tsx scripts/hindi-sb-test.ts <hindi-sb-canto-12.pdf> [canto]
import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { pdfLines } from "@/lib/scriptures/sb/hindi-extract";
import { parseHindiSb } from "@/lib/scriptures/sb/hindi";

async function main() {
  const [f, c] = process.argv.slice(2);
  const t0 = Date.now();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(f)), verbosity: 0 }).promise;
  const lines = await pdfLines(doc as never);
  const r = parseHindiSb(lines, Number(c) || 12);
  console.log("s", (Date.now() - t0) / 1000, "verses", r.verses.length, "chapters", r.chapters, "issues", r.issues.slice(0, 10));
  const v = r.verses[2];
  console.log(JSON.stringify(v, null, 1).slice(0, 2500));
  const empty = r.verses.filter((x) => !x.translation || !x.synonyms).map((x) => `${x.chapter}.${x.key}`);
  console.log("missing parts", empty.length, empty.slice(0, 20));
  const byCh: Record<number, string[]> = {};
  for (const x of r.verses) (byCh[x.chapter] ??= []).push(x.key);
  for (const [k, ks] of Object.entries(byCh)) console.log(k, ks.length, ks.slice(0, 3), ks.slice(-2));
}
main();
// extra
