import { balaramaToUtf8 } from "@/lib/hnv/balarama";
import { convertScript, detectScript, type ScriptName } from "@/lib/scriptures/core";

// Tools › Script & font converter. Any of these to any other:
//   Balarama (the old font: ä = ā, ç = ś …), IAST, Devanagari, Bengali, Odia,
//   and the ASCII schemes Harvard-Kyoto, ITRANS, SLP1.
// Sanskrit is converted as Sanskrit (IAST words joined by sandhi in Indic
// scripts, final virāma kept); ordinary text (Bengali, Hindi, Odia as
// languages, or English) letter by letter, with the virāma a language does not
// write left out. `checkText` tells which of the two a text looks like.

export type Scheme = ScriptName | "balarama" | "hk" | "itrans" | "slp1";
export const SCHEMES: { value: Scheme; label: string; sub: string }[] = [
  { value: "iast", label: "IAST", sub: "kṛṣṇa" },
  { value: "balarama", label: "Balarama (font)", sub: "kåñëa — old Balarama-font text" },
  { value: "devanagari", label: "देवनागरी", sub: "Devanagari · कृष्ण" },
  { value: "bengali", label: "বাংলা", sub: "Bengali · কৃষ্ণ" },
  { value: "oriya", label: "ଓଡ଼ିଆ", sub: "Odia · କୃଷ୍ଣ" },
  { value: "hk", label: "Harvard-Kyoto", sub: "kRSNa" },
  { value: "itrans", label: "ITRANS", sub: "kRRiShNa" },
  { value: "slp1", label: "SLP1", sub: "kfzRa" },
];
const INDIC: Scheme[] = ["devanagari", "bengali", "oriya"];

// ------------------------------------------------------------ Balarama
const TO_BALARAMA: [RegExp, string][] = (
  [
    ["ā", "ä"], ["ī", "é"], ["ū", "ü"], ["ṛ", "å"], ["ṝ", "è"], ["ṅ", "ì"], ["ṣ", "ñ"], ["ñ", "ï"],
    ["ṭ", "ö"], ["ḍ", "ò"], ["ṇ", "ë"], ["ś", "ç"], ["ṁ", "à"], ["ṃ", "à"], ["ḥ", "ù"], ["ḷ", "ÿ"], ["ḹ", "û"],
    ["Ā", "Ä"], ["Ī", "É"], ["Ū", "Ü"], ["Ṛ", "Å"], ["Ṝ", "È"], ["Ṅ", "Ì"], ["Ṣ", "Ñ"], ["Ñ", "Ï"],
    ["Ṭ", "Ö"], ["Ḍ", "Ò"], ["Ṇ", "Ë"], ["Ś", "Ç"], ["Ṁ", "À"], ["Ṃ", "À"], ["Ḥ", "Ù"], ["Ḷ", "ß"],
  ] as [string, string][]
).map(([a, b]) => [new RegExp(a, "g"), b]);

export function iastToBalarama(s: string): string {
  // "ñ" must become "ï" before "ṣ" becomes "ñ"
  let t = s.normalize("NFC");
  const order = [...TO_BALARAMA.filter(([r]) => /ñ|Ñ/.test(r.source)), ...TO_BALARAMA.filter(([r]) => !/ñ|Ñ/.test(r.source))];
  for (const [r, b] of order) t = t.replace(r, b);
  return t;
}

// ------------------------------------------------------------ detection
const IAST_MARKS = /[āīūṛṝḷḹṅñṭḍṇśṣṁṃḥĀĪŪṚṜḶṄṆŚṢṬḌṀṂḤ]/;
const BALARAMA_MARKS = /[äéüåèìöòëçàùÿû]/;
/** IAST letters Balarama does not use (ñ is a letter of both) */
const IAST_ONLY = /[āīūṛṝḷḹṅṭḍṇśṣṁṃḥĀĪŪṚṜḶṄṆŚṢṬḌṀṂḤ]/;

/** The script a text is written in (a guess). */
export function detectScheme(text: string): Scheme {
  const s = text.normalize("NFC");
  const indic = detectScript(s);
  if (indic) return indic;
  if (BALARAMA_MARKS.test(s) && !IAST_ONLY.test(s)) return "balarama";
  if (IAST_MARKS.test(s)) return "iast";
  // ASCII: HK / ITRANS / SLP1 use capitals inside words
  if (/[a-z][RSNTDMH](?:[a-z]|\b)/.test(s) && /\b[a-z]+[A-Z][a-z]*\b/.test(s)) return /RRi|Sh|\.N|aa|ii|uu/.test(s) ? "itrans" : /[fzwqx]/.test(s) && /[A-Z]/.test(s) ? "slp1" : "hk";
  return "iast";
}

export type Check = { sanskrit: boolean; sure: boolean; reasons: string[] };

const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{M}'’]+/u).filter(Boolean);
const count = (ws: string[], set: Set<string>) => ws.filter((w) => set.has(w)).length;

