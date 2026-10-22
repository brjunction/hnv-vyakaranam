import { NextResponse } from "next/server";
import { getDailyFor } from "@/lib/data/daily";
import { DATE_RE } from "@/lib/daily/pick";

// One small static JSON file per calendar date, e.g. /api/daily/2026-10-22.
// Built on first request, then served from the cache until the admin changes
// the pools or pins (revalidateTag("daily")) — or after a day, whichever is
// first. The browser asks for ITS OWN local date, so "today" follows the
// visitor's midnight, not the server's.
export const dynamic = "force-static";
export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function GET(_req: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const year = Number(date.slice(0, 4));
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date)) || year < 2020 || year > 2100) {
    return NextResponse.json({ error: "Use a date like 2026-10-22." }, { status: 400 });
  }
  // On a database error this throws: Next.js answers 500 and does NOT cache
  // it (an already-cached copy keeps being served), so the next request
  // simply tries again. DailyPanel hides itself on any non-OK response.
  return NextResponse.json(await getDailyFor(date, { throwOnError: true }));
}
