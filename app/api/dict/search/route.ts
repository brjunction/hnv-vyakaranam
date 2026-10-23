import { NextResponse } from "next/server";
import { searchDictionaries } from "@/lib/dict/engine";

// GET /api/dict/search?q=kṛṣṇa&mode=word|meaning&d=mw,apte
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").slice(0, 80);
  const mode = sp.get("mode") === "meaning" ? "meaning" : "word";
  const dict = (sp.get("d") ?? "").split(",").filter(Boolean);
  try {
    const data = q.trim() ? await searchDictionaries(q, { mode, dict, limit: 60 }) : await searchDictionaries("", { dict, limit: 0 });
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" } });
  } catch (err) {
    console.error("[dict/search]", err);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
