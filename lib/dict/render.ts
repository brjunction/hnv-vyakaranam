import "server-only";
import sanitizeHtml from "sanitize-html";
import type { Field } from "@/lib/dict/stardict";

// Turns StarDict fields into safe HTML. 'h'/'g' are HTML (Pango markup for
// 'g'), 'x' is XDXF, the rest is plain text. GoldenDict-style bword:// links
// become links to another dictionary search.

const searchHref = (w: string) => `/tools/dictionary/search?q=${encodeURIComponent(w)}`;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "b", "strong", "i", "em", "u", "s", "sub", "sup", "small", "big", "br", "p", "div", "span", "font", "a", "ul", "ol", "li",
    "blockquote", "table", "thead", "tbody", "tr", "td", "th", "hr", "h1", "h2", "h3", "h4", "code", "pre", "abbr", "dl", "dt", "dd",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel", "data-word"],
    span: ["style", "class"],
    div: ["style", "class"],
    abbr: ["title"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
    "*": ["lang"],
  },
  allowedStyles: { "*": { color: [/^#?[\w(),.\s%]+$/], "font-weight": [/^\w+$/], "font-style": [/^\w+$/], "margin-left": [/^[\d.]+(px|em)$/] } },
  allowedSchemes: ["http", "https", "bword"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  transformTags: {
    a: (_tag, attribs): sanitizeHtml.Tag => {
      const href = attribs.href ?? "";
      const out: Record<string, string> = href.startsWith("bword://")
        ? { href: searchHref(decodeURIComponent(href.slice(8))), "data-word": "1" }
        : { href, target: "_blank", rel: "noopener noreferrer" };
      return { tagName: "a", attribs: out };
    },
    // <font color> → theme-aware classes (readable in light and dark mode)
    font: (_tag, attribs): sanitizeHtml.Tag => {
      const c = (attribs.color ?? "").toLowerCase();
      const cls =
        c === "red" || c === "#ff0000" ? "dc-red"
        : c === "blue" || c === "#0000ff" ? "dc-blue"
        : c === "green" || c === "#008000" ? "dc-green"
        : c === "#ffa500" || c === "orange" ? "dc-orange"
        : c === "gray" || c === "grey" || c === "#808080" ? "dc-muted"
        : c ? "dc-accent" : "";
      return { tagName: "span", attribs: cls ? { class: cls } : {} };
    },
    // XDXF basics
    k: "b",
    ex: "i",
    kref: (): sanitizeHtml.Tag => ({ tagName: "a", attribs: { href: "#" } }),
    c: (_tag, attribs): sanitizeHtml.Tag => {
      const out: Record<string, string> = attribs.c ? { style: `color:${attribs.c}` } : {};
      return { tagName: "span", attribs: out };
    },
    abr: "abbr",
    dtrn: "span",
  },
};

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Some dictionaries (e.g. the Heritage declension/conjugation tables) write
 * table rows as <span> — browsers can't lay those out. Turn them into <tr>.
 */
function repairTables(html: string): string {
  if (!/<table/i.test(html)) return html;
  return html.replace(/<span>(\s*<t[dh][\s>])/gi, "<tr>$1").replace(/(<\/t[dh]>\s*)<\/span>/gi, "$1</tr>");
}

export function fieldToHtml(f: Field): string {
  const looksHtml = /<\/?[a-z][^>]*>/i.test(f.data);
  if (f.type === "h" || f.type === "g" || f.type === "x" || looksHtml) {
    let html = sanitizeHtml(repairTables(f.data.replace(/\r?\n/g, f.type === "h" ? "\n" : "<br>")), OPTIONS);
    // every table scrolls on its own on small screens
    html = html.replace(/<table>/g, '<div class="dict-table"><table>').replace(/<\/table>/g, "</table></div>");
    // kref (XDXF cross-reference) → search link on its text
    html = html.replace(/<a href="#">([^<]+)<\/a>/g, (_, w) => `<a href="${searchHref(w)}" data-word="1">${w}</a>`);
    return html;
  }
  return `<span class="dict-plain">${escape(f.data)}</span>`;
}

export function fieldsToText(fields: Field[]): string {
  return fields
    .map((f) => f.data)
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ");
}
