"use client";

import Link from "next/link";
import { Bookmark, History, NotebookPen, ArrowRight } from "lucide-react";
import { useMarks, useNotes } from "@/components/scriptures/prefs";

/** "Continue reading", bookmarks and notes saved on this device. Renders nothing for a first-time reader. */
export default function Shelf({ book }: { book?: string }) {
  const history = useMarks("history");
  const bookmarks = useMarks("bookmarks");
  const { notes } = useNotes();
  const h = history.items.filter((m) => !book || m.book === book).slice(0, book ? 1 : 4);
  const b = bookmarks.items.filter((m) => !book || m.book === book).slice(0, 6);
  const n = Object.values(notes)
    .filter((x) => !book || x.book === book)
    .sort((a, z) => z.at - a.at)
    .slice(0, 4);
  if (!h.length && !b.length && !n.length) return null;
  return (
    <section className="mb-12 grid gap-4 md:grid-cols-3">
      {h.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-saffron)]">
            <History size={13} /> Continue reading
          </p>
          <ul className="grid gap-1.5">
            {h.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--bg-2)]">
                  <span>
                    <span className="font-semibold">{m.ref}</span>
                    {!book && <span className="ml-2 text-sm text-[var(--fg-muted)]">{m.title}</span>}
                  </span>
                  <ArrowRight size={15} className="text-[var(--fg-muted)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {b.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-saffron)]">
            <Bookmark size={13} /> Bookmarks
          </p>
          <div className="flex flex-wrap gap-1.5">
            {b.map((m) => (
              <Link key={m.href} href={m.href} className="anv-pill hover:border-[var(--accent)]">
                {m.ref}
              </Link>
            ))}
          </div>
        </div>
      )}
      {n.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-saffron)]">
            <NotebookPen size={13} /> My notes
          </p>
          <ul className="grid gap-2 text-sm">
            {n.map((x) => (
              <li key={x.href}>
                <Link href={x.href} className="block rounded-lg px-2 py-1 hover:bg-[var(--bg-2)]">
                  <span className="font-semibold">{x.ref}</span> <span className="line-clamp-1 text-[var(--fg-muted)]">{x.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-[var(--fg-muted)] md:col-span-3">
        Saved on this device only ·{" "}
        <Link href="/scriptures/mine" className="underline">
          all bookmarks & notes, backup
        </Link>
      </p>
    </section>
  );
}
