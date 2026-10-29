// Parse dumped lines and print a summary.   npx tsx scripts/hnv-pdf/parse-test.ts <lines.json> <firstPage> <lastPage> <startAt> <out.json>
import fs from "fs";
import { parseVolume } from "@/lib/hnv/pdf-parse";

function main() {
  const [file, a, b, start, out] = process.argv.slice(2);
  const lines = JSON.parse(fs.readFileSync(file, "utf8"));
  const r = parseVolume(lines, { firstPage: +a, lastPage: +b, startAt: +start });
  const n = r.blocks.length;
  console.log("blocks", n, "first", r.blocks[0]?.number, "last", r.blocks[n - 1]?.number);
  console.log("issues", r.issues);
  const w = r.blocks.filter((x) => x.warnings.length);
  console.log("with warnings", w.length, w.slice(0, 8).map((x) => `${x.number}: ${x.warnings.join("; ")}`));
  const cnt = (f: (x: (typeof r.blocks)[number]) => boolean) => r.blocks.filter(f).length;
  console.log({ syn: cnt((x) => !!x.synonyms), tr: cnt((x) => !!x.translation), vrtti: cnt((x) => !!x.vrtti), amrta: cnt((x) => x.commentaries.some((c) => c.key === "amrta")), sams: cnt((x) => x.commentaries.some((c) => c.key === "samsodhini")), bala: cnt((x) => x.commentaries.some((c) => c.key === "bala")) });
  const keys = new Map<string, number>();
  r.blocks.forEach((x) => x.commentaries.forEach((c) => keys.set(c.key, (keys.get(c.key) ?? 0) + 1)));
  console.log([...keys].filter(([k]) => k.startsWith("other")));
  fs.writeFileSync(out, JSON.stringify(r.blocks, null, 1));
}
main();
