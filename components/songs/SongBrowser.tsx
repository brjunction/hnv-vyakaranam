"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layers, Music, Search, X } from "lucide-react";
import Select from "@/components/ui/Select";
import { SONG_LANGUAGE_LABEL, comparePlace, letterOf, queryKey, songPath, type SongEntry } from "@/lib/songs/core";

// Every song, searchable in any script or spelling, organised by the
// reader's choice (A–Z, author, book, type, language), with an A–Z rail
// that can be tapped or dragged like a phone's contact list.

type Mode = "az" | "author" | "book" | "kind" | "language";
const MODE_KEY = "hnv:songs:mode";
const plainFirst = (s: string) => letterOf(s);

export default function SongBrowser({ songs }: { songs: SongEntry[] }) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("az");
  const [drag, setDrag] = useState<string | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      const m = localStorage.getItem(MODE_KEY) as Mode | null;
      if (m && ["az", "author", "book", "kind", "language"].includes(m)) setMode(m);
    } catch {}
  }, []);
  const pick = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
  };

  const key = useMemo(() => queryKey(q), [q]);
  const shown = useMemo(() => (key ? songs.filter((s) => s.key.includes(key)) : songs), [songs, key]);

  const groups = useMemo(() => {
    const name = (s: SongEntry) =>
      mode === "az" ? letterOf(s.title) : mode === "author" ? s.author || "Unknown author" : mode === "book" ? s.book || "Single bhajans" : mode === "kind" ? s.kind || "Song" : SONG_LANGUAGE_LABEL[s.language] ?? s.language;
    const m = new Map<string, SongEntry[]>();
    for (const s of shown) m.set(name(s), [...(m.get(name(s)) ?? []), s]);
    const list = [...m.entries()].map(([g, items]) => ({
      name: g,
      letter: mode === "az" ? g : plainFirst(g),
      items: items.sort((a, b) => (mode === "book" ? comparePlace(a.bookPlace, b.bookPlace) : 0) || a.title.localeCompare(b.title)),
    }));
    const tail = (n: string) => ["#", "Unknown author", "Single bhajans"].includes(n);
    return list.sort((a, b) => Number(tail(a.name)) - Number(tail(b.name)) || a.name.localeCompare(b.name));
  }, [shown, mode]);

  const letters = useMemo(() => [...new Set(groups.map((g) => g.letter))], [groups]);
  const anchor = (letter: string) => `songs-${mode}-${groups.findIndex((g) => g.letter === letter)}`;
  const jump = (letter: string) => {
    const el = document.getElementById(anchor(letter));
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 128 });
  };
  const fromPoint = (e: React.PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const l = el?.closest<HTMLElement>("[data-letter]")?.dataset.letter;
    if (l) {
      setDrag(l);
      jump(l);
    }
  };

  return (
    <div className="relative">
      <div className="sticky top-16 z-20 -mx-5 mb-5 border-b border-[var(--border)] bg-[var(--bg)]/92 px-5 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <label className="ui-trigger min-w-0 flex-1 basis-64 !pr-2">
            <Search size={15} className="text-[var(--fg-muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search any bhajan — title, first line, author… (any script)"
              className="dict-noring min-w-0 flex-1 bg-transparent text-sm outline-none"
              aria-label="Search bhajans"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} className="ui-icon-btn ui-btn-sm !h-7 !w-7" aria-label="Clear">
                <X size={14} />
              </button>
            )}
          </label>
          <Select
            value={mode}
            onChange={(v) => pick(v as Mode)}
            icon={<Layers size={15} />}
            label="Organize by"
            width={220}
            align="right"
            searchable={false}
            options={[
              { value: "az", label: "A–Z" },
              { value: "author", label: "Author" },
              { value: "book", label: "Book" },
              { value: "kind", label: "Type", sub: "Song, Aṣṭakam, Stotram…" },
              { value: "language", label: "Language" },
            ]}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--fg-muted)]">
          {shown.length === songs.length ? `${songs.length} bhajan${songs.length === 1 ? "" : "s"}` : `${shown.length} of ${songs.length} bhajans`} · {groups.length}{" "}
          {mode === "az" ? "letters" : mode === "author" ? "authors" : mode === "book" ? "books" : mode === "kind" ? "types" : "languages"}
        </p>
      </div>

      {songs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">The bhajans are being added — please come back soon.</p>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">No bhajan matches “{q}”.</p>
      ) : (
        <div className="pr-8 sm:pr-10">
          {groups.map((g, gi) => (
            <section key={g.name} id={`songs-${mode}-${gi}`} className="mb-6">
              <h2 className="sticky top-[8.75rem] z-10 -mx-2 mb-1 flex items-baseline gap-2 rounded-lg bg-[var(--bg)]/95 px-2 py-1.5 backdrop-blur">
                <span className={mode === "az" ? "text-xl font-semibold text-[var(--color-saffron)]" : "text-base font-semibold"}>{g.name}</span>
                <span className="text-xs tabular-nums text-[var(--fg-muted)]">{g.items.length}</span>
              </h2>
              <ul className="grid gap-x-6 md:grid-cols-2">
                {g.items.map((s) => (
                  <li key={s.slug}>
                    <Link href={songPath(s.slug)} className="group flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[var(--bg-2)]">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-2)] text-[var(--accent)] ring-1 ring-[var(--border)] group-hover:ring-[var(--accent)]">
                        <Music size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium leading-snug group-hover:text-[var(--accent)]">{s.title}</span>
                        {s.firstLine && s.firstLine.toLowerCase() !== s.title.toLowerCase() && <span className="block truncate text-sm italic text-[var(--fg-muted)]">{s.firstLine}</span>}
                        <span className="block truncate text-xs text-[var(--fg-muted)]">
                          {[mode !== "author" && s.author, mode !== "book" && s.book, mode === "book" && s.bookPlace].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {mode !== "kind" && s.kind && s.kind !== "Song" && <span className="more-badge mt-1 shrink-0">{s.kind}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {letters.length > 1 && (
        <div
          ref={rail}
          className="song-rail"
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            fromPoint(e);
          }}
          onPointerMove={(e) => drag !== null && fromPoint(e)}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
          role="navigation"
          aria-label="Jump to letter"
        >
          {letters.map((l) => (
            <button key={l} type="button" data-letter={l} onClick={() => jump(l)} className={drag === l ? "on" : ""} aria-label={`Jump to ${l}`}>
              {l}
            </button>
          ))}
          {drag && <span className="song-rail-bubble">{drag}</span>}
        </div>
      )}
    </div>
  );
}
