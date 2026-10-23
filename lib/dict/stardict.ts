import "server-only";
import fs from "fs";
import zlib from "zlib";
import { fromRef, getObject } from "@/lib/storage/neon";

// StarDict reader (the format GoldenDict uses): .ifo (info), .idx (sorted
// headwords → offset/size), .dict or .dict.dz (definitions), .syn (synonyms).
// Files are read straight from storage ("s3:<key>" refs to Neon Object
// Storage, https URLs, or file: paths in tests). A .dict.dz is "dictzip": gzip with a chunk table, so any entry can
// be read by fetching and inflating only the chunk(s) that contain it.

// ------------------------------------------------------------ byte access
export async function readBytes(url: string, start?: number, end?: number): Promise<Buffer> {
  const key = fromRef(url);
  if (key) {
    const { buf, partial } = await getObject(key, start, end);
    if (start !== undefined && !partial) return buf.subarray(start, end === undefined ? undefined : end + 1);
    return buf;
  }
  if (url.startsWith("file:")) {
    const buf = fs.readFileSync(new URL(url));
    return start === undefined ? buf : buf.subarray(start, end === undefined ? undefined : end + 1);
  }
  const headers: Record<string, string> = {};
  if (start !== undefined) headers.Range = `bytes=${start}-${end ?? ""}`;
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok && res.status !== 206) throw new Error(`Could not read ${url} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Server ignored the Range header → slice locally.
  if (start !== undefined && res.status === 200) return buf.subarray(start, end === undefined ? undefined : end + 1);
  return buf;
}

export async function readWhole(url: string): Promise<Buffer> {
  const buf = await readBytes(url);
  return isGzip(buf) ? zlib.gunzipSync(buf) : buf;
}

const isGzip = (b: Buffer) => b.length > 2 && b[0] === 0x1f && b[1] === 0x8b;

// -------------------------------------------------------------------- ifo
export function parseIfo(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

// ---------------------------------------------------------------- idx/syn
export type IdxEntry = { word: string; offset: number; size: number };

export function parseIdx(buf: Buffer, offsetBits = 32): IdxEntry[] {
  const out: IdxEntry[] = [];
  const wide = offsetBits === 64;
  let p = 0;
  while (p < buf.length) {
    const z = buf.indexOf(0, p);
    if (z < 0) break;
    const word = buf.toString("utf8", p, z);
    p = z + 1;
    const offset = wide ? Number(buf.readBigUInt64BE(p)) : buf.readUInt32BE(p);
    p += wide ? 8 : 4;
    const size = buf.readUInt32BE(p);
    p += 4;
    out.push({ word, offset, size });
  }
  return out;
}

export function parseSyn(buf: Buffer): { word: string; index: number }[] {
  const out: { word: string; index: number }[] = [];
  let p = 0;
  while (p < buf.length) {
    const z = buf.indexOf(0, p);
    if (z < 0) break;
    out.push({ word: buf.toString("utf8", p, z), index: buf.readUInt32BE(z + 1) });
    p = z + 5;
  }
  return out;
}

// ------------------------------------------------------------ dictzip
type DzHeader = { chunkLen: number; offsets: number[]; sizes: number[] } | null;
const dzHeaders = new Map<string, Promise<DzHeader>>();
const wholeDicts = new Map<string, Promise<Buffer>>();
const chunkCache = new Map<string, Buffer>();
let chunkBytes = 0;
const CHUNK_CACHE_MAX = 48 * 1024 * 1024;

async function dzHeader(url: string): Promise<DzHeader> {
  let head = await readBytes(url, 0, 65535);
  if (!isGzip(head)) return null;
  const flg = head[3];
  if (!(flg & 4)) return null; // no FEXTRA → plain gzip
  const xlen = head.readUInt16LE(10);
  if (12 + xlen > head.length) head = await readBytes(url, 0, 12 + xlen + 4096);
  let p = 12;
  const end = 12 + xlen;
  let chunkLen = 0;
  let sizes: number[] = [];
  while (p + 4 <= end) {
    const si1 = head[p];
    const si2 = head[p + 1];
    const len = head.readUInt16LE(p + 2);
    if (si1 === 0x52 && si2 === 0x41) {
      chunkLen = head.readUInt16LE(p + 6);
      const count = head.readUInt16LE(p + 8);
      sizes = Array.from({ length: count }, (_, i) => head.readUInt16LE(p + 10 + i * 2));
    }
    p += 4 + len;
  }
  if (!chunkLen) return null;
  p = end;
  if (flg & 8) p = head.indexOf(0, p) + 1; // FNAME
  if (flg & 16) p = head.indexOf(0, p) + 1; // FCOMMENT
  if (flg & 2) p += 2; // FHCRC
  const offsets: number[] = [];
  let o = p;
  for (const s of sizes) {
    offsets.push(o);
    o += s;
  }
  return { chunkLen, offsets, sizes };
}

function remember(key: string, buf: Buffer) {
  chunkCache.set(key, buf);
  chunkBytes += buf.length;
  while (chunkBytes > CHUNK_CACHE_MAX) {
    const first = chunkCache.keys().next().value as string;
    chunkBytes -= chunkCache.get(first)!.length;
    chunkCache.delete(first);
  }
}

/** Bytes [offset, offset+size) of the uncompressed definitions file. */
export async function readDefinition(dictUrl: string, offset: number, size: number): Promise<Buffer> {
  const compressed = /\.dz($|\?)/.test(dictUrl);
  if (!compressed) return readBytes(dictUrl, offset, offset + size - 1);

  if (!dzHeaders.has(dictUrl)) dzHeaders.set(dictUrl, dzHeader(dictUrl).catch(() => null));
  const h = await dzHeaders.get(dictUrl)!;
  if (!h) {
    if (!wholeDicts.has(dictUrl)) wholeDicts.set(dictUrl, readWhole(dictUrl));
    const all = await wholeDicts.get(dictUrl)!;
    return all.subarray(offset, offset + size);
  }

  const first = Math.floor(offset / h.chunkLen);
  const last = Math.floor((offset + size - 1) / h.chunkLen);
  const parts: Buffer[] = [];
  const missing: number[] = [];
  for (let c = first; c <= last; c++) if (!chunkCache.has(`${dictUrl}#${c}`)) missing.push(c);
  if (missing.length) {
    const lo = missing[0];
    const hi = missing[missing.length - 1];
    const raw = await readBytes(dictUrl, h.offsets[lo], h.offsets[hi] + h.sizes[hi] - 1);
    for (let c = lo; c <= hi; c++) {
      const s = h.offsets[c] - h.offsets[lo];
      const piece = raw.subarray(s, s + h.sizes[c]);
      remember(`${dictUrl}#${c}`, zlib.inflateRawSync(piece, { finishFlush: zlib.constants.Z_SYNC_FLUSH }));
    }
  }
  for (let c = first; c <= last; c++) parts.push(chunkCache.get(`${dictUrl}#${c}`)!);
  const joined = Buffer.concat(parts);
  const start = offset - first * h.chunkLen;
  return joined.subarray(start, start + size);
}

