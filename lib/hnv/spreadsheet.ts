import "server-only";
import * as XLSX from "xlsx";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  chapters,
  commentaryTypes,
  editions,
  revisions,
  subchapters,
  sutraCommentaries,
  sutras,
} from "@/lib/db/schema";
import { sanitizeRich } from "@/lib/html/sanitize";
import { slugifyTitle } from "@/lib/hnv/slug";
import { compareNumbers } from "@/lib/hnv/numbering";

// Bulk editing of an edition through a spreadsheet:
//   1. Admin downloads the template = the edition's current content.
//   2. Editors fill / correct it in Excel or Google Sheets.
//   3. Admin uploads it; a dry run shows what would change; then apply.
// Rules (also written on the template's "Read me" sheet):
//   - Sūtras are matched by Number within the edition.
//   - Empty cells never erase anything (use the admin to clear a field).
//   - Rows are never deleted by an upload.
//   - New numbers create new sūtras, placed after the row above them.
//   - Unknown sections are created; unknown chapters must be on the
//     "Chapters" sheet.

const SUTRA_COLS = ["Chapter", "Section", "Number", "Sanskrit", "Transliteration", "Vrtti", "Translation", "Synonyms", "Status"] as const;
const CHAPTER_COLS = ["Slug", "Number", "Title", "English title", "Kind", "Summary", "Range label", "Status"] as const;
const STATUSES = new Set(["published", "draft", "archived"]);

const norm = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const cell = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

// ------------------------------------------------------------- export ----
export async function buildTemplate(editionSlug: string): Promise<{ buffer: Buffer; filename: string }> {
  const db = getDb();
  const [ed] = await db.select().from(editions).where(eq(editions.slug, editionSlug)).limit(1);
  if (!ed) throw new Error("Unknown edition");
  const [chs, secs, rows, types] = await Promise.all([
    db.select().from(chapters).where(eq(chapters.editionId, ed.id)).orderBy(asc(chapters.sort)),
    db
      .select({ id: subchapters.id, title: subchapters.title, sort: subchapters.sort })
      .from(subchapters)
      .innerJoin(chapters, eq(chapters.id, subchapters.chapterId))
      .where(eq(chapters.editionId, ed.id)),
    db
      .select({ s: sutras, chapterSlug: chapters.slug, chapterSort: chapters.sort, secSort: subchapters.sort })
      .from(sutras)
      .innerJoin(chapters, eq(chapters.id, sutras.chapterId))
      .leftJoin(subchapters, eq(subchapters.id, sutras.subchapterId))
      .where(eq(sutras.editionId, ed.id))
      .orderBy(asc(chapters.sort), sql`coalesce(${subchapters.sort}, 2147483647)`, asc(sutras.position)),
    db.select().from(commentaryTypes).where(eq(commentaryTypes.editionId, ed.id)).orderBy(asc(commentaryTypes.sort)),
  ]);
  const entries = rows.length
    ? await db.select().from(sutraCommentaries).where(inArray(sutraCommentaries.sutraId, rows.map((r) => r.s.id)))
    : [];
  const secTitle = new Map(secs.map((s) => [s.id, s.title]));
  const byKey = new Map(entries.map((e) => [`${e.sutraId}:${e.commentaryTypeId}`, e.html]));

  const header = [...SUTRA_COLS, ...types.map((t) => t.name)];
  const data = rows.map(({ s, chapterSlug }) => [
    chapterSlug,
    s.subchapterId ? secTitle.get(s.subchapterId) ?? "" : "",
    s.number,
    s.sanskrit,
    s.transliteration,
    s.vrtti,
    s.translation,
    s.synonyms,
    s.status,
    ...types.map((t) => byKey.get(`${s.id}:${t.id}`) ?? ""),
  ]);
  if (data.length === 0) data.push(["(chapter slug)", "(section title)", "1", "", "", "", "", "", "published", ...types.map(() => "")]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  ws["!cols"] = header.map((h, i) => ({ wch: i < 3 ? 14 : h === "Status" ? 10 : 40 }));
  ws["!freeze"] = { xSplit: 3, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws, "Sutras");

  const chRows = chs.map((c) => [c.slug, c.number ?? "", c.title, c.titleEn, c.kind, c.summary, c.rangeLabel, c.status]);
  const wc = XLSX.utils.aoa_to_sheet([[...CHAPTER_COLS], ...chRows]);
  wc["!cols"] = [{ wch: 26 }, { wch: 8 }, { wch: 30 }, { wch: 34 }, { wch: 9 }, { wch: 60 }, { wch: 14 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wc, "Chapters");

  const readme = [
    ["How to use this spreadsheet"],
    [""],
    ["1. Edit the “Sutras” sheet: correct text, fill in Vṛtti / Translation / commentaries, or add new rows."],
    ["2. Upload it in Admin › Chapters & sūtras › Spreadsheet. First run a dry run to see what will change, then apply."],
    [""],
    ["Rules"],
    ["• Sūtras are matched by Number. Change a cell and upload → that sūtra is updated."],
    ["• A new Number creates a new sūtra, placed right after the row above it (same section)."],
    ["• Empty cells are ignored — they never erase anything. To clear a field, use the admin."],
    ["• Rows are never deleted by an upload. Delete sūtras in the admin (it can renumber the following ones)."],
    ["• Chapter = the chapter's slug from the “Chapters” sheet. New chapters: add a row there first."],
    ["• Section = the section title. A title that doesn't exist yet in that chapter creates a new section."],
    ["• “/” in Sanskrit or Transliteration = line break. Status: published, draft or archived."],
    ["• One column per commentary (the columns after Status). New commentary kinds are added in the admin."],
    ["• Cells that show HTML tags (<p>, <strong>…) were formatted in the admin editor — keep the tags, or edit those in the admin."],
  ];
  const wr = XLSX.utils.aoa_to_sheet(readme);
  wr["!cols"] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(wb, wr, "Read me");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const date = new Date().toISOString().slice(0, 10);
  return { buffer, filename: `hnv-${ed.slug}-sutras-${date}.xlsx` };
}

// ------------------------------------------------------------- import ----
export type ImportReport = {
  dryRun: boolean;
  rows: number;
  chaptersCreated: string[];
  chaptersUpdated: number;
  sectionsCreated: string[];
  sutrasCreated: string[];
  sutrasUpdated: string[];
  commentariesChanged: number;
  unchanged: number;
  errors: string[];
  unknownColumns: string[];
};

type SheetRow = Record<string, unknown>;

function readSheet(wb: XLSX.WorkBook, name: string): { header: string[]; rows: { row: number; get: (col: string) => string }[] } | null {
  const sheetName = wb.SheetNames.find((n) => norm(n) === norm(name));
  if (!sheetName) return null;
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, blankrows: false, defval: "", raw: false });
  if (aoa.length === 0) return { header: [], rows: [] };
  const header = (aoa[0] as unknown[]).map(cell);
  const idx = new Map(header.map((h, i) => [norm(h), i]));
  return {
    header,
    rows: aoa.slice(1).map((r, i) => ({
      row: i + 2,
      get: (col: string) => {
        const k = idx.get(norm(col));
        return k === undefined ? "" : cell((r as SheetRow[])[k]);
      },
    })),
  };
}

