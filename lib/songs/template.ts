import "server-only";
import * as XLSX from "xlsx";
import { listSongsAdmin } from "@/lib/data/songs";
import { exportCell } from "@/lib/scriptures/sheet";

export const SONG_COLS = ["Slug", "Title", "Other names", "Author", "Book", "Place in book", "Type", "Language", "Translator", "Status", "Verse", "Text", "IAST as printed", "Translation", "Synonyms"] as const;

/** All songs as an .xlsx — one row per verse — doubling as the upload template. */
export async function buildSongTemplate(): Promise<{ buffer: Buffer; filename: string }> {
  const all = await listSongsAdmin();
  const rows: string[][] = [];
  for (const s of all) {
    const vs = s.verses.length ? s.verses : [{ text: "" }];
    vs.forEach((v, i) =>
      rows.push([
        s.slug,
        i === 0 ? s.title : "",
        i === 0 ? s.altTitles : "",
        i === 0 ? s.author : "",
        i === 0 ? s.book : "",
        i === 0 ? s.bookPlace : "",
        i === 0 ? s.kind : "",
        i === 0 ? s.language : "",
        i === 0 ? s.translator : "",
        i === 0 ? s.status : "",
        String(i + 1),
        v.text ?? "",
        v.printed ?? "",
        exportCell(v.translation ?? ""),
        exportCell(v.synonyms ?? ""),
      ])
    );
  }
  if (!rows.length) {
    rows.push(["", "(song title)", "", "(author)", "(book)", "Song 1", "Song", "bengali", "", "published", "1", "(verse in IAST, Devanagari or Bengali; “/” = line break)", "", "(translation)", ""]);
    rows.push(["", "(same title again for verse 2 — or the same Slug)", "", "", "", "", "", "", "", "", "2", "…", "", "", ""]);
  }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([[...SONG_COLS], ...rows]);
  ws["!cols"] = SONG_COLS.map((c) => ({ wch: ["Text", "IAST as printed", "Translation", "Synonyms"].includes(c) ? 50 : c === "Verse" ? 6 : 18 }));
  XLSX.utils.book_append_sheet(wb, ws, "Songs");
  const help = [
    ["How to use"],
    [""],
    ["• One row per VERSE. Rows with the same Slug (or the same Title, when Slug is empty) are one song."],
    ["• Song details (Author, Book, Type …) are read from the song's first row that has them — no need to repeat them."],
    ["• Text: the verse ONCE, in any script. IAST is best for Sanskrit. For Bengali songs give the Bengali script, and the book's IAST in “IAST as printed”."],
    ["• “/” or a new line inside a cell = line break."],
    ["• Language: bengali, sanskrit, brajabuli, hindi, odia or other.   Status: published, draft or archived."],
    ["• Existing songs (same Slug) are updated. If any verse text is given, that song's verses are replaced as a whole. Empty cells never erase anything."],
    ["• Run a dry run first to see what will change."],
  ];
  const wh = XLSX.utils.aoa_to_sheet(help);
  wh["!cols"] = [{ wch: 120 }];
  XLSX.utils.book_append_sheet(wb, wh, "Read me");
  return { buffer: XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer, filename: `songs-${new Date().toISOString().slice(0, 10)}.xlsx` };
}