/** Entire uncompressed definitions file (used for meaning search). */
export async function readAllDefinitions(dictUrl: string): Promise<Buffer> {
  if (!wholeDicts.has(dictUrl)) wholeDicts.set(dictUrl, readWhole(dictUrl));
  return wholeDicts.get(dictUrl)!;
}

// ------------------------------------------------------- entry contents
export type Field = { type: string; data: string };

/** Split one entry into its typed fields (sametypesequence or per-field types). */
export function parseEntry(buf: Buffer, sameTypeSequence?: string): Field[] {
  const fields: Field[] = [];
  let p = 0;
  const take = (type: string, isLast: boolean) => {
    if (type === type.toUpperCase() && /[A-Z]/.test(type)) {
      // binary: 4-byte size prefix (no prefix when it's the last field of a sametypesequence)
      if (isLast && sameTypeSequence) {
        p = buf.length;
        return;
      }
      const size = buf.readUInt32BE(p);
      p += 4 + size;
      return;
    }
    if (isLast && sameTypeSequence) {
      fields.push({ type, data: buf.toString("utf8", p) });
      p = buf.length;
      return;
    }
    const z = buf.indexOf(0, p);
    const e = z < 0 ? buf.length : z;
    fields.push({ type, data: buf.toString("utf8", p, e) });
    p = e + 1;
  };
  if (sameTypeSequence) {
    const types = sameTypeSequence.split("");
    types.forEach((t, i) => take(t, i === types.length - 1));
  } else {
    while (p < buf.length) {
      const type = String.fromCharCode(buf[p]);
      p++;
      take(type, false);
    }
  }
  return fields;
}
