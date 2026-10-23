"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Search, X } from "lucide-react";
import type { SearchHit } from "@/lib/data/scriptures";
import Select from "@/components/ui/Select";

type Book = { code: string; title: string };

/** Search across verse text, commentaries and chapter titles, in any script. */
export default function ScriptureSearch({ books, initialBook = "", initialQ = "", compact = false }: { books: Book[]; initialBook?: string; initialQ?: string; compact?: boolean }) {
  const [q, setQ] = useState(initialQ);
  const [book, setBook] = useState(initialBook);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!initialQ) {
      try {
        const sp = new URLSearchParams(window.location.search);
        if (sp.get("q")) setQ(sp.get("q") ?? "");
        if (sp.get("book")) setBook(sp.get("book") ?? "");
      } catch {}
    }
  }, [initialQ]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) {
        setHits(null);
        return;
      }
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;
      setLoading(true);
      if (!compact) {
        const u = new URL(window.location.href);
        u.searchParams.set("q", q);
        if (book) u.searchParams.set("book", book);
        else u.searchParams.delete("book");
        window.history.replaceState(null, "", u.toString());
      }
      try {
        const res = await fetch(`/api/scriptures/search?q=${encodeURIComponent(q)}${book ? `&book=${book}` : ""}`, { signal: ac.signal });
        const data = (await res.json()) as { results?: SearchHit[] };
        setHits(data.results ?? []);
      } catch {
        /* aborted */
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, book, compact]);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search verses & commentaries — dharma, धर्म, kRShNa…"
            aria-label="Search the scriptures"
            className="h-12 w-full rounded-full border border-[var(--ctl-border)] bg-[var(--ctl-bg)] pl-11 pr-11 text-base shadow-[var(--ctl-shadow)] outline-none transition-colors focus:border-[var(--ctl-on-border)]"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            {loading ? (
              <Loader2 size={16} className="animate-spin text-[var(--fg-muted)]" />
            ) : q ? (
              <button onClick={() => setQ("")} aria-label="Clear" className="text-[var(--fg-muted)]">
                <X size={16} />
              </button>
            ) : null}
          </span>
        </div>
        {books.length > 1 && (
          <Select
            value={book}
            onChange={setBook}
            options={[{ value: "", label: "All scriptures" }, ...books.map((b) => ({ value: b.code, label: b.title }))]}
            width={280}
            align="right"
            triggerClassName="!h-12"
          />
        )}
      </div>
      {hits && (
        <div className="mt-4">
          {hits.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--fg-muted)]">Nothing found for “{q}”.</p>
          ) : (
            <ol className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)]">
              {hits.slice(0, compact ? 8 : 60).map((h, i) => (
                <li key={i}>
                  <Link href={`/scriptures/${h.book}/${[...h.path, ...(h.key ? [h.key] : [])].join("/")}`} className="block px-5 py-3.5 hover:bg-[var(--bg-2)]">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold">
                        {h.abbrev || h.bookTitle} {h.verseNo}
                      </span>
                      {h.title && <span>{h.title}</span>}
                      <span className="rounded-full bg-[var(--bg-2)] px-2 py-0.5 text-xs text-[var(--fg-muted)]">{h.where}</span>
                    </span>
                    {h.snippet && <span className="mt-1 block text-sm text-[var(--fg-muted)]">{h.snippet}</span>}
                  </Link>
                </li>
              ))}
            </ol>
          )}
          {compact && hits.length > 8 && (
            <Link href={`/scriptures/search?q=${encodeURIComponent(q)}${book ? `&book=${book}` : ""}`} className="mt-3 inline-block text-sm underline">
              All {hits.length} results →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
