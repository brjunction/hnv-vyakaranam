// Dump the typographic lines of an HNV PDF to JSON (for developing and testing the parser).
//   npx tsx scripts/hnv-pdf/extract-lines.ts <in.pdf> <out.json> [fromPage] [toPage]
import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { extractPage } from "@/lib/hnv/pdf-extract";

async function main() {
  const [file, out, from, to] = process.argv.slice(2);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), verbosity: 0 }).promise;
  const a = Number(from) || 1;
  const b = Math.min(Number(to) || doc.numPages, doc.numPages);
  const all: unknown[] = [];
  for (let p = a; p <= b; p++) {
    all.push(...(await extractPage(doc as never, p)));
    if (p % 100 === 0) console.error("page", p);
  }
  fs.writeFileSync(out, JSON.stringify(all));
  console.error("lines", all.length);

}
main();
