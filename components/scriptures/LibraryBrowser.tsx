"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronsDownUp, ChevronsUpDown, Landmark, Layers, Search, X } from "lucide-react";
import Select from "@/components/ui/Select";

// The library, one SECTION at a time (Primary scriptures, Gauḍīya …): pick a
// section tab, optionally narrow to one category, or search everything.
// Sections are tinted bands, categories are cards with a tinted header, so
// the structure is visible at a glance.

export type LibBook = {
  code: string;
  title: string;
  titleDeva: string;
  author: string;
  verses: number;
  verseLabelPlural: string;
  category: string;
  section: string;
  /** Category position (admin order). */
  order: number;
};

type View = "sections" | "author" | "az";
const KEY = "hnv:library";
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function BookRow({ b, sub }: { b: LibBook; sub?: string }) {
  const ready = b.verses > 0;
  const line = sub ?? b.author;
  return (
    <li>
      <Link href={`/scriptures/${b.code}`} className={`lib-book ${ready ? "ready" : ""}`}>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">{b.title}</span>
            {b.titleDeva && <span className="font-devanagari text-sm text-[var(--fg-muted)]">{b.titleDeva}</span>}
          </span>
          {line && <span className="block truncate text-xs text-[var(--fg-muted)]">{line}</span>}
        </span>
        {ready ? (
          <span className="lib-ready" title={`${b.verses.toLocaleString()} ${b.verseLabelPlural.toLowerCase()}`}>
            <BookOpen size={11} /> {b.verses.toLocaleString()}
          </span>
        ) : (
          <span className="shrink-0 text-[11px] text-[var(--fg-muted)]">Soon</span>
        )}
      </Link>
    </li>
  );
}

