import "server-only";
import zlib from "zlib";
import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dictSections, dictionaries } from "@/lib/db/schema";
import { isDbConfigured } from "@/lib/env";
import { parseEntry, readAllDefinitions, readBytes, readDefinition } from "@/lib/dict/stardict";
import { fieldToHtml, fieldsToText } from "@/lib/dict/render";
import { fold, iastToDeva, queryKeys } from "@/lib/dict/translit";
import { shardOf, type Shard, type ShardRow } from "@/lib/dict/prepare";
import { fromRef, listKeys } from "@/lib/storage/neon";

// Dictionary search. Each dictionary's index is split by first letter
// (lib/dict/prepare.ts); a search loads only the matching letter's shard
// from each dictionary and keeps recently used shards in memory.
// Definitions are read straight from the StarDict files in storage.

export type DictMeta = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  source: string;
  files: { ifo: string; idx: string; dict: string; syn?: string };
  /** Prefix of the shard files: `${indexUrl}${letter}.json.gz` */
  indexUrl: string;
  sts: string;
  totalBytes: number;
  wordCount: number;
  /** The work this file is a copy of — files of one work merge into one card. */
  category: string;
  section: { id: number; key: string; name: string; sort: number };
  updatedAt: string;
  /** True once the English meaning index has been built (admin › Dictionaries). */
  meaningIndexed: boolean;
};

const NO_SECTION = { id: 0, key: "other", name: "Other", sort: 1e6 };

/** Group for the picker: saved category, else the first folder under the uploaded root. */
export function categoryFromRef(ifoRef: string): string {
  const path = ifoRef.replace(/^s3:dict\/[^/]+\//, "");
  const dirs = path.split("/").slice(0, -1);
  return dirs.length >= 2 ? dirs[1] : "Other";
}

export const DICT_TAG = "dictionaries";

export const listDictionaries = unstable_cache(
  async (): Promise<DictMeta[]> => {
    if (!isDbConfigured) return [];
    const db = getDb();
    const [rows, secs] = await Promise.all([
      db.select().from(dictionaries).where(eq(dictionaries.isEnabled, true)).orderBy(asc(dictionaries.sort), asc(dictionaries.id)),
      db.select().from(dictSections).orderBy(asc(dictSections.sort), asc(dictSections.id)),
    ]);
    const secOf = (id: number | null) => {
      const s = secs.find((x) => x.id === id);
      return s ? { id: s.id, key: s.key, name: s.name, sort: s.sort } : NO_SECTION;
    };
    return rows
      .filter((r) => r.indexUrl)
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        shortName: r.shortName || r.name,
        source: r.source,
        files: r.files,
        indexUrl: r.indexUrl,
        sts: (r.info as Record<string, string>).sametypesequence ?? "",
        totalBytes: r.totalBytes,
        wordCount: r.wordCount,
        category: r.category || r.name,
        section: secOf(r.sectionId),
        updatedAt: r.updatedAt.toISOString(),
        meaningIndexed: Boolean((r.info as Record<string, string>).meaningWords),
      }))
      .sort((a, b) => a.section.sort - b.section.sort || 0);
  },
  ["dict:list:v5"],
  { tags: [DICT_TAG], revalidate: 3600 }
);

// ------------------------------------------------------------- shards
type Loaded = { rows: ShardRow[]; byLabel: Map<string, number[]>; bytes: number };
const shardCache = new Map<string, Promise<Loaded>>();
const shardSize = new Map<string, number>();
let cachedBytes = 0;
const CACHE_MAX = 600 * 1024 * 1024;

const EMPTY: Loaded = { rows: [], byLabel: new Map(), bytes: 0 };

async function fetchShard(meta: DictMeta, c: string): Promise<Loaded> {
  let gz: Buffer;
  try {
    gz = await readBytes(`${meta.indexUrl}${c}.json.gz`);
  } catch {
    return EMPTY; // no headwords with this letter
  }
  const json = zlib.gunzipSync(gz).toString("utf8");
  const shard = JSON.parse(json) as Shard;
  const byLabel = new Map<string, number[]>();
  shard.rows.forEach((r, i) => {
    const k = r[1].toLowerCase();
    const list = byLabel.get(k);
    if (list) list.push(i);
    else byLabel.set(k, [i]);
  });
  return { rows: shard.rows, byLabel, bytes: json.length * 3 };
}

