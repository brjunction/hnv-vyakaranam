// The documents of an EPUB in reading order (its spine). `files` is the
// unzipped archive (path → bytes); `str` turns bytes into text. Works with
// fflate in the browser and in Node.

export function epubDocuments(files: Record<string, Uint8Array>, str: (b: Uint8Array) => string): { path: string; xhtml: string }[] {
  const container = files["META-INF/container.xml"] ? str(files["META-INF/container.xml"]) : "";
  const opfPath = /full-path="([^"]+)"/.exec(container)?.[1] ?? Object.keys(files).find((p) => p.endsWith(".opf")) ?? "";
  const opf = files[opfPath] ? str(files[opfPath]) : "";
  const base = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
  const items = new Map<string, string>();
  for (const m of opf.matchAll(/<item\b[^>]*>/g)) {
    const id = /\bid="([^"]+)"/.exec(m[0])?.[1];
    const href = /\bhref="([^"]+)"/.exec(m[0])?.[1];
    if (id && href) items.set(id, decodeURIComponent(href));
  }
  const order = [...opf.matchAll(/<itemref\b[^>]*idref="([^"]+)"/g)].map((m) => items.get(m[1])).filter((x): x is string => !!x);
  const paths = order.length ? order.map((h) => normalise(base + h)) : Object.keys(files).filter((p) => /\.(x?html?|xml)$/i.test(p)).sort();
  return paths.filter((p) => files[p] && /\.(x?html?|xml)$/i.test(p)).map((p) => ({ path: p, xhtml: str(files[p]) }));
}

function normalise(p: string) {
  const out: string[] = [];
  for (const part of p.split("/")) {
    if (part === "..") out.pop();
    else if (part !== ".") out.push(part);
  }
  return out.join("/");
}

/** All stylesheets of an EPUB, joined. */
export function epubCss(files: Record<string, Uint8Array>, str: (b: Uint8Array) => string): string {
  return Object.keys(files)
    .filter((p) => /\.css$/i.test(p))
    .map((p) => str(files[p]))
    .join("\n");
}
