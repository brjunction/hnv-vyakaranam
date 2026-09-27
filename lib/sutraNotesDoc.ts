// Splits the sūtra-notes Google Doc into per-sūtra rich-HTML chunks, using
// marker paragraphs of the exact form:
//
//   <sutra 1.1.1 start>
//   ...anything: rich text, bold, colors, images, tables...
//   <sutra 1.1.1 end>
//
// Each marker must be its own paragraph/line (nothing else on that line).
// The "1.1.1" is matched against the "Sutra Number" column in the chapter
// .xlsx files.

import { SUTRA_NOTES_DOC_URL, REVALIDATE_SECONDS } from "@/lib/config";
import { getParsedGoogleDoc, elementText, elementsToHtml } from "@/lib/googleDocs";

const START_RE = /^<\s*sutra\s+(.+?)\s+start\s*>$/i;
const END_RE = /^<\s*sutra\s+(.+?)\s+end\s*>$/i;

export type SutraNotes = {
  /** sutra number -> rich HTML string */
  html: Map<string, string>;
  /** scoped CSS to render once per page (empty string if no doc configured) */
  styleCss: string;
  /** wrapper class each notes container must carry */
  scopeClass: string;
};

const EMPTY: SutraNotes = { html: new Map(), styleCss: "", scopeClass: "" };

export async function getSutraNotes(): Promise<SutraNotes> {
  if (!SUTRA_NOTES_DOC_URL.trim()) return EMPTY;

  const doc = await getParsedGoogleDoc(SUTRA_NOTES_DOC_URL, REVALIDATE_SECONDS);
  if (!doc) return EMPTY;

  const html = new Map<string, string>();
  let currentKey: string | null = null;
  let currentEls: (typeof doc.bodyElements)[number][] = [];

  for (const el of doc.bodyElements) {
    const text = elementText(el);

    const startMatch = text.match(START_RE);
    if (startMatch) {
      currentKey = startMatch[1].trim();
      currentEls = [];
      continue;
    }

    const endMatch = text.match(END_RE);
    if (endMatch) {
      if (currentKey !== null) {
        html.set(currentKey, elementsToHtml(currentEls));
      }
      currentKey = null;
      currentEls = [];
      continue;
    }

    if (currentKey !== null) currentEls.push(el);
  }

  return { html, styleCss: doc.styleCss, scopeClass: doc.scopeClass };
}

/** Looks up notes for a sūtra number, tolerant of surrounding whitespace. */
export function lookupNotes(notes: SutraNotes, sutraNumber: string): string | undefined {
  return notes.html.get(sutraNumber.trim());
}
