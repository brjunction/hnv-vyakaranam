// Run the whole Bhāgavatam import build on the real files, as the admin page does.
//   npx tsx scripts/sb-import-test.ts <bbt.epub> <verses.epub> <commentaries.zip> [out.json]
import fs from "fs";
import { unzipSync, strFromU8 } from "fflate";
import { epubDocuments } from "@/lib/scriptures/sb/epub";
import { parseBbt } from "@/lib/scriptures/sb/bbt";
import { parseVerseCollection } from "@/lib/scriptures/sb/vc";
import { parseCommentaries, type CommentaryVerse } from "@/lib/scriptures/sb/commentaries";
import { buildSb } from "@/lib/scriptures/sb/build";

function main() {
  const [bbtF, vcF, zipF, out] = process.argv.slice(2);
  const docs = (f: string) => epubDocuments(unzipSync(new Uint8Array(fs.readFileSync(f))), strFromU8);
  const t0 = Date.now();
  const bbt = parseBbt(docs(bbtF));
  const vc = parseVerseCollection(docs(vcF));
  const comm: CommentaryVerse[] = [];
  for (const [name, bytes] of Object.entries(unzipSync(new Uint8Array(fs.readFileSync(zipF))))) if (name.endsWith(".epub")) comm.push(...parseCommentaries(epubDocuments(unzipSync(bytes), strFromU8)));
  const b = buildSb({ bbt, vc, comm });
  console.log("seconds", (Date.now() - t0) / 1000);
  const r = b.report;
  console.log({ verses: r.verses, chapters: r.chapters, fromCollection: r.fromCollection, textDiffers: r.textDiffers.length, ...r.commentaries, unmatched: r.commentaries.unmatched.length });
  console.log(r.perKind, b.kinds.map((k) => k.key));
  console.log(r.textDiffers.slice(0, 5));
  console.log(r.commentaries.unmatched.slice(0, 15));
  console.log("divisions", b.divisions.length, b.divisions.slice(0, 3), "rows", b.rows.length, "bytes", JSON.stringify(b.rows).length);
  const row = b.rows.find((x) => x.location === "1.5" && x.verse === "2")!;
  console.log(Object.keys(row.c), row.c.sridhara?.slice(0, 300), row.c.synonyms?.slice(0, 200));
  if (out) fs.writeFileSync(out, JSON.stringify(b));
}
main();
