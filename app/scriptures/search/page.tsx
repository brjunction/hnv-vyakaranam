import type { Metadata } from "next";
import Link from "next/link";
import { getBooks } from "@/lib/data/scriptures";
import ScriptureSearch from "@/components/scriptures/ScriptureSearch";

export const metadata: Metadata = { title: "Search the scriptures", alternates: { canonical: "/scriptures/search" }, robots: { index: false } };

export default async function SearchPage() {
  const books = await getBooks();
  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 pt-12">
      <Link href="/scriptures" className="text-sm text-[var(--fg-muted)] hover:underline">
        ← Scriptures
      </Link>
      <h1 className="mb-2 mt-4 text-3xl font-semibold">Search the scriptures</h1>
      <p className="mb-6 text-[var(--fg-muted)]">Verse text, anvaya, translations and commentaries. Type in Devanagari, IAST, or plain letters (kRShNa, krsna…).</p>
      <ScriptureSearch books={books.map((b) => ({ code: b.code, title: b.title }))} />
    </div>
  );
}