function CategoryCard({ name, books, open, onToggle }: { name: string; books: LibBook[]; open: boolean; onToggle: () => void }) {
  const ready = books.filter((b) => b.verses > 0).length;
  return (
    <div className="lib-cat">
      <button type="button" onClick={onToggle} aria-expanded={open} className="lib-cat-head">
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className="text-xs font-normal tabular-nums text-[var(--fg-muted)]">
          {ready ? `${ready} ready · ` : ""}
          {books.length}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-[var(--fg-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="grid p-1.5 sm:grid-cols-2">
          {books.map((b) => (
            <BookRow key={b.code} b={b} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LibraryBrowser({ books }: { books: LibBook[] }) {
  const [view, setView] = useState<View>("sections");
  const [q, setQ] = useState("");
  const [sec, setSec] = useState<string>("");
  const [cat, setCat] = useState<string>("all");
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());

  // sections → categories, in admin order
  const tree = useMemo(() => {
    const secs: { name: string; order: number; cats: { name: string; order: number; books: LibBook[] }[] }[] = [];
    for (const b of books) {
      const sName = b.section || "Other";
      const cName = b.category || "Other";
      let s = secs.find((x) => x.name === sName);
      if (!s) secs.push((s = { name: sName, order: b.order, cats: [] }));
      s.order = Math.min(s.order, b.order);
      let c = s.cats.find((x) => x.name === cName);
      if (!c) s.cats.push((c = { name: cName, order: b.order, books: [] }));
      c.books.push(b);
    }
    for (const s of secs) {
      s.cats.sort((a, b) => a.order - b.order);
      for (const c of s.cats) c.books.sort((a, b) => Number(b.verses > 0) - Number(a.verses > 0) || a.title.localeCompare(b.title));
    }
    return secs.sort((a, b) => a.order - b.order);
  }, [books]);

  // remember the reader's last section and view
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      if (v.view === "sections" || v.view === "author" || v.view === "az") setView(v.view);
      if (v.sec && (v.sec === "all" || tree.some((s) => s.name === v.sec))) setSec(v.sec);
    } catch {}
  }, [tree]);
  const current = sec || (tree.length > 1 ? "all" : tree[0]?.name) || "all";
  const remember = (patch: { view?: View; sec?: string }) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ view, sec: current, ...patch }));
    } catch {}
  };
  const pickSec = (s: string) => {
    setSec(s);
    setCat("all");
    setOpenCats(new Set());
    remember({ sec: s });
  };

  const f = plain(q.trim());
  const matches = useMemo(() => (f ? books.filter((b) => plain(`${b.title} ${b.titleDeva} ${b.author} ${b.category} ${b.section}`).includes(f)) : []), [books, f]);
  const shownSecs = current === "all" ? tree : tree.filter((s) => s.name === current);
  const catOptions = current === "all" ? [] : tree.find((s) => s.name === current)?.cats ?? [];
  const allKeys = view === "sections" ? shownSecs.flatMap((s) => s.cats.map((c) => `${s.name}::${c.name}`)) : [];
  // one section: all its categories open; "All": only the first two
  const isOpen = (key: string, i: number) => openCats.has(key) || (!openCats.has(`-${key}`) && (cat !== "all" || current !== "all" || i < 2));
  const toggleCat = (key: string, i: number) =>
    setOpenCats((o) => {
      const n = new Set(o);
      if (isOpen(key, i)) {
        n.delete(key);
        n.add(`-${key}`);
      } else {
        n.add(key);
        n.delete(`-${key}`);
      }
      return n;
    });

  const flat = (list: LibBook[], by: "author" | "az") => {
    const m = new Map<string, LibBook[]>();
    for (const b of list) {
      const k = by === "author" ? b.author || "Unknown author" : (plain(b.title)[0] ?? "#").toUpperCase();
      m.set(k, [...(m.get(k) ?? []), b]);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };

  return (
    <section className="mb-8">
      {/* toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-semibold">
          Library <span className="text-sm font-normal text-[var(--fg-muted)]">· {books.length} books</span>
        </h2>
        <label className="ui-trigger w-full sm:w-64 !pr-2">
          <Search size={14} className="text-[var(--fg-muted)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a book or author" className="dict-noring min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Search the library" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear" className="text-[var(--fg-muted)]">
              <X size={14} />
            </button>
          )}
        </label>
        <Select
          value={view}
          onChange={(v) => {
            setView(v as View);
            remember({ view: v as View });
          }}
          icon={<Layers size={15} />}
          label="View"
          width={200}
          align="right"
          searchable={false}
          options={[
            { value: "sections", label: "By section" },
            { value: "author", label: "By author" },
            { value: "az", label: "A–Z" },
          ]}
        />
        <Link href="/scriptures/syllabus" className="ui-btn" title="The order of study given by Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura">
          <Landmark size={15} /> Bhaktisiddhānta’s order
        </Link>
      </div>

      {f ? (
        matches.length ? (
          <div className="lib-cat">
            <p className="lib-cat-head !cursor-default">
              {matches.length} match{matches.length === 1 ? "" : "es"} for “{q}”
            </p>
            <ul className="grid p-1.5 sm:grid-cols-2">
              {matches.map((b) => (
                <BookRow key={b.code} b={b} sub={[b.author, b.category].filter(Boolean).join(" · ")} />
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--fg-muted)]">No book matches “{q}”.</p>
        )
      ) : view === "sections" ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="lib-tabs" role="tablist" aria-label="Sections">
              {tree.length > 1 && (
                <button role="tab" aria-selected={current === "all"} onClick={() => pickSec("all")}>
                  All scriptures <span>{books.length}</span>
                </button>
              )}
              {tree.map((s) => (
                <button key={s.name} role="tab" aria-selected={current === s.name} onClick={() => pickSec(s.name)}>
                  {s.name} <span>{s.cats.reduce((n, c) => n + c.books.length, 0)}</span>
                </button>
              ))}
            </div>
            <span className="ml-auto flex gap-1.5">
              <button type="button" onClick={() => setOpenCats(new Set(allKeys))} className="ui-btn ui-btn-sm" title="Open every category">
                <ChevronsUpDown size={14} /> Expand all
              </button>
              <button type="button" onClick={() => setOpenCats(new Set(allKeys.map((k) => `-${k}`)))} className="ui-btn ui-btn-sm" title="Close every category">
                <ChevronsDownUp size={14} /> Collapse all
              </button>
            </span>
            {catOptions.length > 1 && (
              <Select
                value={cat}
                onChange={setCat}
                label="Category"
                width={260}
                align="right"
                searchable={catOptions.length > 8}
                options={[{ value: "all", label: "All categories" }, ...catOptions.map((c) => ({ value: c.name, label: c.name, badge: String(c.books.length) }))]}
              />
            )}
          </div>

          <div className="grid gap-6">
            {shownSecs.map((s) => (
              <div key={s.name} className="lib-sec">
                <div className="lib-sec-head">
                  <span className="lib-sec-bar" aria-hidden />
                  <span className="text-base font-semibold sm:text-lg">{s.name}</span>
                  <span className="text-xs tabular-nums text-[var(--fg-muted)]">
                    {s.cats.length} categor{s.cats.length === 1 ? "y" : "ies"} · {s.cats.reduce((n, c) => n + c.books.length, 0)} books
                  </span>
                </div>
                <div className="grid gap-2.5 p-2.5 sm:p-3">
                  {s.cats
                    .filter((c) => cat === "all" || c.name === cat)
                    .map((c, i) => {
                      const key = `${s.name}::${c.name}`;
                      return <CategoryCard key={key} name={c.name} books={c.books} open={isOpen(key, i)} onToggle={() => toggleCat(key, i)} />;
                    })}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="lib-sec">
          <div className="grid gap-2.5 p-2.5 sm:p-3">
            {flat(books, view === "author" ? "author" : "az").map(([k, list], i) => (
              <CategoryCard key={`${view}-${k}`} name={k} books={list} open={isOpen(`${view}-${k}`, i)} onToggle={() => toggleCat(`${view}-${k}`, i)} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
