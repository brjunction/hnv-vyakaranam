import { NextResponse } from "next/server";
import { searchDictionaries } from "@/lib/dict/engine";
import { toEnglish } from "@/lib/dict/translate";

// GET /api/dict/search?q=kṛṣṇa&mode=word|meaning&d=mw,apte
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").slice(0, 80);
  const mode = sp.get("mode") === "meaning" ? "meaning" : "word";
  const dict = (sp.get("d") ?? "").split(",").filter(Boolean);
  try {
    // Meaning search: the query may be in any language; search its English.
    const tr = mode === "meaning" && q.trim() ? await toEnglish(q) : null;
    const query = tr?.changed ? tr.text : q;
    const data = q.trim() ? await searchDictionaries(query, { mode, dict, limit: 60 }) : await searchDictionaries("", { dict, limit: 0 });
    if (tr?.changed) (data as Record<string, unknown>).translated = { from: tr.from, text: tr.text };
    // Never cache while no dictionary is installed (the first upload must show at once).
    const cache = data.dictionaries.length ? "public, s-maxage=600, stale-while-revalidate=86400" : "no-store";
    return NextResponse.json(data, { headers: { "Cache-Control": cache } });
  } catch (err) {
    console.error("[dict/search]", err);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