export function loadShard(meta: DictMeta, c: string): Promise<Loaded> {
  const key = `${meta.id}|${meta.indexUrl}|${c}`;
  const hit = shardCache.get(key);
  if (hit) {
    // refresh LRU position
    shardCache.delete(key);
    shardCache.set(key, hit);
    return hit;
  }
  const p = fetchShard(meta, c).then((l) => {
    shardSize.set(key, l.bytes);
    cachedBytes += l.bytes;
    while (cachedBytes > CACHE_MAX && shardCache.size > 1) {
      const oldest = shardCache.keys().next().value as string;
      if (oldest === key) break;
      cachedBytes -= shardSize.get(oldest) ?? 0;
      shardCache.delete(oldest);
      shardSize.delete(oldest);
    }
    return l;
  });
  p.catch(() => shardCache.delete(key));
  shardCache.set(key, p);
  return p;
}

const shardLists = new Map<string, Promise<string[]>>();
/** Letters that have a shard (for whole-dictionary operations). */
export function shardLetters(meta: DictMeta): Promise<string[]> {
  const k = `${meta.id}|${meta.indexUrl}`;
  let p = shardLists.get(k);
  if (!p) {
    const key = fromRef(meta.indexUrl);
    p = key
      ? listKeys(key).then((list) => list.map((o) => o.key.slice(key.length).replace(/\.json\.gz$/, "")))
      : import("fs").then((fs) => fs.readdirSync(new URL(meta.indexUrl)).map((f) => f.replace(/\.json\.gz$/, "")));
    p.catch(() => shardLists.delete(k));
    shardLists.set(k, p);
  }
  return p;
}

// ------------------------------------------------------------- search
export type SearchHit = {
  headword: string;
  deva: string;
  match: "exact" | "prefix" | "similar" | "contains" | "meaning";
  dicts: string[];
};

function lowerBound(rows: ShardRow[], k: string) {
  let lo = 0;
  let hi = rows.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid][0] < k) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Edit distance with an early exit above `max`. */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const RANK = { exact: 0, prefix: 1, similar: 2, contains: 3, meaning: 4 } as const;

export async function searchDictionaries(
  q: string,
  opts: { dict?: string[]; mode?: "word" | "meaning"; limit?: number; metas?: DictMeta[] } = {}
) {
  const limit = Math.min(opts.limit ?? 50, 100);
  const all = opts.metas ?? (await listDictionaries());
  const metas = all.filter((m) => !opts.dict?.length || opts.dict.includes(m.slug));
  const hits = new Map<string, { h: SearchHit; score: number }>();
  const add = (label: string, dict: string, match: SearchHit["match"], score: number) => {
    const key = label.toLowerCase();
    const cur = hits.get(key);
    if (cur) {
      if (!cur.h.dicts.includes(dict)) cur.h.dicts.push(dict);
      if (score < cur.score) {
        cur.score = score;
        cur.h.match = match;
      }
    } else hits.set(key, { h: { headword: label, deva: "", match, dicts: [dict] }, score });
  };

  let note = "";
  if (limit > 0 && opts.mode === "meaning") {
    note = await meaningSearch(q, metas, opts.dict?.length ? metas : metas.slice(0, 2), limit, add);
  } else if (limit > 0) {
    const keys = queryKeys(q);
    for (const k of keys) {
      const c = shardOf(k);
      const loaded = await Promise.all(metas.map((m) => loadShard(m, c)));
      loaded.forEach((s, di) => {
        const slug = metas[di].slug;
        let i = lowerBound(s.rows, k);
        let taken = 0;
        while (i < s.rows.length && taken < limit * 2) {
          const r = s.rows[i];
          if (!r[0].startsWith(k)) break;
          const exact = r[0] === k;
          add(r[1], slug, exact ? "exact" : "prefix", (exact ? RANK.exact : RANK.prefix) + (r[0].length - k.length) / 1000);
          taken++;
          i++;
        }
      });
      // similar spellings (typos, missing diacritics) when there are few results
      if (hits.size < 12 && k.length >= 3) {
        const max = k.length <= 5 ? 1 : 2;
        loaded.forEach((s, di) => {
          const found: { r: ShardRow; dist: number }[] = [];
          for (const r of s.rows) {
            if (Math.abs(r[0].length - k.length) > max) continue;
            const dist = distance(k, r[0], max);
            if (dist <= max && dist > 0) found.push({ r, dist });
          }
          found.sort((a, b) => a.dist - b.dist).slice(0, 20).forEach(({ r, dist }) => add(r[1], metas[di].slug, "similar", RANK.similar + dist / 10));
        });
      }
      // inside a longer word (compounds) as a last resort
      if (hits.size < 6 && k.length >= 4) {
        loaded.forEach((s, di) => {
          let n = 0;
          for (const r of s.rows) {
            if (n >= 20) break;
            if (r[0].includes(k) && !r[0].startsWith(k)) {
              add(r[1], metas[di].slug, "contains", RANK.contains + r[0].length / 1000);
              n++;
            }
          }
        });
      }
    }
  }

  const results = [...hits.values()]
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ h }) => ({ ...h, deva: iastToDeva(h.headword) }));
  return {
    results,
    note,
    dictionaries: all.map((m) => ({ slug: m.slug, name: m.name, shortName: m.shortName, category: m.category, section: m.section.name, sectionSort: m.section.sort, words: m.wordCount })),
  };
}

