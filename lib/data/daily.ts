import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { chapters, dailyItems, dailyPins, editions, sutras } from "@/lib/db/schema";
import { isDbConfigured } from "@/lib/env";
import { tags } from "@/lib/data/tags";
import { pickKey, type DailyEntry, type DailyPayload } from "@/lib/daily/pick";

type Pools = {
  verseKeys: string[];
  subhashitaKeys: string[];
  pins: { verse_of_day: Record<string, string>; subhashita: Record<string, string> };
};

/** Keys of every eligible item, in stable reading order, plus all pins. */
const loadPools = unstable_cache(
  async (): Promise<Pools> => {
    const db = getDb();
    const [sutraRows, subRows, pinRows] = await db.batch([
      db
        .select({ id: sutras.id })
        .from(sutras)
        .innerJoin(chapters, eq(chapters.id, sutras.chapterId))
        .innerJoin(editions, eq(editions.id, sutras.editionId))
        .where(
          and(
            eq(sutras.dailyEligible, true),
            eq(sutras.status, "published"),
            eq(chapters.status, "published"),
            eq(editions.isPublished, true)
          )
        )
        .orderBy(asc(editions.sort), asc(chapters.sort), asc(sutras.position)),
      db
        .select({ id: dailyItems.id })
        .from(dailyItems)
        .where(and(eq(dailyItems.pool, "subhashita"), eq(dailyItems.status, "published")))
        .orderBy(asc(dailyItems.id)),
      db
        .select({ pool: dailyPins.pool, date: dailyPins.date, type: dailyPins.entityType, id: dailyPins.entityId })
        .from(dailyPins),
    ]);
    const pins: Pools["pins"] = { verse_of_day: {}, subhashita: {} };
    for (const p of pinRows) pins[p.pool][p.date] = `${p.type}:${p.id}`;
    return {
      verseKeys: sutraRows.map((r) => `sutra:${r.id}`),
      subhashitaKeys: subRows.map((r) => `daily_item:${r.id}`),
      pins,
    };
  },
  ["daily:pools:v1"],
  { tags: [tags.daily], revalidate: false }
);

async function loadSutraEntry(id: number): Promise<DailyEntry | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: sutras.id,
      number: sutras.number,
      sanskrit: sutras.sanskrit,
      iast: sutras.transliteration,
      translation: sutras.translation,
      chapterSlug: chapters.slug,
      chapterTitle: chapters.title,
      chapterKind: chapters.kind,
    })
    .from(sutras)
    .innerJoin(chapters, eq(chapters.id, sutras.chapterId))
    .where(eq(sutras.id, id))
    .limit(1);
  if (!row) return null;
  const isVerse = row.chapterKind === "verses";
  return {
    key: `sutra:${row.id}`,
    type: isVerse ? "verse" : "sutra",
    id: row.id,
    label: isVerse ? `${row.chapterTitle}, verse ${row.number}` : `Sūtra ${row.number}`,
    context: row.chapterTitle,
    sanskrit: row.sanskrit,
    iast: row.iast,
    translation: row.translation,
    source: "",
    href: `/chapters/${row.chapterSlug}#${encodeURIComponent(row.number)}`,
  };
}

async function loadSubhashitaEntry(id: number): Promise<DailyEntry | null> {
  const db = getDb();
  const [row] = await db.select().from(dailyItems).where(eq(dailyItems.id, id)).limit(1);
  if (!row) return null;
  return {
    key: `daily_item:${row.id}`,
    type: "subhashita",
    id: row.id,
    label: "Subhāṣita",
    context: row.source,
    sanskrit: row.sanskrit,
    iast: row.iast,
    translation: row.translation,
    source: row.source,
    href: null,
  };
}

function parseKey(key: string | null): { type: string; id: number } | null {
  if (!key) return null;
  const [type, id] = key.split(":");
  const n = Number(id);
  return Number.isInteger(n) ? { type, id: n } : null;
}

/**
 * Today's Verse of the Day and Subhāṣita for a calendar date.
 *
 * By default never throws (admin previews). The public API route passes
 * `throwOnError` so a transient database error becomes a 503 that is NOT
 * cached, instead of an empty day cached for 24 hours.
 */
export async function getDailyFor(date: string, opts: { throwOnError?: boolean } = {}): Promise<DailyPayload> {
  const empty: DailyPayload = { date, verseOfDay: null, subhashita: null };
  if (!isDbConfigured) return empty;
  try {
    const pools = await loadPools();
    const vKey = parseKey(pickKey(pools.verseKeys, date, pools.pins.verse_of_day[date]));
    const sKey = parseKey(pickKey(pools.subhashitaKeys, date, pools.pins.subhashita[date]));
    const [verseOfDay, subhashita] = await Promise.all([
      vKey ? loadSutraEntry(vKey.id) : Promise.resolve(null),
      sKey ? loadSubhashitaEntry(sKey.id) : Promise.resolve(null),
    ]);
    return { date, verseOfDay, subhashita };
  } catch (err) {
    console.error("[getDailyFor]", { date }, err);
    if (opts.throwOnError) throw err;
    return empty;
  }
}

/** Admin helper: pool sizes per chapter (no caching — admin is dynamic). */
export async function getDailyPoolStats() {
  const db = getDb();
  const rows = await db
    .select({
      chapterId: chapters.id,
      slug: chapters.slug,
      title: chapters.title,
      sort: chapters.sort,
      eligible: sutras.dailyEligible,
    })
    .from(sutras)
    .innerJoin(chapters, eq(chapters.id, sutras.chapterId))
    .where(eq(sutras.status, "published"));
  const byChapter = new Map<number, { chapterId: number; slug: string; title: string; sort: number; total: number; eligible: number }>();
  for (const r of rows) {
    const c = byChapter.get(r.chapterId) ?? { chapterId: r.chapterId, slug: r.slug, title: r.title, sort: r.sort, total: 0, eligible: 0 };
    c.total++;
    if (r.eligible) c.eligible++;
    byChapter.set(r.chapterId, c);
  }
  return [...byChapter.values()].sort((a, b) => a.sort - b.sort);
}

export async function findSutrasByNumbers(numbers: string[]) {
  if (numbers.length === 0) return [];
  const db = getDb();
  return db
    .select({ id: sutras.id, number: sutras.number, sanskrit: sutras.sanskrit, chapterTitle: chapters.title })
    .from(sutras)
    .innerJoin(chapters, eq(chapters.id, sutras.chapterId))
    .where(inArray(sutras.number, numbers));
}
