import "server-only";
import zlib from "zlib";
import { parseIdx, parseIfo, parseSyn, readWhole } from "@/lib/dict/stardict";
import { toIast, type HeadScheme } from "@/lib/dict/translit";
import type { DictFiles } from "@/lib/db/schema";

// Builds the prepared search index for one StarDict dictionary from its
// .ifo/.idx(/.syn): headwords, their IAST form, and offset/size into the
// definitions file. Stored as gzipped JSON next to the dictionary files.

export type PreparedIndex = {
  v: 1;
  scheme: HeadScheme;
  sts: string;
  words: string[];
  /** IAST form, "" when identical to the raw headword. */
  iast: string[];
  off: number[];
  size: number[];
  /** Synonyms: [word, iast or "", entry index] */
  syn: [string, string, number][];
};

export async function prepareIndex(files: DictFiles, scheme: HeadScheme) {
  const info = parseIfo((await readWhole(files.ifo)).toString("utf8"));
  const idx = parseIdx(await readWhole(files.idx), Number(info.idxoffsetbits) === 64 ? 64 : 32);
  if (!idx.length) throw new Error("The .idx file has no entries.");
  const syn = files.syn ? parseSyn(await readWhole(files.syn)) : [];

  const conv = (w: string) => {
    if (scheme === "iast" || scheme === "english") return "";
    try {
      const i = toIast(w, scheme);
      return i === w ? "" : i;
    } catch {
      return "";
    }
  };
  const index: PreparedIndex = {
    v: 1,
    scheme,
    sts: info.sametypesequence ?? "",
    words: idx.map((e) => e.word),
    iast: idx.map((e) => conv(e.word)),
    off: idx.map((e) => e.offset),
    size: idx.map((e) => e.size),
    syn: syn.filter((s) => s.index < idx.length).map((s) => [s.word, conv(s.word), s.index]),
  };
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(index)), { level: 9 });
  const preview = idx.slice(0, 400).filter((_, i) => i % 40 === 0).map((e, i) => ({ raw: e.word, iast: index.iast[i * 40] || e.word }));
  return { gz, info, wordCount: idx.length, synCount: index.syn.length, preview };
}