// ------------------------------------------------------------- meaning index
// Built once per dictionary (lib/dict/meaning.ts): English word → the best
// headwords. A meaning search then reads one small file per word instead of
// scanning whole dictionaries.
export type MeaningShard = { v: 1; w: Record<string, [string, number][]> };
const meaningCache = new Map<string, Promise<MeaningShard>>();
const MEANING_CACHE_MAX = 80;

export function loadMeaningShard(meta: DictMeta, c: string): Promise<MeaningShard> {
  const key = `${meta.id}|${meta.indexUrl}|m|${c}`;
  const hit = meaningCache.get(key);
  if (hit) return hit;
  const p = readBytes(`${meta.indexUrl}meaning/${c}.json.gz`)
    .then((gz) => JSON.parse(zlib.gunzipSync(gz).toString("utf8")) as MeaningShard)
    .catch(() => ({ v: 1, w: {} }) as MeaningShard);
  meaningCache.set(key, p);
  if (meaningCache.size > MEANING_CACHE_MAX) meaningCache.delete(meaningCache.keys().next().value as string);
  return p;
}

const STOP = new Set("the and for with from that this are was were has have not but you your his her its their they them then than into onto upon one two also any all can may who whom whose which what when where how why out off per via etc".split(" "));
/** Same light normalisation used when the index is built. */
export function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) return w.slice(0, -1);
  return w;
}
export function meaningTokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map(stem);
}

async function indexedMeaning(
  q: string,
  metas: DictMeta[],
  add: (label: string, dict: string, match: SearchHit["match"], score: number) => void
) {
  const words = [...new Set(meaningTokens(q))].slice(0, 4);
  if (!words.length) return;
  for (const m of metas) {
    const per = await Promise.all(
      words.map(async (w) => {
        const sh = await loadMeaningShard(m, w[0]);
        return new Map(sh.w[w] ?? []);
      })
    );
    const labels = new Map<string, { n: number; s: number }>();
    per.forEach((mp) => {
      for (const [label, s] of mp) {
        const cur = labels.get(label);
        if (cur) {
          cur.n++;
          cur.s += s;
        } else labels.set(label, { n: 1, s });
      }
    });
    for (const [label, v] of labels) add(label, m.slug, "meaning", RANK.meaning + (words.length - v.n) * 10 - Math.min(v.s, 99) / 100);
  }
}

// Meaning (reverse) search over the definitions of a few dictionaries.
const MEANING_MAX_BYTES = 80 * 1024 * 1024;
const plainTexts = new Map<string, Promise<{ label: string; text: string }[]>>();

