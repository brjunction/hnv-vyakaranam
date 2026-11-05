import { NextResponse } from "next/server";
import { lookupHeadword } from "@/lib/dict/engine";
import { parseConjugation, parseDeclension, type ConjAttested, type NamaAttested } from "@/lib/grammar/attested";

// GET /api/grammar/forms?h=rāma&kind=nama|dhatu → attested declension / conjugation tables
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const h = (sp.get("h") ?? "").trim().slice(0, 80);
  const kind = sp.get("kind") === "dhatu" ? "dhatu" : "nama";
  if (!h) return NextResponse.json({ error: "Missing word." }, { status: 400 });
  try {
    const data = await lookupHeadword(h, { dict: ["~heritage"] });
    const english = data.entries.filter((e) => /English/i.test(e.dictName ?? ""));
    const nama: NamaAttested[] = [];
    const conj: ConjAttested[] = [];
    for (const e of english) {
      if (kind === "nama" && /Declension/i.test(e.dictName)) {
        const t = parseDeclension(e.html);
        if (t) nama.push(t);
      }
      if (kind === "dhatu" && /grammar/i.test(e.dictName)) conj.push(...parseConjugation(e.html));
    }
    return NextResponse.json({ nama, conj }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (err) {
    console.error("[grammar/forms]", err);
    return NextResponse.json({ nama: [], conj: [] }, { status: 200 });
  }
}
