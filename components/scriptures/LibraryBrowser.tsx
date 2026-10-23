"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Landmark, Layers, Search, X } from "lucide-react";
import Select from "@/components/ui/Select";

// The library, organised by the reader's choice: category, section, author or A–Z.
// Each group is a collapsible panel.

export type LibBook = { code: string; title: string; titleDeva: string; author: string; verses: number; verseLabelPlural: string; category: string; section: string; /** Category position (admin order). */ order: number };
type Mode = "category" | "section" | "author" | "az";

export default function LibraryBrowser({ books }: { books: LibBook[] }) {
  const [mode, setMode] = useState<Mode>("category");
  const [q, setQ] = useState("");
  const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const shown = useMemo(() => {
    const f = plain(q.trim());
    return f ? books.filter((b) => plain(`${b.title} ${b.titleDeva} ${b.author} ${b.category} ${b.section}`).includes(f)) : books;
  }, [books, q]);
  const groups = useMemo(() => {
    const key = (b: LibBook) =>
      mode === "category" ? b.category || "Other" : mode === "section" ? b.section || "Other" : mode === "author" ? b.author || "Unknown author" : (b.title.normalize("NFD").replace(/[̀-ͯ]/g, "")[0] ?? "#").toUpperCase();
    const m = new Map<string, LibBook[]>();
    for (const b of shown) m.set(key(b), [...(m.get(key(b)) ?? []), b]);
    const out = [...m.entries()].map(([name, list]) => ({
      name,
      order: Math.min(...list.map((b) => b.order)),
      list: list.sort((a, b) => Number(b.verses > 0) - Number(a.verses > 0) || a.title.localeCompare(b.title)),
    }));
    return mode === "category" || mode === "section" ? out.sort((a, b) => a.order - b.order) : out.sort((a, b) => a.name.localeCompare(b.name));
  }, [shown, mode]);

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-semibold">
          Library <span className="text-sm font-normal text-[var(--fg-muted)]">· {books.length} books</span>
        </h2>
        <label className="ui-trigger w-full sm:w-56 !pr-2">
          <Search size={14} className="text-[var(--fg-muted)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a book or author" className="dict-noring min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Find a book" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear" className="text-[var(--fg-muted)]">
              <X size={14} />
            </button>
          )}
        </label>
        <Select
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          icon={<Layers size={15} />}
          label="Organize by"
          width={220}
          align="right"
          options={[
            { value: "category", label: "Category" },
            { value: "section", label: "Section" },
            { value: "author", label: "Author" },
            { value: "az", label: "A–Z" },
          ]}
        />
        <Link href="/scriptures/syllabus" className="ui-btn" title="The order of study given by Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura">
          <Landmark size={15} /> Śrīla Bhaktisiddhānta’s order
        </Link>
      </div>
      {q && !groups.length && <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--fg-muted)]">No book matches “{q}”.</p>}
      <div className="grid gap-2">
        {groups.map((g, i) => (
          <details key={`${mode}-${g.name}-${q ? "q" : ""}`} open={Boolean(q) || i < 3} className="group rounded-xl border border-[var(--border)] bg-[var(--bg)]">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate font-medium">{g.name}</span>
              <span className="text-xs tabular-nums text-[var(--fg-muted)]">
                {g.list.filter((b) => b.verses > 0).length ? `${g.list.filter((b) => b.verses > 0).length} ready · ` : ""}
                {g.list.length}
              </span>
              <ChevronDown size={16} className="shrink-0 text-[var(--fg-muted)] transition-transform group-open:rotate-180" />
            </summary>
            <ul className="grid border-t border-[var(--border)] p-1.5 sm:grid-cols-2">
              {g.list.map((b) => (
                <li key={b.code}>
                  <Link href={`/scriptures/${b.code}`} className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-[var(--bg-2)]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {b.title} {b.titleDeva && <span className="font-devanagari font-normal text-[var(--fg-muted)]">{b.titleDeva}</span>}
                      </span>
                      {mode !== "author" && b.author && <span className="block truncate text-xs text-[var(--fg-muted)]">{b.author}</span>}
                    </span>
                    {b.verses > 0 ? (
                      <span className="shrink-0 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[11px] font-semibold ring-1 ring-[var(--accent)]/40">{b.verses.toLocaleString()}</span>
                    ) : (
                      <span className="shrink-0 text-[11px] text-[var(--fg-muted)]">Soon</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
