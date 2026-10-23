import "server-only";
import sanitizeHtml from "sanitize-html";

// Every rich-text field (vṛtti, translation, synonyms, commentaries) is
// sanitized HERE, on the server, before it is stored — the public site then
// renders the stored HTML as-is. Allows what the admin editor can produce:
// headings, lists, colours, alignment, links, tables and images.

const COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i;
const LENGTH = /^\d+(\.\d+)?(px|%|em|rem)?$/;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "sub", "sup", "mark", "span",
    "a", "ul", "ol", "li", "blockquote", "code", "pre", "hr",
    "table", "colgroup", "col", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    "img", "figure", "figcaption",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "title"],
    img: ["src", "alt", "title", "width", "height", "style"],
    td: ["colspan", "rowspan", "colwidth", "style"],
    th: ["colspan", "rowspan", "colwidth", "style"],
    col: ["style", "span"],
    table: ["style"],
    ol: ["start", "type"],
    mark: ["data-color", "style"],
    "*": ["style"],
  },
  allowedStyles: {
    "*": {
      color: [COLOR],
      "background-color": [COLOR],
      "text-align": [/^(left|right|center|justify)$/],
      width: [LENGTH],
      "min-width": [LENGTH],
      "max-width": [LENGTH],
      height: [/^auto$/, LENGTH],
    },
  },
  allowedSchemes: ["https", "http", "mailto"],
  allowedSchemesByTag: { img: ["https", "http"] },
  allowProtocolRelative: false,
  transformTags: {
    // External links open in a new tab and never pass referrer/opener.
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
    }),
  },
};

/** Clean editor HTML. Returns "" when nothing meaningful is left. */
export function sanitizeRich(html: string): string {
  const clean = sanitizeHtml(html ?? "", OPTIONS).trim();
  // An editor that was opened and left empty submits "<p></p>".
  const textless = clean.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "").trim();
  if (!textless) return "";
  if (!/<img|<table|<hr/i.test(textless) && !textless.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()) return "";
  return clean;
}

/** Plain-text preview of rich HTML (admin lists, meta descriptions). */
export function richToText(html: string, max = 160): string {
  const text = sanitizeHtml(html ?? "", { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
