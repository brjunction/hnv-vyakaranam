import "server-only";
import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { songs } from "@/lib/db/schema";
import { isDbConfigured } from "@/lib/env";
import { tags } from "@/lib/data/tags";
import { comparePlace, firstLineOf, songKey, type Song, type SongEntry, type SongLanguage } from "@/lib/songs/core";

// Public reads for /songs (cached under the `songs` tag) and admin reads.

type Row = typeof songs.$inferSelect;

export const toSong = (r: Row): Song => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  altTitles: r.altTitles,
  author: r.author,
  book: r.book,
  bookPlace: r.bookPlace,
  kind: r.kind,
  language: r.language as SongLanguage,
  verses: r.verses ?? [],
  introHtml: r.introHtml,
  purportHtml: r.purportHtml,
  translator: r.translator,
  links: r.links ?? [],
  status: r.status,
});

function toEntry(s: Song): SongEntry {
  const openings = s.verses
    .map((v) => (v.printed?.trim() || v.text || "").split(/\s*\/\s*|\n/)[0] ?? "")
    .join(" ")
    .slice(0, 400);
  return {
    slug: s.slug,
    title: s.title,
    firstLine: firstLineOf(s.verses),
    author: s.author,
    book: s.book,
    bookPlace: s.bookPlace,
    kind: s.kind,
    language: s.language,
    verses: s.verses.length,
    key: [s.title, s.altTitles, s.author, s.book, openings].map(songKey).join("|"),
  };
}

const loadAll = unstable_cache(
  async (): Promise<Song[]> => {
    if (!isDbConfigured) return [];
    const rows = await getDb().select().from(songs).where(eq(songs.status, "published")).orderBy(asc(songs.title));
    return rows.map(toSong);
  },
  ["songs:all:v1"],
  { tags: [tags.songs] }
);

/** All published songs, light (for the list, search and A–Z). */
export async function getSongIndex(): Promise<SongEntry[]> {
  return (await loadAll()).map(toEntry);
}

export async function getSong(slug: string): Promise<{ song: Song; prev: SongEntry | null; next: SongEntry | null; sameAuthor: SongEntry[] } | null> {
  const all = await loadAll();
  const song = all.find((s) => s.slug === slug);
  if (!song) return null;
  const entries = all.map(toEntry);
  // neighbours: within the same book (book order), else A–Z
  const seq = song.book
    ? entries.filter((e) => e.book === song.book).sort((a, b) => comparePlace(a.bookPlace, b.bookPlace) || a.title.localeCompare(b.title))
    : entries;
  const i = seq.findIndex((e) => e.slug === slug);
  const sameAuthor = song.author ? entries.filter((e) => e.author === song.author && e.slug !== slug).slice(0, 8) : [];
  return { song, prev: i > 0 ? seq[i - 1] : null, next: i >= 0 && i < seq.length - 1 ? seq[i + 1] : null, sameAuthor };
}

// ------------------------------------------------------------- admin ---
export async function listSongsAdmin() {
  const rows = await getDb().select().from(songs).orderBy(asc(songs.title));
  return rows.map(toSong);
}
export async function getSongAdmin(id: number) {
  const [r] = await getDb().select().from(songs).where(eq(songs.id, id)).limit(1);
  return r ? toSong(r) : null;
}
/** Distinct authors / books / types already used (for the editor's suggestions). */
export async function songFacets() {
  const rows = await getDb().select({ author: songs.author, book: songs.book, kind: songs.kind }).from(songs);
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return { authors: uniq(rows.map((r) => r.author)), books: uniq(rows.map((r) => r.book)), kinds: uniq(rows.map((r) => r.kind)) };
}
