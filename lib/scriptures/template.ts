import "server-only";
import * as XLSX from "xlsx";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { books, scriptureCommentaries, scriptureCommentaryTypes, scriptureDivisions, scriptureVerses } from "@/lib/db/schema";
import { buildTree } from "@/lib/data/scriptures";
import { composeVerseNo, readingOrder } from "@/lib/scriptures/core";
import { CELL_MAX, DIV_FIXED, TOO_LONG, VERSE_FIXED, exportCell } from "@/lib/scriptures/sheet";

/** Build the .xlsx template for a book (optionally only one division and everything under it). */
export async function buildScriptureTemplate(code: string, divisionId?: number): Promise<{ buffer: Buffer; filename: string }> {
  const db = getDb();
  const [book] = await db.select().from(books).where(eq(books.code, code.toLowerCase())).limit(1);
  if (!book) throw new Error("Unknown book");
  const levels = book.levels?.length ? book.levels : ["Chapter"];
  const tree = await buildTree(book.id, { all: true });
  let scope = tree;
  if (divisionId) {
    const ids = new Set<number>([divisionId]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const n of tree) if (n.parentId != null && ids.has(n.parentId) && !ids.has(n.id)) (ids.add(n.id), (grew = true));
    }
    scope = tree.filter((n) => ids.has(n.id));
  }
  const ordered = readingOrder(tree).filter((n) => scope.includes(n));
  const allInScope = [...ordered, ...scope.filter((n) => !ordered.includes(n))];
  const divIds = allInScope.map((n) => n.id);
  const [types, divRows] = await Promise.all([
    db.select().from(scriptureCommentaryTypes).where(eq(scriptureCommentaryTypes.bookId, book.id)).orderBy(asc(scriptureCommentaryTypes.sort), asc(scriptureCommentaryTypes.id)),
    divIds.length ? db.select().from(scriptureDivisions).where(inArray(scriptureDivisions.id, divIds)) : Promise.resolve([]),
  ]);
  const verseTypes = types.filter((t) => t.appliesTo !== "division");
  const verses = divIds.length
    ? await db.select().from(scriptureVerses).where(inArray(scriptureVerses.divisionId, divIds)).orderBy(asc(scriptureVerses.position), asc(scriptureVerses.id))
    : [];
  const comm: { verseId: number | null; typeId: number; html: string }[] = [];
  for (let i = 0; i < verses.length; i += 2000) {
    const ids = verses.slice(i, i + 2000).map((v) => v.id);
    comm.push(...(await db.select({ verseId: scriptureCommentaries.verseId, typeId: scriptureCommentaries.typeId, html: scriptureCommentaries.html }).from(scriptureCommentaries).where(inArray(scriptureCommentaries.verseId, ids))));
  }
  const cOf = new Map(comm.map((c) => [`${c.verseId}:${c.typeId}`, c.html]));
  const nodeOf = new Map(tree.map((n) => [n.id, n]));
  const pad = (path: string[]) => levels.map((_, i) => path[i] ?? "");
  const cut = (s: string) => (s.length > CELL_MAX ? TOO_LONG : s);

  // Verses sheet, in reading order
  const head = [...levels, ...VERSE_FIXED, ...verseTypes.map((t) => t.name)];
  const order = new Map(ordered.map((n, i) => [n.id, i]));
  const sorted = [...verses].sort((a, b) => (order.get(a.divisionId) ?? 1e9) - (order.get(b.divisionId) ?? 1e9) || a.position - b.position);
  const vRows = sorted.map((v) => {
    const n = nodeOf.get(v.divisionId)!;
    const chain: string[] = [];
    for (let c: typeof n | undefined = n; c; c = c.parentId == null ? undefined : nodeOf.get(c.parentId)) chain.unshift(c.number || c.key);
    const auto = composeVerseNo(chain, v.key);
    return [
      ...pad(n.path),
      v.key,
      v.verseNo === auto ? "" : v.verseNo,
      cut(((v.language || book.verseLanguage) !== "sanskrit" && v.devanagari) || v.iast || v.devanagari),
      v.speaker,
      v.status,
      ...verseTypes.map((t) => exportCell(cOf.get(`${v.id}:${t.id}`) ?? "")),
    ];
  });
  // a few empty example rows for a book without verses
  if (!vRows.length) {
    const firstLeaf = ordered[0] ?? scope.find((n) => n.depth === levels.length - 1);
    if (firstLeaf) vRows.push([...pad(firstLeaf.path), "1", "", "", "", "published", ...verseTypes.map(() => "")]);
  }
  const vs = XLSX.utils.aoa_to_sheet([head, ...vRows]);
  vs["!cols"] = head.map((h, i) => ({ wch: i < levels.length ? 8 : h === "Text" ? 60 : i < levels.length + VERSE_FIXED.length ? 10 : 60 }));
  vs["!freeze"] = { xSplit: levels.length + 1, ySplit: 1 };
  // keep every cell as text (verse numbers like 16-18 must not become dates)
  for (const k of Object.keys(vs)) if (!k.startsWith("!") && vs[k].t === "s") vs[k].z = "@";

  // Divisions sheet
  const dById = new Map(divRows.map((d) => [d.id, d]));
  const dHead = [...levels, ...DIV_FIXED];
  const dRows = allInScope
    .sort((a, b) => a.path.length - b.path.length || a.path.join(".").localeCompare(b.path.join("."), undefined, { numeric: true }))
    .map((n) => {
      const d = dById.get(n.id)!;
      return [...pad(n.path), d.number === d.key ? "" : d.number, d.title, d.titleDeva, d.subtitle, d.expectedChildren ?? ""];
    });
  const ds = XLSX.utils.aoa_to_sheet([dHead, ...dRows]);
  ds["!cols"] = dHead.map((h, i) => ({ wch: i < levels.length ? 8 : h.startsWith("Title") ? 40 : 14 }));

  const readme = XLSX.utils.aoa_to_sheet(
    [
      [`${book.title} — bulk update`],
      [""],
      ["How it works"],
      ["1. Fill or correct rows on the “Verses” sheet (and chapter titles on “Divisions”)."],
      ["2. In the admin: Scriptures › " + book.title + " › Spreadsheet › upload this file › Check › Apply."],
      [""],
      ["Rules"],
      [`• A verse is found by its location (${levels.join(", ")}) + Verse number. New numbers create new verses.`],
      ["• Empty cells NEVER erase anything. To clear a field, use the admin."],
      ["• Rows are never deleted by an upload. Delete in the admin."],
      ["• Missing chapters/divisions can be created automatically (tick the box when uploading)."],
      ["• Text = the verse ONCE, in any script. IAST is best (dharma-kṣetre kuru-kṣetre …): Devanagari, Bengali and Odia are made from it, with words joined as printed."],
      ["• “/” or a new line inside Text = a line break of the verse."],
      ["• Verse ranges: type 16-18. If Excel turns it into a date, type it as '16-18 (with an apostrophe)."],
      ["• “Shown as” is optional: leave it empty for the automatic number (e.g. 1.12.1)."],
      ["• Status: published, draft or archived (empty = unchanged, or published for new rows)."],
      ["• Commentary columns: plain text (empty line = new paragraph) or HTML from the admin. Column names must match the commentary names."],
      [`• Cells showing “${TOO_LONG}” are skipped on upload.`],
      [""],
      ["Commentary columns in this book"],
      ...verseTypes.map((t) => [`• ${t.name}${t.author ? " — " + t.author : ""}${t.language === "sanskrit" ? " (Sanskrit)" : ""}`]),
    ],
    {}
  );
  readme["!cols"] = [{ wch: 110 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, vs, "Verses");
  XLSX.utils.book_append_sheet(wb, ds, "Divisions");
  XLSX.utils.book_append_sheet(wb, readme, "Read me");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const part = divisionId ? `-${(nodeOf.get(divisionId)?.path ?? [String(divisionId)]).join("-")}` : "";
  return { buffer, filename: `${book.code}${part}-${new Date().toISOString().slice(0, 10)}.xlsx` };
}
