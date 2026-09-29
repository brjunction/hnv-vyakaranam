// Shared text helpers (safe to import from both server and client code).

/**
 * Splits verse text into display lines. In the spreadsheets a "/" marks a
 * line break inside a verse/sūtra, e.g.
 *
 *   "uddhava uvāca / tataḥ sa āgatya puraṁ sva-pitroś / cikīrṣayā ..."
 *
 * becomes one line per part, with the "/" itself removed. Real line breaks
 * typed inside an Excel cell (Alt+Enter) are honoured too. Works the same
 * for IAST, Devanagari, and vṛtti text.
 */
export function splitLines(text: string | undefined | null): string[] {
  if (!text) return [];
  return text
    .split(/\s*(?:\/|\r?\n)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}
