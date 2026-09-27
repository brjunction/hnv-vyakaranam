// Fetches a Google Doc as HTML and prepares it for embedding on the site
// with its original formatting (colors, alignment, bold/italic, tables,
// images, etc.) intact.
//
// How it works:
// 1. Google Docs can export any doc as HTML at a stable URL:
//      https://docs.google.com/document/d/<ID>/export?format=html
//    This only works if the doc is shared "Anyone with the link" (Viewer).
// 2. That HTML has a <style> block full of rules like ".c3{color:#ff0000}"
//    plus a <body> full of <p class="c3">...</p> etc. We keep the <style>
//    block (so real colors/alignment survive) but rewrite every selector to
//    be scoped under a wrapper class unique to this doc, so it can never
//    leak out and restyle the rest of the site.
// 3. We hand back the scoped CSS (render it once per page inside a <style>
//    tag) plus the list of top-level body elements, so callers can split
//    them up by whatever marker convention they use (see sutraNotesDoc.ts
//    and miscDoc.ts) and re-serialize the relevant slices back to HTML with
//    node.toString().

import { parse, HTMLElement } from "node-html-parser";

export type ParsedGoogleDoc = {
  /** Scoped CSS — render this once per page in a <style> tag. */
  styleCss: string;
  /** Wrapper class to put on every container that should receive the doc's formatting. */
  scopeClass: string;
  /** Top-level element nodes from the doc's <body>, in document order. */
  bodyElements: HTMLElement[];
};

/** Accepts a full Google Docs URL or a bare document ID and returns the ID. */
export function extractDocId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // Looks like a bare ID (Google Doc IDs are long alphanumeric/-/_ strings)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

/** Deterministic short scope class from a doc ID, e.g. "gdoc-a1b2c3d4". */
function scopeClassFor(docId: string): string {
  let hash = 0;
  for (let i = 0; i < docId.length; i++) {
    hash = (hash * 31 + docId.charCodeAt(i)) >>> 0;
  }
  return `gdoc-${hash.toString(36)}`;
}

async function fetchDocHtml(docId: string, revalidateSeconds: number): Promise<string | null> {
  const url = `https://docs.google.com/document/d/${docId}/export?format=html`;
  try {
    const res = await fetch(url, { next: { revalidate: revalidateSeconds } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Rewrites a Google Docs stylesheet so every rule only applies inside
 * elements carrying `scopeClass`. Drops @page/@font-face/etc. at-rules,
 * which either don't matter in-browser or could affect the whole page.
 */
function scopeStylesheet(css: string, scopeClass: string): string {
  const chunks = css.split("}");
  const out: string[] = [];
  for (const chunk of chunks) {
    const braceIdx = chunk.indexOf("{");
    if (braceIdx === -1) continue;
    const selector = chunk.slice(0, braceIdx).trim();
    const decls = chunk.slice(braceIdx + 1).trim();
    if (!selector || !decls) continue;
    if (selector.startsWith("@")) continue; // skip @page, @font-face, @media, ...
    const scoped = selector
      .split(",")
      .map((s) => `.${scopeClass} ${s.trim()}`)
      .join(", ");
    out.push(`${scoped}{${decls}}`);
  }
  return out.join("\n");
}

const docCache = new Map<string, Promise<ParsedGoogleDoc | null>>();

/**
 * Fetches and parses a Google Doc. Results are cached per-process per
 * revalidate window (Next.js's fetch cache handles the actual HTTP caching;
 * this just avoids re-parsing the same HTML multiple times within one
 * request/render pass).
 */
export function getParsedGoogleDoc(
  urlOrId: string,
  revalidateSeconds: number
): Promise<ParsedGoogleDoc | null> {
  const docId = extractDocId(urlOrId);
  if (!docId) return Promise.resolve(null);

  const cacheKey = `${docId}:${revalidateSeconds}`;
  if (docCache.has(cacheKey)) return docCache.get(cacheKey)!;

  const promise = (async (): Promise<ParsedGoogleDoc | null> => {
    const html = await fetchDocHtml(docId, revalidateSeconds);
    if (!html) return null;

    const root = parse(html, { comment: false });
    const styleEl = root.querySelector("style");
    const rawCss = styleEl ? styleEl.rawText || styleEl.textContent || "" : "";
    const scopeClass = scopeClassFor(docId);
    const styleCss = scopeStylesheet(rawCss, scopeClass);

    const body = root.querySelector("body");
    const bodyElements = body
      ? (body.childNodes.filter((n) => n instanceof HTMLElement) as HTMLElement[])
      : [];

    return { styleCss, scopeClass, bodyElements };
  })();

  docCache.set(cacheKey, promise);
  return promise;
}

/** Normalized plain text of an element, for matching marker lines against. */
export function elementText(el: HTMLElement): string {
  return el.text.replace(/\u00a0/g, " ").trim().replace(/\s+/g, " ");
}

/** Serializes a run of elements back into one HTML string. */
export function elementsToHtml(els: HTMLElement[]): string {
  return els.map((e) => e.toString()).join("\n");
}
