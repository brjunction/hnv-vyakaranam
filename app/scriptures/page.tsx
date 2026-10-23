import type { Metadata } from "next";
import Link from "next/link";
import { Columns2, NotebookPen } from "lucide-react";
import { getBooks } from "@/lib/data/scriptures";
import Shelf from "@/components/scriptures/Shelf";
import ScriptureSearch from "@/components/scriptures/ScriptureSearch";

export const metadata: Metadata = {
  title: "Scriptures",
  description: "Read the scriptures verse by verse — Sanskrit in Devanagari, IAST, Bengali or Odia, with anvaya (prose order), translation and commentaries.",
  alternates: { canonical: "/scriptures" },
};

export default async function ScripturesHome() {
  const books = await getBooks();
  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="anv-hero-bg absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-20 text-center">
          <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)]">Scriptures</p>
          <h1 className="mb-5 font-devanagari text-4xl leading-tight sm:text-6xl">शास्त्राणि</h1>
          <div className="anv-ornament mb-6" aria-hidden>
            ◆
          </div>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed sm:text-xl">
            Read the great scriptures verse by verse — in Devanagari, IAST, Bengali or Odia — with the anvaya, the translation and the ācāryas’ commentaries side by side.
          </p>
          <div className="mx-auto mt-10 max-w-2xl text-left">
            <ScriptureSearch books={books.map((b) => ({ code: b.code, title: b.title }))} compact />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <Shelf />
        {books.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">The scriptures are being prepared and will appear here soon.</p>
        ) : (
          <div className={`grid gap-8 ${books.length > 2 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2"}`}>
            {books.map((b) => (
              <Link key={b.code} href={`/scriptures/${b.code}`} className="anv-card group p-8">
                <div className="flex gap-5">
                  {b.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.coverUrl} alt="" className="h-32 w-24 shrink-0 rounded-lg border border-[var(--border)] object-cover shadow-sm" />
                  )}
                  <div className="min-w-0">
                    {b.abbrev && <p className="anv-label mb-4">{b.abbrev}</p>}
                    {b.titleDeva && <p className="mb-2 font-devanagari text-3xl leading-snug transition-colors group-hover:text-[var(--accent)] sm:text-4xl">{b.titleDeva}</p>}
                    <h2 className="mb-2 text-xl font-semibold">{b.title}</h2>
                    {b.tagline && <p className="mb-4 text-sm italic text-[var(--fg-muted)]">{b.tagline}</p>}
                  </div>
                </div>
                {b.description && <p className="mb-6 text-sm leading-relaxed text-[var(--fg-muted)]">{b.description}</p>}
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  <span className="anv-pill">
                    {b.divisions} {b.levels[0]}
                    {b.divisions === 1 ? "" : "s"}
                  </span>
                  <span className="anv-pill">
                    {b.verses.toLocaleString()} {b.verses === 1 ? b.verseLabel.toLowerCase() : b.verseLabelPlural.toLowerCase()}
                  </span>
                  {b.author && <span className="anv-pill">{b.author}</span>}
                </div>
                <span className="text-sm font-medium text-[var(--color-vermillion)]">Open the book →</span>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          <Link href="/scriptures/read" className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 transition-colors hover:border-[var(--accent)]">
            <Columns2 className="shrink-0 text-[var(--accent)]" />
            <span>
              <span className="block font-semibold">Dual reading</span>
              <span className="text-sm text-[var(--fg-muted)]">Two places side by side — two books, or two verses of one.</span>
            </span>
          </Link>
          <Link href="/scriptures/mine" className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 transition-colors hover:border-[var(--accent)]">
            <NotebookPen className="shrink-0 text-[var(--accent)]" />
            <span>
              <span className="block font-semibold">My bookmarks & notes</span>
              <span className="text-sm text-[var(--fg-muted)]">Everything you saved while reading, with backup.</span>
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
