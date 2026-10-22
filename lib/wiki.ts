import "server-only";
import fs from "fs";
import path from "path";
import postcss, { type Rule } from "postcss";
import { parse } from "node-html-parser";

// Turns the self-contained public/hnv-wiki.html (the file the owner
// maintains) into pieces the site can render inside its own layout:
//   css  — the wiki's stylesheet, scoped under `.hnv-wiki` so it can't
//          restyle the rest of the site (header, footer, fonts …)
//   html — the wiki body, minus its own "Back to homepage" top bar
//   js   — the wiki's script (section switching, search, sūtra lists)
// Runs at build time (the /hnv-wiki page is static).

const SCOPE = ".hnv-wiki";

function scopeSelector(sel: string): string {
  const s = sel.trim();
  if (s === ":root" || s === "html" || s === "body") return SCOPE;
  if (s.startsWith("body ")) return `${SCOPE} ${s.slice(5)}`;
  if (s === "*") return `${SCOPE}, ${SCOPE} *`;
  return `${SCOPE} ${s}`;
}

export function scopeCss(css: string): string {
  const root = postcss.parse(css);
  root.walkRules((rule: Rule) => {
    const parent = rule.parent;
    // keyframe steps (from/to/50%) must not be prefixed
    if (parent && parent.type === "atrule" && /keyframes$/i.test((parent as unknown as { name: string }).name)) return;
    rule.selectors = rule.selectors.map(scopeSelector);
  });
  return root.toString();
}

function normaliseHtml(html: string): string {
  const root = parse(html, { comment: false, blockTextElements: { script: true, style: true, pre: true } });
  for (const table of root.querySelectorAll("table")) {
    const rows = table.childNodes.filter((n) => "tagName" in n && (n as { tagName: string }).tagName === "TR");
    if (rows.length === 0) continue;
    const tbody = parse("<tbody></tbody>").firstChild as unknown as import("node-html-parser").HTMLElement;
    for (const r of rows) tbody.appendChild(r);
    table.appendChild(tbody);
  }
  return root.toString();
}

export type WikiParts = { css: string; html: string; js: string; title: string };

let cached: WikiParts | null = null;

export function loadWiki(): WikiParts {
  if (cached) return cached;
  const file = fs.readFileSync(path.join(process.cwd(), "public", "hnv-wiki.html"), "utf-8");
  const css = file.slice(file.indexOf("<style>") + 7, file.indexOf("</style>"));
  const bodyStart = file.indexOf(">", file.indexOf("<body")) + 1;
  const scriptStart = file.lastIndexOf("<script>");
  const js = file.slice(scriptStart + 8, file.lastIndexOf("</script>"));
  let html = file.slice(bodyStart, scriptStart);
  // Drop the wiki's own top bar — the site header replaces it.
  html = html.replace(/<div id="hnv-topbar">[\s\S]*?<\/div>/, "");
  // Normalise the markup so the browser parses it exactly as React sends it:
  // the source file has an unclosed <div> (which would swallow the site
  // footer) and <table><tr> rows without <tbody> (browsers insert one).
  html = normaliseHtml(html);
  const title = (file.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "HNV-Wiki").trim();
  cached = { css: scopeCss(css), html, js, title };
  return cached;
}
