import { NextResponse } from "next/server";
import { deleteObject, ensureCors, getObject, isStorageConfigured, listKeys, putObject } from "@/lib/storage/neon";

// GET /api/dict/health — is dictionary storage reachable? (no data exposed)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isStorageConfigured()) return NextResponse.json({ storage: "not configured" }, { status: 503 });
  try {
    await listKeys("health-check/");
    // Write test (several parallel writes of different sizes, like index pieces)
    const sizes = [200, 60_000, 400_000, 1_500_000];
    await Promise.all(sizes.map((n, i) => putObject(`health-check/w${i}.bin`, Buffer.alloc(n, 7), "application/gzip")));
    const back = await getObject("health-check/w2.bin", 10, 19);
    await Promise.all(sizes.map((_, i) => deleteObject(`health-check/w${i}.bin`)));
    if (back.buf.length !== 10) throw new Error("range read returned the wrong length");
    await ensureCors([
      "https://www.harinamamrta-vyakaranam.com",
      "https://harinamamrta-vyakaranam.com",
      "https://harinamamrta-vyakaranam.vercel.app",
      "http://localhost:3000",
    ]);
    return NextResponse.json({ storage: "ok", write: "ok", rangeRead: "ok", cors: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ storage: "error", detail: (err as Error).message.slice(0, 200) }, { status: 500 });
  }
}
