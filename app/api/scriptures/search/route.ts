import { NextResponse } from "next/server";
import { searchScriptures } from "@/lib/data/scriptures";
import { iastToDeva, queryReadings } from "@/lib/dict/translit";

// GET /api/scriptures/search?q=dharma&book=bg — verse text, commentaries and
// titles, any input script (Devanagari / IAST / ITRANS / HK / plain letters).
export const runtime = "nodejs";
export const maxDuration = 20;

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 80);
  const book = sp.get("book")?.toLowerCase() || undefined;
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    const needles = new Set<string>([q, q.normalize("NFC")]);
    try {
      for (const r of queryReadings(q)) {
        needles.add(r);
        needles.add(r.replace(/ṃ/g, "ṁ"));
        const d = iastToDeva(r);
        if (d) needles.add(d);
      }
    } catch {}
    const results = await searchScriptures([...needles].filter((n) => n.length >= 2).slice(0, 8), book, 60);
    return NextResponse.json({ results }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" } });
  } catch (e) {
    console.error("[scriptures/search]", e);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
