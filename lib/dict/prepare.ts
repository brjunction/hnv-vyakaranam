import "server-only";
import zlib from "zlib";
import { parseIdx, parseIfo, parseSyn, readWhole } from "@/lib/dict/stardict";
import { fold, toIast, type HeadScheme } from "@/lib/dict/translit";
import type { DictFiles } from "@/lib/db/schema";

// Builds the search index for one StarDict dictionary from its .ifo/.idx
// (/.syn). The index is split into small "shards" by the first letter of the
// folded search key, so a search only loads the shard it needs from each
// dictionary — this keeps search fast with hundreds of dictionaries.
//
// Shard row: [key, label, offset, size]
//   key   = folded search key (lib/dict/translit fold)
//   label = headword in IAST (or as written for non-Sanskrit dictionaries)
//   offset/size = position of the article in the .dict file

export type ShardRow = [string, string, number, number];
export type Shard = { v: 2; rows: ShardRow[] };

export const shardOf = (key: string) => (key && /[a-z]/.test(key[0]) ? key[0] : "_");

export async function prepareIndex(files: DictFiles, scheme: HeadScheme) {
  const info = parseIfo((await readWhole(files.ifo)).toString("utf8"));
  const idx = parseIdx(await readWhole(files.idx), Number(info.idxoffsetbits) === 64 ? 64 : 32);
  if (!idx.length) throw new Error("The .idx file has no entries.");
  const syn = files.syn ? parseSyn(await readWhole(files.syn)) : [];

  const label = (w: string) => {
    if (scheme === "iast" || scheme === "english") return w.normalize("NFC");
    try {
      return toIast(w, scheme);
    } catch {
      return w;
    }
  };

  const shards = new Map<string, ShardRow[]>();
  const add = (row: ShardRow) => {
    const c = shardOf(row[0]);
    const list = shards.get(c);
    if (list) list.push(row);
    else shards.set(c, [row]);
  };
  const preview: { raw: string; iast: string }[] = [];
  idx.forEach((e, i) => {
    const l = label(e.word);
    if (i % Math.max(1, Math.floor(idx.length / 12)) === 0 && preview.length < 12) preview.push({ raw: e.word, iast: l });
    add([fold(l) || e.word.toLowerCase(), l, e.offset, e.size]);
  });
  for (const s of syn) {
    const target = idx[s.index];
    if (!target) continue;
    const l = label(s.word);
    add([fold(l) || s.word.toLowerCase(), l, target.offset, target.size]);
  }
  const out: Record<string, Buffer> = {};
  for (const [c, rows] of shards) {
    rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1].length - b[1].length));
    out[c] = zlib.gzipSync(Buffer.from(JSON.stringify({ v: 2, rows } satisfies Shard)), { level: 6 });
  }
  return { shards: out, info, wordCount: idx.length, synCount: syn.length, preview };
}