async function textsOf(meta: DictMeta) {
  const key = `${meta.id}|${meta.indexUrl}`;
  let p = plainTexts.get(key);
  if (!p) {
    p = (async () => {
      const [all, letters] = await Promise.all([readAllDefinitions(meta.files.dict), shardLetters(meta)]);
      const seen = new Set<number>();
      const out: { label: string; text: string }[] = [];
      for (const c of letters) {
        const s = await loadShard(meta, c);
        for (const r of s.rows) {
          if (seen.has(r[2])) continue;
          seen.add(r[2]);
          out.push({ label: r[1], text: fieldsToText(parseEntry(all.subarray(r[2], r[2] + r[3]), meta.sts || undefined)).toLowerCase() });
        }
      }
      return out;
    })();
    p.catch(() => plainTexts.delete(key));
    plainTexts.set(key, p);
  }
  return p;
}

async function meaningSearch(
  q: string,
  _all: DictMeta[],
  metas: DictMeta[],
  limit: number,
  add: (label: string, dict: string, match: SearchHit["match"], score: number) => void
): Promise<string> {
  const indexed = _all.filter((m) => m.meaningIndexed);
  const rest = metas.filter((m) => !m.meaningIndexed);
  if (indexed.length) {
    try {
      await indexedMeaning(q, indexed, add);
    } catch (err) {
      console.error("[dict/meaning]", err);
    }
    // Only fall back to scanning when nothing at all is indexed.
    return `Meanings searched in ${indexed.map((m) => m.shortName).join(", ")}.${rest.length ? " Other dictionaries are not indexed for meaning search yet." : ""}`;
  }
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length >= 2).slice(0, 4);
  if (!words.length) return "";
  const res = words.map((w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z])`));
  const skipped: string[] = [];
  for (const m of metas) {
    if (m.totalBytes > MEANING_MAX_BYTES) {
      skipped.push(m.shortName);
      continue;
    }
    const texts = await textsOf(m);
    let n = 0;
    for (const t of texts) {
      if (n >= limit) break;
      if (!words.every((w) => t.text.includes(w)) || !res.every((r) => r.test(t.text))) continue;
      add(t.label, m.slug, "meaning", RANK.meaning + Math.min(t.text.indexOf(words[0]), 5000) / 10000 + t.text.length / 1e7);
      n++;
    }
  }
  return `Meanings searched in ${metas.filter((m) => !skipped.includes(m.shortName)).map((m) => m.shortName).join(", ") || "—"}${
    skipped.length ? ` (too large for meaning search: ${skipped.join(", ")})` : ""
  }. Choose dictionaries above to search others.`;
}

// ------------------------------------------------------------- entries
export type EntryResult = {
  headword: string;
  deva: string;
  entries: { dict: string; dictName: string; category: string; section: string; sectionSort: number; source: string; headword: string; html: string }[];
};

export async function lookupHeadword(headword: string, opts: { dict?: string[]; metas?: DictMeta[] } = {}): Promise<EntryResult> {
  const label = headword.trim().toLowerCase().normalize("NFC");
  const k = fold(label) || label;
  const c = shardOf(k);
  const metas = (opts.metas ?? (await listDictionaries())).filter((m) => !opts.dict?.length || opts.dict.includes(m.slug));
  const out: EntryResult = { headword: headword.trim(), deva: iastToDeva(headword.trim()), entries: [] };
  const shards = await Promise.all(metas.map((m) => loadShard(m, c)));
  const jobs: Promise<EntryResult["entries"][number] | null>[] = [];
  metas.forEach((meta, di) => {
    const s = shards[di];
    let idxs = s.byLabel.get(label) ?? [];
    if (!idxs.length) {
      for (let i = lowerBound(s.rows, k); i < s.rows.length && s.rows[i][0] === k && idxs.length < 5; i++) idxs = [...idxs, i];
    }
    const seen = new Set<number>();
    for (const i of idxs.slice(0, 12)) {
      const r = s.rows[i];
      if (seen.has(r[2])) continue;
      seen.add(r[2]);
      jobs.push(
        readDefinition(meta.files.dict, r[2], r[3])
          .then((buf) => ({
            dict: meta.slug,
            dictName: meta.name,
            category: meta.category,
            section: meta.section.name,
            sectionSort: meta.section.sort,
            source: meta.source,
            headword: r[1],
            html: parseEntry(buf, meta.sts || undefined).map(fieldToHtml).join(""),
          }))
          .catch(() => null)
      );
    }
  });
  out.entries = (await Promise.all(jobs)).filter((e): e is EntryResult["entries"][number] => Boolean(e));
  return out;
}
