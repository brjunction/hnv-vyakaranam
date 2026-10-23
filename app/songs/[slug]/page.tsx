import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Music } from "lucide-react";
import { getSong, getSongIndex } from "@/lib/data/songs";
import SongReader from "@/components/songs/SongReader";
import { SONG_LANGUAGE_LABEL, songPath } from "@/lib/songs/core";

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getSongIndex()).map((s) => ({ slug: s.slug }));
}

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const r = await getSong((await params).slug);
  if (!r) return {};
  const s = r.song;
  return {
    title: `${s.title}${s.author ? ` — ${s.author}` : ""}`,
    description: [s.kind, s.book && `from ${s.book}`, s.author && `by ${s.author}`].filter(Boolean).join(" ") + " — words in Devanagari, IAST, Bengali and Odia, with translation.",
    alternates: { canonical: songPath(s.slug) },
  };
}

export default async function SongPage({ params }: P) {
  const r = await getSong((await params).slug);
  if (!r) notFound();
  const { song: s, prev, next, sameAuthor } = r;
  return (
    <article className="mx-auto max-w-3xl px-5 pb-16 pt-5">
      <nav className="mb-4 flex flex-wrap items-center gap-x-2 text-sm text-[var(--fg-muted)]">
        <Link href="/songs" className="hover:text-[var(--accent)]">
          Songs
        </Link>
        {s.book && (
          <>
            <span aria-hidden>›</span>
            <Link href={`/songs/book/${encodeURIComponent(s.book)}`} className="hover:text-[var(--accent)]">
              {s.book}
            </Link>
          </>
        )}
      </nav>
      <header className="mb-5">
        <p className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-saffron)]">
          {s.kind || "Song"}
          {s.bookPlace && <span className="normal-case tracking-normal text-[var(--fg-muted)]">· {s.book ? `${s.book}, ` : ""}{s.bookPlace}</span>}
        </p>
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{s.title}</h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          {[s.author, SONG_LANGUAGE_LABEL[s.language], s.translator && `translation: ${s.translator}`].filter(Boolean).join(" · ")}
        </p>
      </header>
      {s.introHtml && <div className="rich-content mb-6 rounded-xl bg-[var(--bg-2)] p-4 text-[0.95rem]" dangerouslySetInnerHTML={{ __html: s.introHtml }} />}
      <SongReader song={s} />
      {s.purportHtml && (
        <section className="mt-10 border-t border-[var(--border)] pt-6">
          <h2 className="mb-3 text-lg font-semibold">Purport</h2>
          <div className="rich-content leading-relaxed" dangerouslySetInnerHTML={{ __html: s.purportHtml }} />
        </section>
      )}
      {(prev || next) && (
        <nav className="mt-10 grid gap-3 border-t border-[var(--border)] pt-6 sm:grid-cols-2" aria-label={s.book ? `More in ${s.book}` : "More songs"}>
          {prev ? (
            <Link href={songPath(prev.slug)} className="group rounded-xl border border-[var(--border)] p-3 transition-colors hover:border-[var(--accent)]">
              <span className="flex items-center gap-1 text-xs text-[var(--fg-muted)]">
                <ArrowLeft size={13} /> Previous{prev.bookPlace ? ` · ${prev.bookPlace}` : ""}
              </span>
              <span className="mt-0.5 block font-medium group-hover:text-[var(--accent)]">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={songPath(next.slug)} className="group rounded-xl border border-[var(--border)] p-3 text-right transition-colors hover:border-[var(--accent)]">
              <span className="flex items-center justify-end gap-1 text-xs text-[var(--fg-muted)]">
                Next{next.bookPlace ? ` · ${next.bookPlace}` : ""} <ArrowRight size={13} />
              </span>
              <span className="mt-0.5 block font-medium group-hover:text-[var(--accent)]">{next.title}</span>
            </Link>
          )}
        </nav>
      )}
      {sameAuthor.length > 0 && (
        <aside className="mt-8">
          <p className="mb-2 text-sm font-semibold">More by {s.author}</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {sameAuthor.map((o) => (
              <li key={o.slug}>
                <Link href={songPath(o.slug)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--bg-2)]">
                  <Music size={13} className="shrink-0 text-[var(--accent)]" /> <span className="truncate">{o.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
