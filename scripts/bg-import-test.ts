// npx tsx scripts/bg-import-test.ts <bbt-gita.epub> <commentaries.zip> [out.json]
import fs from "fs";
import { unzipSync, strFromU8 } from "fflate";
import { epubCss, epubDocuments } from "@/lib/scriptures/sb/epub";
import { parseBbtGita } from "@/lib/scriptures/bg/bbt";
import { parseCommentaries, repairSequence, type CommentaryVerse } from "@/lib/scriptures/sb/commentaries";
import { buildSb } from "@/lib/scriptures/sb/build";
import { GITA_KINDS } from "@/lib/scriptures/bg/kinds";

function main() {
  const [bbtF, zipF, out] = process.argv.slice(2);
  const t0 = Date.now();
  const z = unzipSync(new Uint8Array(fs.readFileSync(bbtF)));
  const bbt = parseBbtGita(epubDocuments(z, strFromU8), epubCss(z, strFromU8));
  console.log("verses", bbt.verses.length, "chapters", bbt.chapters.length, "issues", bbt.issues.length, bbt.issues.slice(0, 20));
  const comm: CommentaryVerse[] = [];
  for (const [name, bytes] of Object.entries(unzipSync(new Uint8Array(fs.readFileSync(zipF))))) if (name.endsWith(".epub")) { const vs = parseCommentaries(epubDocuments(unzipSync(bytes), strFromU8)); console.log(name, repairSequence(vs)); comm.push(...vs); }
  console.log("comm verses", comm.length, "with commentaries", comm.filter((c) => c.commentaries.length).length);
  const authors: Record<string, number> = {};
  for (const c of comm) for (const x of c.commentaries) authors[x.author] = (authors[x.author] ?? 0) + 1;
  console.log(authors);
  const b = buildSb({ bbt, comm }, { location: (_c, ch) => String(ch), kinds: GITA_KINDS });
  console.log("seconds", (Date.now() - t0) / 1000);
  const r = b.report;
  console.log({ verses: r.verses, chapters: r.chapters, ...r.commentaries, unmatched: r.commentaries.unmatched.length });
  console.log(r.perKind, b.kinds.map((k) => k.key));
  console.log(r.commentaries.unmatched.slice(0, 15));
  console.log("divisions", b.divisions.length, JSON.stringify(b.divisions[3]).slice(0, 600));
  const row = b.rows.find((x) => x.location === "4" && x.verse === "7")!;
  console.log(JSON.stringify(row, null, 1).slice(0, 3500));
  for (const k of Object.keys(row.c)) console.log(k, row.c[k].slice(0, 200));
  if (out) fs.writeFileSync(out, JSON.stringify(b));
}
main();
