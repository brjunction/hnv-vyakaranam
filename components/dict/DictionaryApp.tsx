"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookA, Search, X, ArrowLeft, Loader2, Languages } from "lucide-react";

type Hit = { headword: string; deva: string; match: "exact" | "prefix" | "similar" | "contains" | "meaning"; dicts: string[] };
type DictInfo = { slug: string; name: string; shortName: string };
type Entry = { headword: string; deva: string; entries: { dict: string; dictName: string; source: string; headword: string; html: string }[] };

const MATCH_LABEL: Record<Hit["match"], string> = {
  exact: "",
  prefix: "",
  similar: "similar",
  contains: "in compound",
  meaning: "meaning",
};

function setUrl(params: Record<string, string>) {
  const u = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v) u.searchParams.set(k, v);
    else u.searchParams.delete(k);
  }
  window.history.replaceState(null, "", u.toString());
}

export default function DictionaryApp() {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [mode, setMode] = useState<"word" | "meaning">(sp.get("mode") === "meaning" ? "meaning" : "word");
  const [dicts, setDicts] = useState<DictInfo[]>([]);
  const [only, setOnly] = useState<string[]>([]);
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [entryLoading, setEntryLoading] = useState(false);
  const [mobileEntry, setMobileEntry] = useState(false);
  const [ready, setReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const entryAbort = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const openEntry = useCallback(
    async (headword: string, focusMobile = true) => {
      entryAbort.current?.abort();
      const ac = new AbortController();
      entryAbort.current = ac;
      setEntryLoading(true);
      if (focusMobile) setMobileEntry(true);
      setUrl({ w: headword });
      try {
        const res = await fetch(`/api/dict/entry?h=${encodeURIComponent(headword)}${only.length ? `&d=${only.join(",")}` : ""}`, { signal: ac.signal });
        const data = (await res.json()) as Entry;
        setEntry(data);
      } catch {
        /* aborted */
      } finally {
        if (!ac.signal.aborted) setEntryLoading(false);
      }
    },
    [only]
  );

  // Search as you type
  useEffect(() => {
    const t = setTimeout(async () => {
      searchAbort.current?.abort();
      const ac = new AbortController();
      searchAbort.current = ac;
      setUrl({ q, mode: mode === "meaning" ? "meaning" : "" });
      setLoading(Boolean(q.trim()));
      try {
        const res = await fetch(`/api/dict/search?q=${encodeURIComponent(q)}&mode=${mode}${only.length ? `&d=${only.join(",")}` : ""}`, { signal: ac.signal });
        const data = (await res.json()) as { results: Hit[]; dictionaries: DictInfo[] };
        if (!dicts.length && data.dictionaries) setDicts(data.dictionaries);
        setHits(q.trim() ? data.results ?? [] : []);
        setActive(0);
        setReady(true);
        const first = data.results?.[0];
        if (q.trim() && first && (first.match === "exact" || !sp.get("w"))) void openEntry(first.headword, false);
      } catch {
        /* aborted */
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, q ? 160 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, mode, only.join(",")]);

  // Deep link to a word
  useEffect(() => {
    const w = sp.get("w");
    if (w) void openEntry(w, false);
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && hits[active]) {
      void openEntry(hits[active].headword);
    } else if (e.key === "Escape") {
      setQ("");
    }
  }

  // Cross-references and double-click lookup inside articles
  function onArticleClick(e: React.MouseEvent) {
    const a = (e.target as HTMLElement).closest("a");
    if (a?.dataset.word) {
      e.preventDefault();
      const w = new URL(a.href).searchParams.get("q") ?? a.textContent ?? "";
      setQ(w);
      void openEntry(w);
    }
  }
  function onArticleDblClick() {
    const w = window.getSelection()?.toString().trim();
    if (w && w.length < 60 && !/\s/.test(w)) {
      setQ(w);
      void openEntry(w);
    }
  }

  const noDicts = ready && dicts.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-5 pt-8 pb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-2">Tools · Dictionary</p>
          <h1 className="text-2xl sm:text-3xl font-semibold">Sanskrit Dictionary</h1>
        </div>
        <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-2)] p-1 text-sm">
          {(["word", "meaning"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 transition-colors ${mode === m ? "bg-[var(--accent)] text-[var(--color-ink)] font-medium" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
            >
              {m === "word" ? "Sanskrit word" : "English meaning"}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" size={20} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder={mode === "word" ? "कृष्ण · kṛṣṇa · kRShNa · krishna" : "heart, knowledge, grammar…"}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] py-4 pl-12 pr-12 text-lg shadow-sm outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_18%,transparent)]"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Search the dictionary"
        />
        {loading ? (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[var(--fg-muted)]" size={18} />
        ) : (
          q && (
            <button onClick={() => setQ("")} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[var(--fg-muted)] hover:text-[var(--fg)]">
              <X size={18} />
            </button>
          )
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[var(--fg-muted)]">
        <Languages size={14} />
        <span>Type in Devanagari, IAST, ITRANS, Harvard-Kyoto or plain letters.</span>
        {dicts.length > 1 &&
          dicts.map((d) => {
            const on = only.includes(d.slug);
            return (
              <button
                key={d.slug}
                onClick={() => setOnly((o) => (on ? o.filter((x) => x !== d.slug) : [...o, d.slug]))}
                title={d.name}
                className={`rounded-full border px-2.5 py-0.5 transition-colors ${on ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--accent)]"}`}
              >
                {d.shortName}
              </button>
            );
          })}
      </div>

      {noDicts ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
          <BookA className="mx-auto mb-3 text-[var(--fg-muted)]" size={30} strokeWidth={1.5} />
          <p className="font-medium mb-1">The dictionaries are being added.</p>
          <p className="text-sm text-[var(--fg-muted)]">Monier-Williams and others will be searchable here shortly.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[18rem_1fr] lg:grid-cols-[20rem_1fr]">
          {/* results */}
          <div className={`${mobileEntry ? "hidden md:block" : ""}`}>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] md:sticky md:top-20">
              {!q.trim() ? (
                <p className="p-5 text-sm text-[var(--fg-muted)]">Start typing to search {dicts.length ? `${dicts.length} dictionar${dicts.length === 1 ? "y" : "ies"}` : ""}.</p>
              ) : hits.length === 0 && !loading ? (
                <p className="p-5 text-sm text-[var(--fg-muted)]">No matches. Try fewer letters or another spelling.</p>
              ) : (
                <ol ref={listRef} className="max-h-[70vh] overflow-y-auto p-1.5" role="listbox" aria-label="Results">
                  {hits.map((h, i) => {
                    const selected = entry?.headword.toLowerCase() === h.headword.toLowerCase();
                    return (
                      <li key={h.headword} data-i={i}>
                        <button
                          onClick={() => {
                            setActive(i);
                            void openEntry(h.headword);
                          }}
                          role="option"
                          aria-selected={selected}
                          className={`flex w-full items-baseline gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
                            selected ? "bg-[var(--accent)]/15" : i === active ? "bg-[var(--bg-2)]" : "hover:bg-[var(--bg-2)]"
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            {h.deva && <span className="font-devanagari text-lg leading-tight mr-2">{h.deva}</span>}
                            <span className="text-sm italic text-[var(--fg-muted)]">{h.headword}</span>
                          </span>
                          {MATCH_LABEL[h.match] && <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--fg-muted)]">{MATCH_LABEL[h.match]}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>

          {/* article */}
          <div className={`${mobileEntry ? "" : "hidden md:block"}`}>
            <button onClick={() => setMobileEntry(false)} className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] md:hidden">
              <ArrowLeft size={16} /> Results
            </button>
            {!entry && !entryLoading ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--fg-muted)]">
                <BookA className="mx-auto mb-3" size={28} strokeWidth={1.5} />
                Choose a word to read its entry.
              </div>
            ) : (
              <article className={`transition-opacity ${entryLoading ? "opacity-50" : ""}`} onClick={onArticleClick} onDoubleClick={onArticleDblClick}>
                {entry && (
                  <>
                    <header className="mb-5">
                      {entry.deva && <h2 className="font-devanagari text-4xl sm:text-5xl leading-tight">{entry.deva}</h2>}
                      <p className={`${entry.deva ? "text-xl italic text-[var(--fg-muted)]" : "text-3xl font-semibold"}`}>{entry.headword}</p>
                    </header>
                    {entry.entries.length === 0 ? (
                      <p className="text-[var(--fg-muted)]">No entry found for this word.</p>
                    ) : (
                      <div className="space-y-4">
                        {entry.entries.map((en, k) => (
                          <section key={k} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)]/60 p-5 sm:p-6">
                            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-saffron)]">{en.dictName}</p>
                              {en.headword.toLowerCase() !== entry.headword.toLowerCase() && (
                                <p className="text-xs text-[var(--fg-muted)]">{en.headword}</p>
                              )}
                            </div>
                            <div className="dict-article leading-relaxed" dangerouslySetInnerHTML={{ __html: en.html }} />
                            {en.source && <p className="mt-4 text-xs text-[var(--fg-muted)]">{en.source}</p>}
                          </section>
                        ))}
                        <p className="text-xs text-[var(--fg-muted)]">Tip: double-click any word in an entry to look it up.</p>
                      </div>
                    )}
                  </>
                )}
              </article>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
