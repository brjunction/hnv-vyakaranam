import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailyItems, dailyPins, type DailyPool } from "@/lib/db/schema";
import { isDbConfigured } from "@/lib/env";
import { tags } from "@/lib/data/tags";
import { pickKey, type DailyEntry, type DailyPayload } from "@/lib/daily/pick";

type Pools = {
  keys: Record<DailyPool, string[]>;
  pins: Record<DailyPool, Record<string, string>>;
};

/** Ids of every published entry per pool (stable order) plus all pins. */
const loadPools = unstable_cache(
  async (): Promise<Pools> => {
    const db = getDb();
    const [rows, pinRows] = await db.batch([
      db
        .select({ id: dailyItems.id, pool: dailyItems.pool })
        .from(dailyItems)
        .where(eq(dailyItems.status, "published"))
        .orderBy(asc(dailyItems.id)),
      db.select({ pool: dailyPins.pool, date: dailyPins.date, id: dailyPins.entityId }).from(dailyPins),
    ]);
    const out: Pools = { keys: { verse_of_day: [], subhashita: [] }, pins: { verse_of_day: {}, subhashita: {} } };
    for (const r of rows) out.keys[r.pool].push(`daily_item:${r.id}`);
    for (const p of pinRows) out.pins[p.pool][p.date] = `daily_item:${p.id}`;
    return out;
  },
  ["daily:pools:v2"],
  { tags: [tags.daily], revalidate: false }
);

async function loadEntry(key: string | null): Promise<DailyEntry | null> {
  if (!key) return null;
  const id = Number(key.split(":")[1]);
  if (!Number.isInteger(id)) return null;
  const [row] = await getDb()
    .select()
    .from(dailyItems)
    .where(and(eq(dailyItems.id, id), eq(dailyItems.status, "published")))
    .limit(1);
  if (!row) return null;
  return {
    key,
    type: row.pool === "verse_of_day" ? "verse" : "subhashita",
    id: row.id,
    label: row.pool === "verse_of_day" ? "Verse of the Day" : "Subhāṣita",
    context: row.source,
    sanskrit: row.sanskrit,
    iast: row.iast,
    translation: row.translation,
    source: row.source,
    href: null,
  };
}

/**
 * Today's Verse of the Day and Subhāṣita for a calendar date.
 * Default: never throws (admin previews). The public API route passes
 * `throwOnError` so a transient database error becomes an uncached 500
 * instead of an empty day cached for 24 hours.
 */
export async function getDailyFor(date: string, opts: { throwOnError?: boolean } = {}): Promise<DailyPayload> {
  const empty: DailyPayload = { date, verseOfDay: null, subhashita: null };
  if (!isDbConfigured) return empty;
  try {
    const pools = await loadPools();
    const [verseOfDay, subhashita] = await Promise.all([
      loadEntry(pickKey(pools.keys.verse_of_day, date, pools.pins.verse_of_day[date])),
      loadEntry(pickKey(pools.keys.subhashita, date, pools.pins.subhashita[date])),
    ]);
    return { date, verseOfDay, subhashita };
  } catch (err) {
    console.error("[getDailyFor]", { date }, err);
    if (opts.throwOnError) throw err;
    return empty;
  }
}
