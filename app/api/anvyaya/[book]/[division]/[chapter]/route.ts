import { NextResponse } from "next/server";
import { getBook } from "@/lib/anvyayaBooks";
import { loadDivision } from "@/lib/anvyayaData";

// Returns the verses of one chapter as JSON. The canto page calls this
// when a chapter is expanded, so a huge canto never has to be sent to the
// browser in one go.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ book: string; division: string; chapter: string }> }
) {
  const { book: bookCode, division, chapter } = await params;
  const book = getBook(bookCode);
  const d = parseInt(division, 10);
  const c = parseInt(chapter, 10);
  if (!book || !Number.isFinite(d) || !Number.isFinite(c)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const found = loadDivision(book.code, d).find((x) => x.number === c);
  if (!found) return NextResponse.json({ verses: [] }, { status: 404 });

  return NextResponse.json(
    { verses: found.verses },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } }
  );
}
