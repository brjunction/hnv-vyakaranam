// Balarama → Unicode (IAST). A port of the LibreOffice macro published by
// Vedabase (https://vedabase.io/tools/BalaramaToUTF8.txt): the PDFs of the
// Madhyama edition were set in the Balarama font, whose accented Latin letters
// stand for the IAST diacritics. Order is irrelevant (every source letter is
// distinct), except that the ligatures are replaced first.
//
// The macro's quote/space/dash entries contain characters that do not survive
// copying; the PDF text already carries proper ’ “ ” —, so only the letters,
// the fi/fl ligatures and the no-break space are converted here.

const PAIRS: [string, string][] = [
  ["ﬁ", "fi"],
  ["ﬂ", "fl"],
  ["ä", "ā"], ["é", "ī"], ["ü", "ū"], ["å", "ṛ"], ["è", "ṝ"], ["ì", "ṅ"], ["ñ", "ṣ"], ["ï", "ñ"],
  ["ö", "ṭ"], ["ò", "ḍ"], ["ë", "ṇ"], ["ç", "ś"], ["à", "ṁ"], ["ù", "ḥ"], ["ÿ", "ḷ"], ["û", "ḹ"],
  ["Ä", "Ā"], ["É", "Ī"], ["Ü", "Ū"], ["Å", "Ṛ"], ["È", "Ṝ"], ["Ì", "Ṅ"], ["Ñ", "Ṣ"], ["Ï", "Ñ"],
  ["Ö", "Ṭ"], ["Ò", "Ḍ"], ["Ë", "Ṇ"], ["Ç", "Ś"], ["À", "Ṁ"], ["Ù", "Ḥ"], ["ß", "Ḷ"],
  [" ", " "],
];
const MAP = new Map(PAIRS);
const RE = new RegExp(`[${PAIRS.map(([a]) => a).join("")}]`, "g");

export function balaramaToUtf8(s: string): string {
  return s.replace(RE, (c) => MAP.get(c) ?? c).normalize("NFC");
}
