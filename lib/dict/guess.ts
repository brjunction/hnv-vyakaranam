// Shared (client + server): guess how a dictionary's headwords are written,
// from its names and a sample of headwords; and which paths are junk.

export type GuessScheme = "iast" | "itrans" | "hk" | "slp1" | "velthuis" | "devanagari" | "english";

export function guessScheme(name: string, sample: string[]): GuessScheme {
  const s = sample.join(" ");
  if (/[ऀ-ॿ]/.test(s)) return "devanagari";
  if (/[āīūṛṝṅñṭḍṇśṣṃṁḥ]/.test(s)) return "iast";
  if (/itrans/i.test(name) || /(Sh|~N|~n|RRi|[a-z]A|A[a-z])/.test(s)) return "itrans";
  if (/slp/i.test(name)) return "slp1";
  if (/\bhk\b|-hk\b|harvard/i.test(name)) return "hk";
  if (/[a-z][A-Z]/.test(s)) return "hk";
  if (/sanskrit|sa-|-sa\b|monier|apte|vacaspat|vAcaspat|amara|shabda|kosha|kosa|kalpadruma|dhatu|dhAtu/i.test(name)) return "itrans";
  return "english";
}

/** First headwords of an .idx file (skips leading symbols). */
export function sampleIdxBytes(buf: Uint8Array): string[] {
  if (buf[0] === 0x1f && buf[1] === 0x8b) return [];
  const out: string[] = [];
  const dec = new TextDecoder();
  let p = 0;
  while (p < buf.length && out.length < 40) {
    const z = buf.indexOf(0, p);
    if (z < 0 || z + 9 > buf.length) break;
    out.push(dec.decode(buf.subarray(p, z)));
    p = z + 9;
  }
  return out.filter((w) => /^\p{L}/u.test(w)).slice(5, 25);
}

/** macOS metadata and other files that are never dictionaries. */
export const isJunkPath = (path: string) => /(^|\/)__MACOSX(\/|$)/.test(path) || /(^|\/)\._/.test(path) || /(^|\/)\.DS_Store$/.test(path);

/** How an uploaded file's relative path is stored (same on client and server). */
export function cleanStoragePath(path: string): string {
  return path
    .split("/")
    .map((seg) => seg.normalize("NFC").replace(/[^\p{L}\p{N}._ -]+/gu, "_").slice(0, 120))
    .filter(Boolean)
    .join("/");
}
