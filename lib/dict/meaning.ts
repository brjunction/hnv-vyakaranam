import "server-only";
import zlib from "zlib";
import { parseEntry, readAllDefinitions } from "@/lib/dict/stardict";
import { fieldsToText } from "@/lib/dict/render";
import { loadShard, shardLetters, meaningTokens, type DictMeta } from "@/lib/dict/engine";
import { fromRef, putObject } from "@/lib/storage/neon";

// Builds the English "meaning index" of one dictionary: for every English
// word, the headwords whose definition uses it most (best 250 per word).
// Stored as gzipped JSON next to the headword shards:
//   <indexUrl>meaning/<first letter>.json.gz   { v:1, w:{ word:[[headword,score],…] } }

const PER_WORD = 250;
const MAX_DICT_BYTES = 400 * 1024 * 1024;

export async function buildMeaningIndex(meta: DictMeta): Promise<{ words: number; entries: number }> {
  const prefix = fromRef(meta.indexUrl);
  if (!prefix) throw new Error("This dictionary's index is not in storage.");
  if (meta.totalBytes > MAX_DICT_BYTES) throw new Error("This dictionary is too large to index in one step.");

  const [all, letters] = await Promise.all([readAllDefinitions(meta.files.dict), shardLetters(meta)]);
  const postings = new Map<string, [string, number][]>();
  const seen = new Set<number>();
  let entries = 0;

  for (const c of letters) {
    const shard = await loadShard(meta, c);
    for (const r of shard.rows) {
      if (seen.has(r[2])) continue;
      seen.add(r[2]);
      entries++;
      const text = fieldsToText(parseEntry(all.subarray(r[2], r[2] + r[3]), meta.sts || undefined));
      const tokens = meaningTokens(text);
      if (!tokens.length) continue;
      const counts = new Map<string, number>();
      tokens.forEach((t, i) => counts.set(t, (counts.get(t) ?? 0) + (i < 8 ? 3 : 1))); // words near the start matter most
      const norm = Math.sqrt(tokens.length);
      for (const [w, n] of counts) {
        const score = Math.round((n / norm) * 100) / 100;
        let list = postings.get(w);
        if (!list) postings.set(w, (list = []));
        list.push([r[1], score]);
        if (list.length > PER_WORD * 3) {
          list.sort((a, b) => b[1] - a[1]);
          list.length = PER_WORD;
        }
      }
    }
  }

  const byLetter = new Map<string, Record<string, [string, number][]>>();
  for (const [w, list] of postings) {
    list.sort((a, b) => b[1] - a[1]);
    const top = list.slice(0, PER_WORD);
    let bucket = byLetter.get(w[0]);
    if (!bucket) byLetter.set(w[0], (bucket = {}));
    bucket[w] = top;
  }
  const files = [...byLetter.entries()];
  for (let i = 0; i < files.length; i += 4) {
    await Promise.all(
      files.slice(i, i + 4).map(([c, w]) =>
        putObject(`${prefix}meaning/${c}.json.gz`, zlib.gzipSync(Buffer.from(JSON.stringify({ v: 1, w })), { level: 6 }), "application/gzip")
      )
    );
  }
  return { words: postings.size, entries };
}
