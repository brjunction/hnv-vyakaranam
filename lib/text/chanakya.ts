import { chanakya_to_unicode } from "@/lib/text/chanakya-map";

/**
 * Chanakya text → Unicode Devanagari, with the corrections the base table
 * misses: the "िं" glyph before a (conjunct) consonant ("ङ्क्षसह" → "सिंह"),
 * and reph + i ("निॢववाद" → "निर्विवाद").
 */
export function chanakyaToUnicode(s: string): string {
  const C = "[\\u0915-\\u0939\\u0958-\\u095F](?:\\u094D[\\u0915-\\u0939\\u0958-\\u095F])*";
  return (chanakya_to_unicode(s) as string)
    .replace(new RegExp(`ङ्क्ष(${C})`, "g"), "$1िं")
    .replace(new RegExp(`ॢ(${C})`, "g"), "र्$1ि")
    .replace(/ +ी/g, "ी")
    .replace(/²/g, "दृ")
    .replace(/_/g, "ट्ठ")
    // reph printed after its conjunct: "मूध्र्ना" → "मूर्ध्ना"
    .replace(new RegExp(`(${C.slice(0, C.indexOf("(?:"))})्र्(?=[\\u0915-\\u0939])`, "g"), "र्$1्")
    .normalize("NFC");
}
