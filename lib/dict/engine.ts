import "server-only";
import zlib from "zlib";
import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dictionaries } from "@/lib/db/schema";
import { isDbConfigured } from "@/lib/env";
import { parseEntry, readAllDefinitions, readDefinition } from "@/lib/dict/stardict";
import { fieldToHtml, fieldsToText } from "@/lib/dict/render";
import { fold, iastToDeva, queryKeys } from "@/lib/dict/translit";
import type { PreparedIndex } from "@/lib/dict/prepare";

// Dictionary search over the prepared indexes, reading definitions straight
// from the StarDict files. Everything heavy is cached per server instance.

export type DictMeta = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  source: string;
  files: { ifo: string; idx: string; dict: string; syn?: string };
  indexUrl: string;
  sts: string;
  updatedAt: string;
};

export const DICT_TAG = "dictionaries";

export const listDictionaries = unstable_cache(
  async (): Promise<DictMeta[]> => {
    if (!isDbConfigured) return [];
    const rows = await getDb()
      .select()
      .from(dictionaries)
      .where(eq(dictionaries.isEnabled, true))
      .orderBy(asc(dictionaries.sort), asc(dictionaries.id));
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
        updatedAt: r.updatedAt.toISOString(),
      }));
  },
  ["dict:list:v1"],
  { tags: [DICT_TAG], revalidate: 3600 }
);

// ------------------------------------------------------------- loading
type Loaded = {
  meta: DictMeta;
  ix: PreparedIndex;
  /** Searchable terms (headwords + synonyms). */
  termKey: string[];
  termLabel: string[];
  termEntry: Int32Array;
  /** Term indices sorted by key (for exact/prefix search). */
  sorted: Int32Array;
  /** lower-case IAST label → entry indices */
  byLabel: Map<string, number[]>;
};

const loaded = new Map<string, Promise<Loaded>>();

