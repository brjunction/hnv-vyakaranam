import { NextResponse } from "next/server";
import { lookupHeadword } from "@/lib/dict/engine";

// GET /api/dict/entry?h=kṛṣṇa&d=mw  → every dictionary's article for that headword
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const h = (sp.get("h") ?? "").slice(0, 120);
  if (!h.trim()) return NextResponse.json({ error: "Missing headword." }, { status: 400 });
  const dict = (sp.get("d") ?? "").split(",").filter(Boolean);
  try {
    const data = await lookupHeadword(h, { dict });
    const cache = data.entries.length ? "public, s-maxage=600, stale-while-revalidate=86400" : "no-store";
    return NextResponse.json(data, { headers: { "Cache-Control": cache } });
  } catch (err) {
    console.error("[dict/entry]", err);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
}
