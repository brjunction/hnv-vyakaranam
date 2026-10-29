// Compare the sūtra text found in the body with Appendix 9 (the list of sūtras).
//   npx tsx scripts/hnv-pdf/crosscheck.ts <v1-lines.json> <b1.json> <b2.json>
import fs from "fs";
import type { Line } from "@/lib/hnv/pdf-extract";
import { parseSutraList, looseKey } from "@/lib/hnv/pdf-sutras";

function main() {
  const [lf, b1, b2] = process.argv.slice(2);
  const lines = (JSON.parse(fs.readFileSync(lf, "utf8")) as Line[]).filter((l) => l.page >= 863 && l.y < 600 && l.y > 30);
  const txt = lines.map((l) => l.pieces.map((p) => p.t).join("")).join("\n");
  const list = parseSutraList(txt, { unicode: true });
  console.log("list", list.sutras.length, list.issues.filter((i) => /Expected/.test(i)));
  const blocks = [...JSON.parse(fs.readFileSync(b1, "utf8")).blocks, ...JSON.parse(fs.readFileSync(b2, "utf8")).blocks];
  let same = 0;
  let extra = 0;
  const diff: string[] = [];
  for (const b of blocks) {
    const l = list.sutras.find((s) => s.number === b.number);
    if (!l) { diff.push(`${b.number}: not in list`); continue; }
    if (looseKey(l.text) === looseKey(b.sutra)) same++;
    else if (looseKey(l.text).startsWith(looseKey(b.sutra))) { extra++; }
    else diff.push(`${b.number}\n  body: ${b.sutra}\n  list: ${l.text}`);
  }
  console.log("same", same, "list adds lines (kārikā / heading)", extra, "different", diff.length);
  console.log(diff.slice(0, 60).join("\n"));
}
main();
