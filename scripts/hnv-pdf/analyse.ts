// Run the whole import analysis on a PDF, as the admin page does.
//   npx tsx scripts/hnv-pdf/analyse.ts <in.pdf> <out.json>
import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { extractPage, type Line } from "@/lib/hnv/pdf-extract";
import { analyseVolume, crossCheck, toItems } from "@/lib/hnv/pdf-import";

async function main() {
  const [file, out] = process.argv.slice(2);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), verbosity: 0 }).promise;
  const lines: Line[] = [];
  for (let p = 1; p <= doc.numPages; p++) lines.push(...(await extractPage(doc as never, p)));
  const a = analyseVolume(lines, doc.numPages);
  console.log(a.parts);
  console.log("blocks", a.blocks.length, a.blocks[0]?.number, "…", a.blocks[a.blocks.length - 1]?.number);
  console.log(a.issues);
  const cc = crossCheck(a.blocks, a.list);
  if (cc) console.log("cross-check", cc.same, cc.longer, cc.diffs.length);
  const items = toItems(a);
  console.log("items", items.length, "with intro", items.filter((i) => i.commentaries.some((c) => c.key === "intro")).length, "bytes", JSON.stringify(items).length);
  fs.writeFileSync(out, JSON.stringify({ analysis: a, items }));
}
main();
