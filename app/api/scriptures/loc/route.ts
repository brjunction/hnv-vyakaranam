import { NextResponse } from "next/server";
import { getBook, getDivisionData, getTree, resolvePath } from "@/lib/data/scriptures";
import { readingOrder } from "@/lib/scriptures/core";

// GET /api/scriptures/loc?book=sb&path=1/12/1 → { book, tree, data, verse }
// Used by the dual reader to move around without page loads. Cached data
// (tags), CDN-cached briefly.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const code = (sp.get("book") ?? "").toLowerCase();
  const segs = (sp.get("path") ?? "").split("/").filter(Boolean).slice(0, 8);
  try {
    const book = await getBook(code);
    if (!book) return NextResponse.json({ error: "Unknown book." }, { status: 404 });
    const tree = await getTree(code);
    let r = await resolvePath(code, segs);
    if (r?.kind === "redirect") r = await resolvePath(code, r.to);
    // book or a division without verses → its first readable division
    let node = r && (r.kind === "division" || r.kind === "verse") ? r.node : null;
    let verse = r?.kind === "verse" ? r.key : null;
    if (!node || (node.verses === 0 && !node.hasBody)) {
      const order = readingOrder(tree);
      const under = node ? order.find((n) => n.path.slice(0, node!.path.length).join("/") === node!.path.join("/")) : order[0];
      node = under ?? null;
      verse = null;
    }
    if (!node) return NextResponse.json({ book, tree, data: null, verse: null }, { headers: { "Cache-Control": "no-store" } });
    const data = await getDivisionData(code, node.path);
    if (!verse && data?.verses.length) verse = data.verses[0].key;
    return NextResponse.json({ book, tree, data, verse }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" } });
  } catch (e) {
    console.error("[scriptures/loc]", e);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
