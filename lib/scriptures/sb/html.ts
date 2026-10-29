// A small, dependency-free reader for the flat XHTML of e-books (works in the
// browser and in Node). It walks the top-level block elements of <body> —
// <div>, <p>, <h1>…<h6>, <blockquote> — and returns each with its class and
// inner HTML. Nested blocks stay inside their parent's inner HTML.

export type Block = { tag: string; cls: string; id: string; html: string; text: string };

const BLOCK = /^(div|p|h[1-6]|blockquote|section|table|ul|ol)$/i;

export function blocks(xhtml: string): Block[] {
  const start = xhtml.search(/<body[\s>]/i);
  const s = start >= 0 ? xhtml.slice(start) : xhtml;
  const out: Block[] = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:\s[^>]*?)?)(\/?)>/g;
  let depth = 0;
  let open: { tag: string; attrs: string; at: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const [all, close, tagRaw, attrs, self] = m;
    const tag = tagRaw.toLowerCase();
    if (!BLOCK.test(tag)) continue;
    if (self) continue;
    if (!close) {
      if (depth === 0) open = { tag, attrs, at: m.index + all.length };
      depth++;
    } else {
      depth = Math.max(0, depth - 1);
      if (depth === 0 && open) {
        const inner = s.slice(open.at, m.index);
        const cls = /\bclass="([^"]*)"/.exec(open.attrs)?.[1] ?? "";
        const id = /\bid="([^"]*)"/.exec(open.attrs)?.[1] ?? "";
        // a wrapper (a div holding other blocks) is opened up; its children are the blocks
        if (/^(div|section|blockquote)$/.test(open.tag) && /<(div|p|h[1-6]|blockquote|table|ul|ol)\b/i.test(inner)) out.push(...blocks(inner));
        else out.push({ tag: open.tag, cls, id, html: inner, text: toText(inner) });
        open = null;
      }
    }
  }
  return out;
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…" };
export const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m0, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e.toLowerCase()] ?? m0
  );

/** Plain text of an HTML fragment (line breaks kept as \n). */
export function toText(html: string): string {
  return decode(html.replace(/<br\b[^>]*>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim()
    .normalize("NFC");
}

/**
 * Inner HTML reduced to what the site keeps: italics, bold, line breaks,
 * superscripts. Classes, ids, anchors and spans are removed (their text stays).
 * Italic spans (class "italic" or <i>) become <i>; bold spans become <b>.
 */
export function cleanInline(html: string): string {
  let h = html
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<a\b[^>]*\/>/gi, "")
    .replace(/<br\b[^>]*>/gi, "<br>")
    .replace(/<span\b[^>]*class="[^"]*\b(italic|class_sd\w*)\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, (_, c: string, t: string) => (c === "italic" ? `<i>${t}</i>` : `<b>${t}</b>`))
    .replace(/<(i|em)\b[^>]*>/gi, "<i>")
    .replace(/<\/(i|em)>/gi, "</i>")
    .replace(/<(b|strong)\b[^>]*>/gi, "<b>")
    .replace(/<\/(b|strong)>/gi, "</b>")
    .replace(/<(sup)\b[^>]*>/gi, "<sup>")
    .replace(/<\/?(span|font|small|big|u|div|p|img)\b[^>]*>/gi, "");
  // anything else that is not i/b/br/sup goes; text is decoded and escaped again
  h = h.replace(/<(?!\/?(i|b|br|sup)>)[^>]+>/gi, "");
  const esc = (t: string) => decode(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  h = h
    .split(/(<\/?(?:i|b|br|sup)>)/i)
    .map((part, k) => (k % 2 ? part.toLowerCase() : esc(part)))
    .join("");
  return h
    .replace(/[ \t\u00a0\r\n]+/g, " ")
    .replace(/<\/i>(\s*)<i>/g, "$1")
    .replace(/<i>(\s*)<\/i>/g, "$1")
    .replace(/\s*<br>\s*/g, "<br>")
    .trim()
    .normalize("NFC");
}