const EN = new Set("the of and to in is was that it for as with his he on be by this are from at which not have had they or but you their were all one we an has her there been who when will would shall our them more these so said into my me what than its".split(" "));
const SA_ROMAN = new Set("ca tu hi eva iti na api vā yathā tathā tat sa saḥ te me mama aham tvam yaḥ yat ye tasya tasmāt iva atha kim ced yadi tadā punaḥ sarva sarvam".split(" "));
const HI = new Set("है हैं का की के में और से को नहीं भी यह वह था थे थी पर हो हुआ एक लिए कर करते गया ने".split(" "));
const SA_DEVA = new Set("च तु हि एव इति न अपि वा यथा तथा तत् सः ते मे मम अहम् त्वम् यः यत् तस्य तस्मात् इव अथ किम् यदि तदा पुनः".split(" "));
const BN = new Set("এবং আমি তুমি আমার তোমার করে হয় হইল হয়ে কি কী এই সেই আর ছিল থেকে জন্য না যে তার তাঁর সে করিয়া দিয়া হৈল".split(" "));
const SA_BENG = new Set("চ তু হি এব ইতি ন অপি বা যথা তথা তৎ তত্ সঃ তে মে মম অহম্ ত্বম্ যঃ যৎ তস্য তস্মাৎ ইব অথ কিম্ যদি".split(" "));
const OR = new Set("ଏବଂ ଓ ଅଛି ଅଟେ କରି ହୋଇ ପାଇଁ ଯେ ମୁଁ ତୁମେ ଏହି ସେହି ଥିଲା ନାହିଁ ଆଉ".split(" "));
const SA_ORYA = new Set("ଚ ତୁ ହି ଏବ ଇତି ନ ଅପି ବା ଯଥା ତଥା ସଃ ତେ ମେ ମମ ଅହମ୍ ତ୍ୱମ୍ ଯଃ ତସ୍ୟ ଇବ ଅଥ ଯଦି".split(" "));

/**
 * Does a text look like Sanskrit, or like ordinary text (English, or Bengali /
 * Hindi / Odia as languages)? Counts common words of each, and Sanskrit's
 * marks (visarga, a final virāma, case endings). A guess with its reasons.
 */
export function checkText(text: string, scheme: Scheme = detectScheme(text)): Check {
  let s = text.normalize("NFC");
  if (scheme === "balarama") s = balaramaToUtf8(s);
  const ws = words(s);
  if (!ws.length) return { sanskrit: true, sure: false, reasons: [] };
  const reasons: string[] = [];
  let sa = 0;
  let other = 0;
  const indic = scheme === "devanagari" || scheme === "bengali" || scheme === "oriya";
  if (indic) {
    const [lang, saw, name] =
      scheme === "devanagari" ? [HI, SA_DEVA, "Hindi"] : scheme === "bengali" ? [BN, SA_BENG, "Bengali"] : [OR, SA_ORYA, "Odia"];
    const l = count(ws, lang);
    const k = count(ws, saw);
    const visarga = (s.match(/[ःঃଃ]/g) ?? []).length;
    const finalVirama = ws.filter((w) => /[्্୍]$/.test(w)).length;
    if (l) reasons.push(`${l} common ${name} word${l > 1 ? "s" : ""}`);
    if (k) reasons.push(`${k} Sanskrit particle${k > 1 ? "s" : ""} (ca, tu, iti …)`);
    if (visarga) reasons.push(`${visarga} visarga${visarga > 1 ? "s" : ""}`);
    if (finalVirama) reasons.push(`${finalVirama} word${finalVirama > 1 ? "s" : ""} ending in a virāma`);
    sa = k * 2 + visarga * 1.5 + finalVirama * 1.5;
    other = l * 2.5;
  } else {
    const en = count(ws, EN);
    const k = count(ws, SA_ROMAN);
    const marked = ws.filter((w) => IAST_MARKS.test(w)).length;
    const endings = ws.filter((w) => /(?:ḥ|ṁ|ṃ|asya|ena|āya|ānām|ebhyaḥ|āni|ayā|ām)$/.test(w)).length;
    if (en) reasons.push(`${en} English word${en > 1 ? "s" : ""}`);
    if (k) reasons.push(`${k} Sanskrit particle${k > 1 ? "s" : ""}`);
    if (endings) reasons.push(`${endings} Sanskrit ending${endings > 1 ? "s" : ""} (-ḥ, -ṁ, -asya …)`);
    sa = k * 2 + endings * 1.5 + (marked / ws.length) * 4;
    other = en * 2.5;
  }
  const sanskrit = sa >= other;
  const sure = Math.abs(sa - other) >= 3 || (sa > 0 && other === 0) || (other > 0 && sa === 0);
  if (!reasons.length) reasons.push("no clear signs either way");
  return { sanskrit, sure, reasons };
}

// ------------------------------------------------------------ convert
async function sanscript() {
  return (await import("@indic-transliteration/sanscript")).default;
}

/** Text in any scheme → IAST. */
async function toIast(text: string, from: Scheme): Promise<string> {
  if (from === "iast") return text.normalize("NFC");
  if (from === "balarama") return balaramaToUtf8(text.normalize("NFC"));
  if (from === "hk" || from === "itrans" || from === "slp1") return (await sanscript()).t(text, from, "iast").replace(/ṃ/g, "ṁ");
  return convertScript(text, from, "iast");
}

export async function convertText(text: string, from: Scheme, to: Scheme, sanskrit: boolean): Promise<string> {
  if (!text.trim() || from === to) return text;
  // straight between two Indic scripts, or Indic → IAST
  if (INDIC.includes(from) && (INDIC.includes(to) || to === "iast")) {
    const r = await convertScript(text, from as ScriptName, to as ScriptName, { sanskrit });
    // Bengali as a language has no va: its ব is ba
    if (from === "bengali" && !sanskrit) return to === "iast" ? r.replace(/v/g, "b").replace(/V/g, "B") : to === "devanagari" ? r.replace(/व/g, "ब") : to === "oriya" ? r.replace(/ଵ/g, "ବ") : r;
    return r;
  }
  const iast = await toIast(text, from);
  if (to === "iast") return iast;
  if (to === "balarama") return iastToBalarama(iast);
  if (to === "hk" || to === "itrans" || to === "slp1") return (await sanscript()).t(iast.replace(/ṁ/g, "ṃ"), "iast", to);
  // Sanskrit: words joined by sandhi as printed in Indic scripts; ordinary text: kept apart
  return convertScript(iast, "iast", to as ScriptName, { sanskrit, join: sanskrit });
}
