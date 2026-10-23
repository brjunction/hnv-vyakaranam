import { NextResponse } from "next/server";
import { ensureCors, isStorageConfigured, listKeys } from "@/lib/storage/neon";

// GET /api/dict/health — is dictionary storage reachable? (no data exposed)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isStorageConfigured()) return NextResponse.json({ storage: "not configured" }, { status: 503 });
  try {
    await listKeys("health-check/");
    await ensureCors([
      "https://www.harinamamrta-vyakaranam.com",
      "https://harinamamrta-vyakaranam.com",
      "https://harinamamrta-vyakaranam.vercel.app",
      "http://localhost:3000",
    ]);
    return NextResponse.json({ storage: "ok", cors: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ storage: "error", detail: (err as Error).message.slice(0, 200) }, { status: 500 });
  }
}
