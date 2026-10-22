import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { chapters as chaptersT, editions, revisions, subchapters, sutras } from "@/lib/db/schema";
import { chapters as CHAPTER_META, getChapter } from "@/lib/content";

// Imports content/chapters/*.xlsx (the pre-database source) into Neon.
// Idempotent upserts on natural keys; never deletes; never touches
// daily_eligible on existing rows (admin choices win). docs/03 §2.

const VERSE_CHAPTERS = new Set(["mangalacarana", "afterword"]);
const BATCH = 150;

/** ASCII slug from a diacritic title: "Sarveśvara-sandhi" → "sarvesvara-sandhi". */
export function slugifyTitle(title: string): string {
  const s = title
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
  return s || "general";
}

export type ImportReport = {
  chapters: number;
  subchapters: number;
  sutras: number;
  perChapter: { slug: string; subchapters: number; sutras: number }[];
};

export async function importHnvFromSpreadsheets(userId: number): Promise<ImportReport> {
  const db = getDb();

  const [edition] = await db
    .insert(editions)
    .values({ slug: "madhyama", name: "Madhyama", nameEn: "Middle edition", sort: 10, isPublished: true })
    .onConflictDoUpdate({ target: editions.slug, set: { isPublished: true } })
    .returning({ id: editions.id });
  await db
    .insert(editions)
    .values([
      { slug: "laghu", name: "Laghu", nameEn: "Short edition", sort: 20, isPublished: false },
      { slug: "brhat", name: "Bṛhat", nameEn: "Large edition", sort: 30, isPublished: false },
    ])
    .onConflictDoNothing({ target: editions.slug });

  const chapterRows = await db
    .insert(chaptersT)
    .values(
      CHAPTER_META.map((c, i) => ({
        editionId: edition.id,
        slug: c.slug,
        number: VERSE_CHAPTERS.has(c.slug) ? null : c.number,
        title: c.title,
        titleEn: c.titleEnglish,
        summary: c.summary,
        kind: VERSE_CHAPTERS.has(c.slug) ? ("verses" as const) : ("sutras" as const),
        rangeLabel: c.sutraRange,
        sort: (i + 1) * 10,
        updatedBy: userId,
      }))
    )
    .onConflictDoUpdate({
      target: [chaptersT.editionId, chaptersT.slug],
      set: {
        number: sql`excluded.number`,
        title: sql`excluded.title`,
        titleEn: sql`excluded.title_en`,
        summary: sql`excluded.summary`,
        kind: sql`excluded.kind`,
        rangeLabel: sql`excluded.range_label`,
        sort: sql`excluded.sort`,
        updatedBy: sql`excluded.updated_by`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: chaptersT.id, slug: chaptersT.slug });
  const chapterId = new Map(chapterRows.map((r) => [r.slug, r.id]));

  const report: ImportReport = { chapters: chapterRows.length, subchapters: 0, sutras: 0, perChapter: [] };

  for (const meta of CHAPTER_META) {
    const chapter = getChapter(meta.slug);
    const cid = chapterId.get(meta.slug);
    if (!chapter || !cid || chapter.sections.length === 0) {
      report.perChapter.push({ slug: meta.slug, subchapters: 0, sutras: 0 });
      continue;
    }

    const subRows = await db
      .insert(subchapters)
      .values(chapter.sections.map((s, i) => ({ chapterId: cid, slug: slugifyTitle(s.title), title: s.title, sort: (i + 1) * 10 })))
      .onConflictDoUpdate({
        target: [subchapters.chapterId, subchapters.slug],
        set: { title: sql`excluded.title`, sort: sql`excluded.sort`, updatedAt: sql`now()` },
      })
      .returning({ id: subchapters.id, slug: subchapters.slug });
    const subId = new Map(subRows.map((r) => [r.slug, r.id]));

    let position = 0;
    const rows = chapter.sections.flatMap((s) =>
      s.sutras.map((su) => ({
        editionId: edition.id,
        chapterId: cid,
        subchapterId: subId.get(slugifyTitle(s.title)) ?? null,
        number: su.number,
        position: (position += 10),
        sanskrit: su.sutraSanskrit,
        transliteration: su.sutraTransliteration,
        vrtti: su.vrtti,
        translation: su.translation,
        dailyEligible: true,
        updatedBy: userId,
      }))
    );

    for (let i = 0; i < rows.length; i += BATCH) {
      await db
        .insert(sutras)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoUpdate({
          target: [sutras.editionId, sutras.number],
          set: {
            chapterId: sql`excluded.chapter_id`,
            subchapterId: sql`excluded.subchapter_id`,
            position: sql`excluded.position`,
            sanskrit: sql`excluded.sanskrit`,
            transliteration: sql`excluded.transliteration`,
            vrtti: sql`excluded.vrtti`,
            translation: sql`excluded.translation`,
            updatedBy: sql`excluded.updated_by`,
            updatedAt: sql`now()`,
          },
        });
    }

    await db.insert(revisions).values({
      entityTable: "chapters",
      entityId: cid,
      action: "import",
      before: null,
      after: { subchapters: subRows.length, sutras: rows.length },
      userId,
      note: `Imported ${rows.length} rows from content/chapters/${meta.slug}.xlsx`,
    });

    report.subchapters += subRows.length;
    report.sutras += rows.length;
    report.perChapter.push({ slug: meta.slug, subchapters: subRows.length, sutras: rows.length });
  }

  return report;
}