/** Plain text from a spreadsheet becomes paragraphs; HTML is kept (sanitized). */
function richFromCell(v: string): string {
  if (/^\s*<[a-z][\s\S]*>/i.test(v)) return sanitizeRich(v);
  return v;
}

export async function importSpreadsheet(
  editionSlug: string,
  file: ArrayBuffer,
  opts: { dryRun: boolean; userId: number }
): Promise<ImportReport> {
  const db = getDb();
  const report: ImportReport = {
    dryRun: opts.dryRun,
    rows: 0,
    chaptersCreated: [],
    chaptersUpdated: 0,
    sectionsCreated: [],
    sutrasCreated: [],
    sutrasUpdated: [],
    commentariesChanged: 0,
    unchanged: 0,
    errors: [],
    unknownColumns: [],
  };

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(new Uint8Array(file), { type: "array" });
  } catch {
    report.errors.push("This file could not be read as a spreadsheet (.xlsx, .xls, .ods or .csv).");
    return report;
  }
  const [ed] = await db.select().from(editions).where(eq(editions.slug, editionSlug)).limit(1);
  if (!ed) throw new Error("Unknown edition");

  const sheet = readSheet(wb, "Sutras") ?? readSheet(wb, wb.SheetNames[0]);
  if (!sheet) {
    report.errors.push("No “Sutras” sheet found.");
    return report;
  }
  const types = await db.select().from(commentaryTypes).where(eq(commentaryTypes.editionId, ed.id));
  const known = new Set([...SUTRA_COLS, "S.No", "Subchapter", "Sutra Number"].map(norm));
  const typeCols = types.filter((t) => sheet.header.some((h) => norm(h) === norm(t.name)));
  report.unknownColumns = sheet.header.filter((h) => h && !known.has(norm(h)) && !types.some((t) => norm(t.name) === norm(h)));
  // Accept the old spreadsheet headers too.
  const get = (r: (typeof sheet.rows)[number], col: string) =>
    r.get(col) || (col === "Section" ? r.get("Subchapter") : col === "Number" ? r.get("Sutra Number") : "");
  const has = (col: string) => sheet.header.some((h) => norm(h) === norm(col));

  // ---- chapters (sheet "Chapters", optional)
  let chs = await db.select().from(chapters).where(eq(chapters.editionId, ed.id)).orderBy(asc(chapters.sort));
  const chSheet = readSheet(wb, "Chapters");
  if (chSheet) {
    let sort = chs.reduce((m, c) => Math.max(m, c.sort), 0);
    for (const r of chSheet.rows) {
      const slug = r.get("Slug");
      if (!slug) continue;
      const existing = chs.find((c) => c.slug === slug);
      const kind = r.get("Kind") === "verses" ? ("verses" as const) : ("sutras" as const);
      const num = r.get("Number");
      const status = STATUSES.has(r.get("Status")) ? (r.get("Status") as "published") : undefined;
      const fields = {
        ...(r.get("Title") && { title: r.get("Title") }),
        ...(r.get("English title") && { titleEn: r.get("English title") }),
        ...(r.get("Summary") && { summary: r.get("Summary") }),
        ...(r.get("Range label") && { rangeLabel: r.get("Range label") }),
        ...(r.get("Kind") && { kind }),
        ...(num && /^\d+$/.test(num) && { number: Number(num) }),
        ...(status && { status }),
      };
      if (!existing) {
        if (!/^[a-z0-9-]+$/.test(slug)) {
          report.errors.push(`Chapters row ${r.row}: slug “${slug}” may use only a–z, 0–9 and hyphens.`);
          continue;
        }
        report.chaptersCreated.push(slug);
        if (!opts.dryRun) {
          const [c] = await db
            .insert(chapters)
            .values({ editionId: ed.id, slug, title: r.get("Title") || slug, titleEn: r.get("English title"), sort: (sort += 10), ...fields, updatedBy: opts.userId })
            .returning();
          chs.push(c);
        } else {
          chs.push({ id: -report.chaptersCreated.length, slug, sort: (sort += 10) } as (typeof chs)[number]);
        }
      } else {
        const changed = Object.entries(fields).some(([k, v]) => existing[k as keyof typeof existing] !== v);
        if (changed) {
          report.chaptersUpdated++;
          if (!opts.dryRun) await db.update(chapters).set({ ...fields, updatedBy: opts.userId }).where(eq(chapters.id, existing.id));
        }
      }
    }
    if (!opts.dryRun) chs = await db.select().from(chapters).where(eq(chapters.editionId, ed.id));
  }
  const chapterBySlug = new Map(chs.map((c) => [c.slug, c]));

  // ---- current sūtras + sections of the edition
  const realIds = chs.filter((c) => c.id > 0).map((c) => c.id);
  const secs = realIds.length ? await db.select().from(subchapters).where(inArray(subchapters.chapterId, realIds)) : [];
  const current = await db.select().from(sutras).where(eq(sutras.editionId, ed.id));
  const byNumber = new Map(current.map((s) => [s.number, s]));
  const entries = current.length && typeCols.length
    ? await db.select().from(sutraCommentaries).where(inArray(sutraCommentaries.commentaryTypeId, typeCols.map((t) => t.id)))
    : [];
  const entryKey = new Map(entries.map((e) => [`${e.sutraId}:${e.commentaryTypeId}`, e]));

  // Give every touched chapter room between positions (step 1000) so new
  // rows can be slotted in after the row above them; resequenced at the end.
  const touchedChapters = new Set<number>();
  const posScale = 100;

  type SecKey = string; // `${chapterId}:${normTitle}`
  const secByKey = new Map<SecKey, { id: number; chapterId: number; title: string; sort: number }>(
    secs.map((s) => [`${s.chapterId}:${norm(s.title)}`, s])
  );
  const secMaxSort = new Map<number, number>();
  for (const s of secs) secMaxSort.set(s.chapterId, Math.max(secMaxSort.get(s.chapterId) ?? 0, s.sort));
  let fakeSecId = 0;

  const seen = new Set<string>();
  const updates: { id: number; set: Partial<typeof sutras.$inferInsert>; before: unknown }[] = [];
  const creates: { row: number; values: typeof sutras.$inferInsert; commentaries: { typeId: number; html: string }[] }[] = [];
  const commentaryOps: { sutraId: number; typeId: number; html: string; existingId?: number }[] = [];
  const lastPos = new Map<number, number>(); // section id → scaled position of the last row seen

  for (const r of sheet.rows) {
    const number = get(r, "Number");
    const chSlug = get(r, "Chapter");
    if (!number && !chSlug && !get(r, "Sanskrit")) continue; // blank line
    report.rows++;
    if (!number) {
      report.errors.push(`Row ${r.row}: Number is empty.`);
      continue;
    }
    if (!/^[0-9A-Za-z.\-]+$/.test(number) || number.length > 20) {
      report.errors.push(`Row ${r.row}: “${number}” is not a valid number.`);
      continue;
    }
    if (seen.has(number)) {
      report.errors.push(`Row ${r.row}: number ${number} appears twice in the sheet.`);
      continue;
    }
    seen.add(number);
    const existing = byNumber.get(number);
    const ch = chSlug ? chapterBySlug.get(chSlug) : existing ? chs.find((c) => c.id === existing.chapterId) : undefined;
    if (!ch) {
      report.errors.push(`Row ${r.row}: chapter “${chSlug || "(empty)"}” not found — use a slug from the Chapters sheet.`);
      continue;
    }
    const status = get(r, "Status");
    if (status && !STATUSES.has(status)) {
      report.errors.push(`Row ${r.row}: Status must be published, draft or archived.`);
      continue;
    }

    // Section
    const secTitle = get(r, "Section");
    let sec = secTitle ? secByKey.get(`${ch.id}:${norm(secTitle)}`) : existing?.subchapterId ? secs.find((s) => s.id === existing.subchapterId) : undefined;
    if (!sec) {
      if (!secTitle) {
        report.errors.push(`Row ${r.row}: Section is empty for a new sūtra.`);
        continue;
      }
      const sort = (secMaxSort.get(ch.id) ?? 0) + 10;
      secMaxSort.set(ch.id, sort);
      report.sectionsCreated.push(`${secTitle} (${ch.slug})`);
      if (!opts.dryRun && ch.id > 0) {
        const taken = new Set(secs.filter((s) => s.chapterId === ch.id).map((s) => s.slug));
        let slug = slugifyTitle(secTitle);
        for (let i = 2; taken.has(slug); i++) slug = `${slugifyTitle(secTitle)}-${i}`;
        const [created] = await db.insert(subchapters).values({ chapterId: ch.id, title: secTitle, slug, sort }).returning();
        secs.push(created);
        sec = created;
      } else {
        sec = { id: --fakeSecId, chapterId: ch.id, title: secTitle, sort };
      }
      secByKey.set(`${ch.id}:${norm(secTitle)}`, sec);
    }

    const text = {
      ...(get(r, "Sanskrit") && { sanskrit: get(r, "Sanskrit") }),
      ...(get(r, "Transliteration") && { transliteration: get(r, "Transliteration") }),
      ...(get(r, "Vrtti") && { vrtti: richFromCell(get(r, "Vrtti")) }),
      ...(get(r, "Translation") && { translation: richFromCell(get(r, "Translation")) }),
      ...(get(r, "Synonyms") && { synonyms: richFromCell(get(r, "Synonyms")) }),
      ...(status && { status: status as "published" }),
    };
    const comms = typeCols
      .map((t) => ({ typeId: t.id, html: richFromCell(r.get(t.name)) }))
      .filter((c) => c.html);

    if (existing) {
      const set: Partial<typeof sutras.$inferInsert> = {};
      for (const [k, v] of Object.entries(text)) if (existing[k as keyof typeof existing] !== v) (set as Record<string, unknown>)[k] = v;
      if (existing.chapterId !== ch.id) set.chapterId = ch.id;
      if (sec.id > 0 && existing.subchapterId !== sec.id) set.subchapterId = sec.id;
      const scaled = existing.position * posScale;
      if (set.chapterId || set.subchapterId) set.position = (lastPos.get(sec.id) ?? 0) + 1;
      lastPos.set(sec.id, set.position ?? scaled);
      let commChanged = 0;
      for (const c of comms) {
        const prev = entryKey.get(`${existing.id}:${c.typeId}`);
        if (prev?.html === c.html) continue;
        commentaryOps.push({ sutraId: existing.id, typeId: c.typeId, html: c.html, existingId: prev?.id });
        commChanged++;
      }
      if (Object.keys(set).length) {
        updates.push({ id: existing.id, set, before: existing });
        report.sutrasUpdated.push(number);
        touchedChapters.add(existing.chapterId);
        touchedChapters.add(ch.id);
      } else if (!commChanged) report.unchanged++;
      report.commentariesChanged += commChanged;
    } else {
      const position = (lastPos.get(sec.id) ?? maxScaledPos(current, sec.id, posScale)) + 1;
      lastPos.set(sec.id, position);
      creates.push({
        row: r.row,
        values: {
          editionId: ed.id,
          chapterId: ch.id,
          subchapterId: sec.id > 0 ? sec.id : null,
          number,
          position,
          sanskrit: text.sanskrit ?? "",
          transliteration: text.transliteration ?? "",
          vrtti: text.vrtti ?? "",
          translation: text.translation ?? "",
          synonyms: text.synonyms ?? "",
          status: text.status ?? "published",
          updatedBy: opts.userId,
        },
        commentaries: comms,
      });
      report.sutrasCreated.push(number);
      report.commentariesChanged += comms.length;
      if (ch.id > 0) touchedChapters.add(ch.id);
    }
  }

  if (opts.dryRun || report.errors.length) {
    // Never write half an upload: any error means nothing is applied.
    if (!opts.dryRun && report.errors.length) report.dryRun = true;
    return report;
  }

  // ---- write
  const touched = [...touchedChapters];
  if (touched.length) {
    // scale positions so rows can be slotted between neighbours
    await db.update(sutras).set({ position: sql`${sutras.position} * ${posScale}` }).where(inArray(sutras.chapterId, touched));
  }
  for (let i = 0; i < updates.length; i += 100) {
    const chunk = updates.slice(i, i + 100);
    await db.batch(
      chunk.flatMap((u) => [
        db.update(sutras).set({ ...u.set, updatedBy: opts.userId }).where(eq(sutras.id, u.id)),
        db.insert(revisions).values({ entityTable: "sutras", entityId: u.id, action: "import", before: u.before, after: u.set, userId: opts.userId, note: "spreadsheet upload" }),
      ]) as unknown as Parameters<typeof db.batch>[0]
    );
  }
  for (let i = 0; i < creates.length; i += 100) {
    const chunk = creates.slice(i, i + 100);
    const made = await db.insert(sutras).values(chunk.map((c) => c.values)).returning({ id: sutras.id, number: sutras.number });
    const idByNumber = new Map(made.map((m) => [m.number, m.id]));
    for (const c of chunk) for (const cm of c.commentaries) commentaryOps.push({ sutraId: idByNumber.get(c.values.number)!, typeId: cm.typeId, html: cm.html });
  }
  for (let i = 0; i < commentaryOps.length; i += 100) {
    const chunk = commentaryOps.slice(i, i + 100);
    await db.batch(
      chunk.map((c) =>
        c.existingId
          ? db.update(sutraCommentaries).set({ html: c.html, updatedBy: opts.userId }).where(eq(sutraCommentaries.id, c.existingId))
          : db
              .insert(sutraCommentaries)
              .values({ sutraId: c.sutraId, commentaryTypeId: c.typeId, html: c.html, updatedBy: opts.userId })
              .onConflictDoUpdate({ target: [sutraCommentaries.sutraId, sutraCommentaries.commentaryTypeId], set: { html: c.html, updatedBy: opts.userId } })
      ) as unknown as Parameters<typeof db.batch>[0]
    );
  }
  for (const chapterId of touched) {
    await db.execute(sql`
      update sutras s set position = o.rn * 10
      from (
        select s2.id, row_number() over (order by coalesce(sc.sort, 2147483647), s2.position, s2.id) as rn
        from sutras s2 left join subchapters sc on sc.id = s2.subchapter_id
        where s2.chapter_id = ${chapterId}
      ) o
      where s.id = o.id`);
  }
  return report;
}

function maxScaledPos(rows: { subchapterId: number | null; position: number }[], secId: number, scale: number) {
  let m = 0;
  for (const r of rows) if (r.subchapterId === secId) m = Math.max(m, r.position * scale);
  return m;
}

/** Sort numbers naturally (used in reports). */
export function sortNumbers(list: string[]) {
  return [...list].sort(compareNumbers);
}