async function fetchIndex(url: string): Promise<PreparedIndex> {
  if (url.startsWith("file:")) {
    const fs = await import("fs");
    return JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(url))).toString("utf8"));
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Index ${url}: ${res.status}`);
  return JSON.parse(zlib.gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8"));
}

function build(meta: DictMeta, ix: PreparedIndex): Loaded {
  const n = ix.words.length + ix.syn.length;
  const termKey: string[] = new Array(n);
  const termLabel: string[] = new Array(n);
  const termEntry = new Int32Array(n);
  for (let i = 0; i < ix.words.length; i++) {
    const label = ix.iast[i] || ix.words[i];
    termLabel[i] = label;
    termKey[i] = fold(label);
    termEntry[i] = i;
  }
  for (let j = 0; j < ix.syn.length; j++) {
    const [w, iast, e] = ix.syn[j];
    const label = iast || w;
    termLabel[ix.words.length + j] = label;
    termKey[ix.words.length + j] = fold(label);
    termEntry[ix.words.length + j] = e;
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) =>
    termKey[a] < termKey[b] ? -1 : termKey[a] > termKey[b] ? 1 : termLabel[a].length - termLabel[b].length
  );
  const byLabel = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const k = termLabel[i].toLowerCase().normalize("NFC");
    const list = byLabel.get(k);
    if (list) {
      if (!list.includes(termEntry[i])) list.push(termEntry[i]);
    } else byLabel.set(k, [termEntry[i]]);
  }
  return { meta, ix, termKey, termLabel, termEntry, sorted: Int32Array.from(order), byLabel };
}

function load(meta: DictMeta): Promise<Loaded> {
  const key = `${meta.id}:${meta.indexUrl}`;
  let p = loaded.get(key);
  if (!p) {
    p = fetchIndex(meta.indexUrl).then((ix) => build(meta, ix));
    p.catch(() => loaded.delete(key));
    loaded.set(key, p);
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

function lowerBound(d: Loaded, k: string) {
  let lo = 0;
  let hi = d.sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (d.termKey[d.sorted[mid]] < k) lo = mid + 1;
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
  const metas = (opts.metas ?? (await listDictionaries())).filter((m) => !opts.dict?.length || opts.dict.includes(m.slug));
  const dicts = await Promise.all(metas.map(load));
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

  if (opts.mode === "meaning") {
    await meaningSearch(q, dicts, limit, add);
  } else {
    const keys = queryKeys(q);
    for (const d of dicts) {
      const slug = d.meta.slug;
      for (const k of keys) {
        // exact + prefix (sorted order = shortest first within a prefix)
        let i = lowerBound(d, k);
        let taken = 0;
        while (i < d.sorted.length && taken < limit * 2) {
          const t = d.sorted[i];
          const key = d.termKey[t];
          if (!key.startsWith(k)) break;
          const exact = key === k;
          add(d.termLabel[t], slug, exact ? "exact" : "prefix", (exact ? RANK.exact : RANK.prefix) + (key.length - k.length) / 1000);
          taken++;
          i++;
        }
      }
      // similar spellings (typos, missing diacritics): only when few results
      if (hits.size < 12) {
        for (const k of keys) {
          if (k.length < 3) continue;
          const max = k.length <= 5 ? 1 : 2;
          const found: { t: number; dist: number }[] = [];
          for (let t = 0; t < d.termKey.length; t++) {
            const key = d.termKey[t];
            if (key[0] !== k[0] || Math.abs(key.length - k.length) > max) continue;
            const dist = distance(k, key, max);
            if (dist <= max && dist > 0) found.push({ t, dist });
          }
          found.sort((a, b) => a.dist - b.dist).slice(0, 25).forEach(({ t, dist }) => add(d.termLabel[t], slug, "similar", RANK.similar + dist / 10));
        }
      }
      // inside a word (compounds): last resort
      if (hits.size < 6) {
        for (const k of keys) {
          if (k.length < 4) continue;
          let n = 0;
          for (let t = 0; t < d.termKey.length && n < 30; t++) {
            if (d.termKey[t].includes(k) && !d.termKey[t].startsWith(k)) {
              add(d.termLabel[t], slug, "contains", RANK.contains + d.termKey[t].length / 1000);
              n++;
            }
          }
        }
      }
    }
  }

  const out = [...hits.values()]
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ h }) => ({ ...h, deva: iastToDeva(h.headword) }));
  return { results: out, dictionaries: metas.map((m) => ({ slug: m.slug, name: m.name, shortName: m.shortName })) };
}

// Meaning (reverse) search: English words inside definitions.
const plainTexts = new Map<string, Promise<string[]>>();

async function textsOf(d: Loaded): Promise<string[]> {
  const key = `${d.meta.id}:${d.meta.indexUrl}`;
  let p = plainTexts.get(key);
  if (!p) {
    p = readAllDefinitions(d.meta.files.dict).then((all) =>
      d.ix.off.map((o, i) => fieldsToText(parseEntry(all.subarray(o, o + d.ix.size[i]), d.ix.sts || undefined)).toLowerCase())
    );
    p.catch(() => plainTexts.delete(key));
    plainTexts.set(key, p);
  }
  return p;
}

async function meaningSearch(
  q: string,
  dicts: Loaded[],
  limit: number,
  add: (label: string, dict: string, match: SearchHit["match"], score: number) => void
) {
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length >= 2).slice(0, 4);
  if (!words.length) return;
  const res = words.map((w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z])`));
  for (const d of dicts) {
    const texts = await textsOf(d);
    let n = 0;
    for (let i = 0; i < texts.length && n < limit; i++) {
      const t = texts[i];
      if (!words.every((w) => t.includes(w))) continue;
      if (!res.every((r) => r.test(t))) continue;
      // earlier mention = more central to the entry
      const pos = t.indexOf(words[0]);
      add(d.ix.iast[i] || d.ix.words[i], d.meta.slug, "meaning", RANK.meaning + Math.min(pos, 5000) / 10000 + t.length / 1e7);
      n++;
    }
  }
}

// ------------------------------------------------------------- entries
export type EntryResult = {
  headword: string;
  deva: string;
  entries: { dict: string; dictName: string; source: string; headword: string; html: string }[];
};

export async function lookupHeadword(headword: string, opts: { dict?: string[]; metas?: DictMeta[] } = {}): Promise<EntryResult> {
  const label = headword.trim().toLowerCase().normalize("NFC");
  const metas = (opts.metas ?? (await listDictionaries())).filter((m) => !opts.dict?.length || opts.dict.includes(m.slug));
  const out: EntryResult = { headword: headword.trim(), deva: iastToDeva(headword.trim()), entries: [] };
  for (const meta of metas) {
    const d = await load(meta);
    let list = d.byLabel.get(label);
    if (!list) {
      // same folded key (e.g. typed without diacritics)
      const k = fold(label);
      const i = lowerBound(d, k);
      const found: number[] = [];
      for (let j = i; j < d.sorted.length && d.termKey[d.sorted[j]] === k && found.length < 5; j++) {
        const e = d.termEntry[d.sorted[j]];
        if (!found.includes(e)) found.push(e);
      }
      list = found;
    }
    for (const e of list.slice(0, 12)) {
      const buf = await readDefinition(meta.files.dict, d.ix.off[e], d.ix.size[e]);
      const html = parseEntry(buf, d.ix.sts || undefined).map(fieldToHtml).join("");
      out.entries.push({ dict: meta.slug, dictName: meta.name, source: meta.source, headword: d.ix.iast[e] || d.ix.words[e], html });
    }
  }
  return out;
}

/** For admin "test" panel: load one dictionary and report timings. */
export async function warmDictionary(meta: DictMeta) {
  const t0 = Date.now();
  const d = await load(meta);
  return { terms: d.termKey.length, ms: Date.now() - t0 };
}
