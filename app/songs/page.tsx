import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getSongIndex } from "@/lib/data/songs";
import PageHead, { MetaChip } from "@/components/PageHead";
import SongBrowser from "@/components/songs/SongBrowser";

export const metadata: Metadata = {
  title: "Vaiṣṇava songs",
  description: "Vaiṣṇava songs, aṣṭakams, stotras and Padyāvalī verses — A–Z, by author, book or type, in Devanagari, IAST, Bengali or Odia.",
  alternates: { canonical: "/songs" },
};
export const revalidate = false;

export default async function SongsPage() {
  const songs = await getSongIndex();
  const books = new Map<string, number>();
  for (const s of songs) if (s.book) books.set(s.book, (books.get(s.book) ?? 0) + 1);
  const topBooks = [...books.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const authors = new Set(songs.map((s) => s.author).filter(Boolean)).size;
  return (
    <>
      <PageHead
        title="Vaiṣṇava songs"
        intro="Songs of the ācāryas, aṣṭakams, stotras and Padyāvalī — search any song, in any script."
        meta={
          songs.length ? (
            <>
              <MetaChip n={songs.length} label="songs" />
              <MetaChip n={authors} label="authors" />
              <MetaChip n={books.size} label="books" />
            </>
          ) : undefined
        }
      />
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-4">
        {topBooks.length > 1 && (
          <nav aria-label="Books" className="mb-2 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
            {topBooks.map(([b, n]) => (
              <Link key={b} href={`/songs/book/${encodeURIComponent(b)}`} className="ui-btn ui-btn-sm shrink-0">
                <BookOpen size={13} /> {b} <span className="tabular-nums text-[var(--fg-muted)]">{n}</span>
              </Link>
            ))}
          </nav>
        )}
        <SongBrowser songs={songs} />
      </div>
    </>
  );
}
