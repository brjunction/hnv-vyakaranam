import Sanscript from "@indic-transliteration/sanscript";

// Transliteration helpers for the dictionaries (client- and server-safe).
// Headwords are converted to IAST once (when a dictionary is prepared);
// search compares "folded" keys so any input script finds them.

export type HeadScheme = "iast" | "itrans" | "hk" | "slp1" | "velthuis" | "devanagari" | "english";

/** Common ITRANS spellings Sanscript doesn't read as Sanskrit ṛ/ḷ (it maps a lone R to Tamil ṟ). */
function fixItrans(s: string): string {
  return s
    .replace(/R\^([iI])/g, "RR$1")
    .replace(/L\^([iI])/g, "LL$1")
    .replace(/(?<!R)R(?!R)/g, "RRi")
    .replace(/\.N/g, "M");
}

export function toIast(text: string, scheme: HeadScheme): string {
  if (!text) return "";
  switch (scheme) {
    case "iast":
    case "english":
      return text.normalize("NFC");
    case "itrans":
      return Sanscript.t(fixItrans(text), "itrans", "iast");
    case "devanagari":
      return Sanscript.t(text, "devanagari", "iast");
    default:
      return Sanscript.t(text, scheme, "iast");
  }
}

const DEVA = /[ऀ-ॿ]/;
const IAST_MARKS = /[āīūṛṝḷḹṅñṭḍṇśṣṃṁḥĀĪŪṚṜḶḸṄÑṬḌṆŚṢṂḤ]/;

/** Devanagari for an IAST headword (only when it looks like Sanskrit). */
export function iastToDeva(iast: string): string {
  if (!iast || !/^[a-zāīūṛṝḷḹṅñṭḍṇśṣṃṁḥ\s'’-]+$/i.test(iast)) return "";
  return Sanscript.t(iast.toLowerCase().replace(/ṁ/g, "ṃ"), "iast", "devanagari");
}

/**
 * Search key: diacritics removed, lower case, common spelling variants
 * merged (aa→a, sh→s, ch→c, w→v …). Applied to headwords AND queries.
 */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/aa/g, "a")
    .replace(/ii|ee/g, "i")
    .replace(/uu|oo/g, "u")
    .replace(/sh/g, "s")
    .replace(/chh|ch/g, "c")
    .replace(/w/g, "v");
}

/** All IAST readings of what someone typed (Devanagari, IAST, ITRANS, HK, plain). */
export function queryReadings(q: string): string[] {
  const t = q.trim().normalize("NFC");
  if (!t) return [];
  if (DEVA.test(t)) return [Sanscript.t(t, "devanagari", "iast")];
  if (IAST_MARKS.test(t)) return [t];
  const out = new Set<string>([t.toLowerCase()]);
  if (/[A-Z~^.]/.test(t)) {
    out.add(toIast(t, "itrans"));
    out.add(toIast(t, "hk"));
  }
  return [...out];
}

export function queryKeys(q: string): string[] {
  return [...new Set(queryReadings(q).map(fold).filter(Boolean))];
}

export function isDevanagari(s: string) {
  return DEVA.test(s);
}
