"use client";

import { addDevanagari, buildTermMap, toHnvTerms, type TermMap } from "@/lib/dict/hnv-terms";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookA, Search, X, ArrowLeft, Loader2, Library, ChevronDown, Check, Star, Link2, ChevronsDownUp, ChevronsUpDown,
  AArrowDown, AArrowUp, History, Layers, CheckCheck, Eraser,
} from "lucide-react";

type Hit = { headword: string; deva: string; match: "exact" | "prefix" | "similar" | "contains" | "meaning"; dicts: string[] };
type DictInfo = { slug: string; name: string; shortName: string; category: string; section: string; sectionSort: number; words: number };
type Article = { dict: string; dictName: string; category: string; section: string; sectionSort: number; source: string; headword: string; html: string };
/** One card: every entry of one WORK (all its files) for this word, senses numbered. */
type Card = { key: string; title: string; work: string; section: string; sectionSort: number; source: string; senses: { html: string; headword: string; dict: string }[]; dicts: string[] };

/** Loose text key so the same sense from two copies of a work is shown once. */
const senseKey = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
type Entry = { headword: string; deva: string; entries: Article[] };

const MATCH_LABEL: Record<Hit["match"], string> = { exact: "", prefix: "", similar: "similar", contains: "compound", meaning: "meaning" };
const LS = { scope: "hnv-dict-scope", recent: "hnv-dict-recent", stars: "hnv-dict-stars", size: "hnv-dict-size" };

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

// ---------------------------------------------------------------- scope
function ScopePicker({ dicts, scope, setScope }: { dicts: DictInfo[]; scope: string[]; setScope: (s: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [closedCats, setClosedCats] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const all = scope.length === 0;
  const none = scope[0] === "__none__";
  const isOn = (slug: string) => all || scope.includes(slug);
  const groups = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const m = new Map<string, DictInfo[]>();
    for (const d of dicts) {
      if (f && !`${d.name} ${d.category} ${d.section}`.toLowerCase().includes(f)) continue;
      const g = d.section || "Other";
      const list = m.get(g) ?? [];
      list.push(d);
      m.set(g, list);
    }
    const order = (g: string) => dicts.find((d) => (d.section || "Other") === g)?.sectionSort ?? 1e6;
    return [...m.entries()].sort((a, b) => order(a[0]) - order(b[0]));
  }, [dicts, filter]);

  const set = (slugs: string[]) => setScope(slugs.length === dicts.length ? [] : slugs.length ? slugs : ["__none__"]);
  const toggle = (slug: string) => {
    const cur = all ? dicts.map((d) => d.slug) : scope.filter((s) => s !== "__none__");
    set(cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]);
  };
  const toggleCat = (list: DictInfo[]) => {
    const cur = all ? dicts.map((d) => d.slug) : scope.filter((s) => s !== "__none__");
    const allOn = list.every((d) => cur.includes(d.slug));
    set(allOn ? cur.filter((s) => !list.some((d) => d.slug === s)) : [...new Set([...cur, ...list.map((d) => d.slug)])]);
  };

  const label = none ? "Choose dictionaries" : all ? `All dictionaries` : scope.length === 1 ? dicts.find((d) => d.slug === scope[0])?.name ?? "1 dictionary" : `${scope.length} dictionaries`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-11 max-w-[16rem] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 text-sm shadow-sm transition-colors hover:bg-[var(--bg-2)]"
      >
        <Library size={16} className="shrink-0 text-[var(--accent)]" />
        <span className="truncate">{label}</span>
        {!all && !none && <span className="rounded-full bg-[var(--accent)]/15 px-1.5 text-xs text-[var(--accent)]">{scope.length}</span>}
        <ChevronDown size={15} className={`shrink-0 text-[var(--fg-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] p-2">
            <Search size={15} className="ml-1.5 text-[var(--fg-muted)]" />
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Find a dictionary…"
              className="dict-noring h-8 flex-1 bg-transparent text-sm"
            />
            <button onClick={() => setScope([])} className="rounded-md px-2 py-1 text-xs hover:bg-[var(--bg-2)]" title="Search all dictionaries">
              <CheckCheck size={14} className="inline mr-1" />
              All
            </button>
            <button onClick={() => setScope(["__none__"])} className="rounded-md px-2 py-1 text-xs hover:bg-[var(--bg-2)]" title="Clear selection">
              <Eraser size={14} className="inline mr-1" />
              None
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {groups.map(([cat, list]) => {
              const on = list.filter((d) => isOn(d.slug)).length;
              const closed = closedCats.has(cat) && !filter;
              return (
                <div key={cat} className="mb-1">
                  <div className="flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-[var(--bg-2)]">
                    <button
                      onClick={() => setClosedCats((c) => (c.has(cat) ? new Set([...c].filter((x) => x !== cat)) : new Set([...c, cat])))}
                      className="p-1 text-[var(--fg-muted)]"
                      aria-label={closed ? `Open ${cat}` : `Close ${cat}`}
                    >
                      <ChevronDown size={14} className={`transition-transform ${closed ? "-rotate-90" : ""}`} />
                    </button>
                    <button onClick={() => toggleCat(list)} className="flex flex-1 items-center gap-2 text-left">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          on === list.length ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--color-ink)]" : on ? "border-[var(--accent)] bg-[var(--accent)]/30" : "border-[var(--border)]"
                        }`}
                      >
                        {on === list.length && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="text-[13px] font-semibold text-[var(--color-saffron)]">{cat}</span>
                      <span className="ml-auto text-xs text-[var(--fg-muted)]">
                        {on}/{list.length}
                      </span>
                    </button>
                  </div>
                  {!closed &&
                    list.map((d) => (
                      <div key={d.slug} className="group flex items-center gap-2 rounded-lg py-1.5 pl-9 pr-2 hover:bg-[var(--bg-2)]">
                        <button onClick={() => toggle(d.slug)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm">
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isOn(d.slug) ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--color-ink)]" : "border-[var(--border)]"}`}>
                            {isOn(d.slug) && <Check size={11} strokeWidth={3} />}
                          </span>
                          <span className="truncate">{d.name}</span>
                        </button>
                        <span className="shrink-0 text-[11px] text-[var(--fg-muted)] group-hover:hidden">{d.words.toLocaleString()}</span>
                        <button onClick={() => setScope([d.slug])} className="hidden shrink-0 rounded px-1.5 text-[11px] text-[var(--accent)] hover:underline group-hover:block">
                          only
                        </button>
                      </div>
                    ))}
                </div>
              );
            })}
            {!groups.length && <p className="p-4 text-center text-sm text-[var(--fg-muted)]">No dictionary matches.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- article
function WorkCard({ c, open, onToggle, id, terms }: { c: Card; open: boolean; onToggle: () => void; id: string; terms?: TermMap | null }) {
  const fix = (h: string) => (terms ? toHnvTerms(h, terms) : h);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [tall, setTall] = useState(false);
  useEffect(() => {
    if (open && bodyRef.current) setTall(bodyRef.current.scrollHeight > 620);
  }, [open, c]);
  const n = c.senses.length;
  return (
    <section id={id} className="dict-card scroll-mt-24">
      <button onClick={onToggle} aria-expanded={open} className="dict-card-head">
        <ChevronDown size={16} className={`shrink-0 text-[var(--fg-muted)] transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{c.title}</span>
        </span>
        {n > 1 && <span className="dict-count">{n} senses</span>}
      </button>
      {open && (
        <div className="dict-card-body">
          <div ref={bodyRef} className={`relative ${tall && !full ? "max-h-[600px] overflow-hidden" : ""}`}>
            {n === 1 ? (
              <div className="dict-article leading-relaxed" dangerouslySetInnerHTML={{ __html: fix(c.senses[0].html) }} />
            ) : (
              <ol className="dict-senses">
                {c.senses.map((x, i) => (
                  <li key={i}>
                    <span className="dict-sense-n">{i + 1}</span>
                    <div className="dict-article min-w-0 leading-relaxed" dangerouslySetInnerHTML={{ __html: fix(x.html) }} />
                  </li>
                ))}
              </ol>
            )}
          </div>
          {tall && (
            <div className={`${full ? "mt-3" : "-mt-16 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/90 to-transparent pt-14"} relative`}>
              <button onClick={() => setFull((f) => !f)} className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs font-medium shadow-sm hover:border-[var(--accent)]">
                {full ? "Show less" : "Show the whole entry"}
              </button>
            </div>
          )}
          {(c.source || c.dicts.length > 1) && (
            <p className="mt-4 text-xs text-[var(--fg-muted)]">
              {c.source}
              {c.source && c.dicts.length > 1 ? " · " : ""}
              {c.dicts.length > 1 ? `merged from ${c.dicts.length} files of ${c.work}` : ""}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- page
export default function DictionaryApp() {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [mode, setMode] = useState<"word" | "meaning">(sp.get("mode") === "meaning" ? "meaning" : "word");
  const [dicts, setDicts] = useState<DictInfo[]>([]);
  const [scope, setScopeState] = useState<string[]>([]);
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [entryLoading, setEntryLoading] = useState(false);
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<string>("all");
  const [mobileEntry, setMobileEntry] = useState(false);
  const [ready, setReady] = useState(false);
  // "HNV terms": Pāṇini's grammatical terms in the entries shown as Śrīla Jīva Gosvāmī's
  const [hnvOn, setHnvOn] = useState(false);
  const [hnvTerms, setHnvTerms] = useState<TermMap | null>(null);
  useEffect(() => {
    try {
      setHnvOn(localStorage.getItem("hnv:dict-hnv-terms") === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("hnv:dict-hnv-terms", hnvOn ? "1" : "0");
    } catch {}
    if (!hnvOn) return setHnvTerms(null);
    let live = true;
    addDevanagari(buildTermMap()).then((m) => live && setHnvTerms(m));
    return () => {
      live = false;
    };
  }, [hnvOn]);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [stars, setStars] = useState<string[]>([]);
  const [size, setSize] = useState(1);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const entryAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    setScopeState(load<string[]>(LS.scope, []));
    setRecent(load<string[]>(LS.recent, []));
    setStars(load<string[]>(LS.stars, []));
    setSize(load<number>(LS.size, 1));
  }, []);
  const setScope = (s: string[]) => {
    setScopeState(s);
    save(LS.scope, s);
  };
  const scopeParam = scope.length ? `&d=${encodeURIComponent(scope.join(","))}` : "";

  const openEntry = useCallback(
    async (headword: string, opts: { push?: boolean; mobile?: boolean } = {}) => {
      entryAbort.current?.abort();
      const ac = new AbortController();
      entryAbort.current = ac;
      setEntryLoading(true);
      if (opts.mobile !== false) setMobileEntry(true);
      const u = new URL(window.location.href);
      u.searchParams.set("w", headword);
      if (opts.push) window.history.pushState({ w: headword }, "", u.toString());
      else window.history.replaceState({ w: headword }, "", u.toString());
      try {
        const res = await fetch(`/api/dict/entry?h=${encodeURIComponent(headword)}${scopeParam}`, { signal: ac.signal });
        const data = (await res.json()) as Entry;
        setEntry(data);
        setOpenSet(new Set(["__first__"]));
        if (data.entries?.length) {
          setRecent((r) => {
            const next = [headword, ...r.filter((x) => x !== headword)].slice(0, 12);
            save(LS.recent, next);
            return next;
          });
        }
      } catch {
        /* aborted */
      } finally {
        if (!ac.signal.aborted) setEntryLoading(false);
      }
    },
    [scopeParam]
  );

  // search as you type
  useEffect(() => {
    const t = setTimeout(async () => {
      searchAbort.current?.abort();
      const ac = new AbortController();
      searchAbort.current = ac;
      const u = new URL(window.location.href);
      if (q) u.searchParams.set("q", q);
      else u.searchParams.delete("q");
      if (mode === "meaning") u.searchParams.set("mode", "meaning");
      else u.searchParams.delete("mode");
      window.history.replaceState(window.history.state, "", u.toString());
      setLoading(Boolean(q.trim()));
      try {
        const url = `/api/dict/search?q=${encodeURIComponent(q)}&mode=${mode}${scopeParam}`;
        let res = await fetch(url, { signal: ac.signal });
        if (!res.ok) res = await fetch(url, { signal: ac.signal }); // one quiet retry
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { results: Hit[]; dictionaries: DictInfo[]; note?: string; translated?: { from: string; text: string } };
        setFailed(false);
        if (data.dictionaries) setDicts(data.dictionaries);
        setHits(q.trim() ? data.results ?? [] : []);
        setNote(
          mode === "meaning" && q.trim()
            ? `${data.translated ? `Searched for “${data.translated.text}” (translated from ${data.translated.from}). ` : ""}${data.note ?? ""}`
            : ""
        );
        setActive(0);
        setReady(true);
        const first = data.results?.[0];
        if (q.trim() && first && first.match === "exact") void openEntry(first.headword, { mobile: false });
      } catch {
        if (!ac.signal.aborted) setFailed(true); // aborted searches are replaced by a newer one
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, q ? (mode === "meaning" ? 350 : 170) : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, mode, scopeParam]);

  // deep link + back button
  useEffect(() => {
    const w = sp.get("w");
    if (w) void openEntry(w, { mobile: false });
    const onPop = () => {
      const w2 = new URL(window.location.href).searchParams.get("w");
      if (w2) void openEntry(w2, { mobile: true });
      else setMobileEntry(false);
    };
    window.addEventListener("popstate", onPop);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
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
    } else if (e.key === "Enter" && hits[active]) void openEntry(hits[active].headword, { push: true });
    else if (e.key === "Escape") setQ("");
  }
  function onArticleClick(e: React.MouseEvent) {
    const a = (e.target as HTMLElement).closest("a");
    if (a?.dataset.word) {
      e.preventDefault();
      const w = new URL(a.href).searchParams.get("q") ?? a.textContent ?? "";
      setQ(w);
      void openEntry(w, { push: true });
    }
  }
  function onArticleDblClick() {
    const w = window.getSelection()?.toString().trim();
    if (w && w.length < 60 && !/\s/.test(w)) {
      setQ(w);
      void openEntry(w, { push: true });
    }
  }

  // ONE card per work (all of its files), grouped by section, senses numbered and de-duplicated
  const cards = useMemo(() => {
    if (!entry) return [] as Card[];
    const out: Card[] = [];
    for (const e of entry.entries) {
      const key = `${e.section}::${e.category || e.dict}`;
      let c = out.find((x) => x.key === key);
      if (!c) {
        c = { key, title: e.dictName, work: e.category || e.dictName, section: e.section || "Other", sectionSort: e.sectionSort ?? 1e6, source: e.source, senses: [], dicts: [] };
        out.push(c);
      }
      if (!c.dicts.includes(e.dict)) c.dicts.push(e.dict);
      const k = senseKey(e.html);
      if (k && !c.senses.some((x) => senseKey(x.html) === k)) c.senses.push({ html: e.html, headword: e.headword, dict: e.dict });
    }
    return out.sort((a, b) => a.sectionSort - b.sectionSort);
  }, [entry]);
  const tabs = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards) m.set(c.section, (m.get(c.section) ?? 0) + 1);
    return [...m.entries()];
  }, [cards]);
  useEffect(() => {
    if (tab !== "all" && !tabs.some(([t]) => t === tab)) setTab("all");
  }, [tabs, tab]);
  const shownCards = tab === "all" ? cards : cards.filter((c) => c.section === tab);
  const isOpen = (c: Card, i: number) => openSet.has(c.key) || (openSet.has("__first__") && i < 3 && !openSet.has(`-${c.key}`));
  const toggleCard = (c: Card, i: number) =>
    setOpenSet((o) => {
      const n = new Set(o);
      if (isOpen(c, i)) {
        n.delete(c.key);
        n.add(`-${c.key}`);
      } else {
        n.add(c.key);
        n.delete(`-${c.key}`);
      }
      return n;
    });

  const starred = entry ? stars.includes(entry.headword) : false;
  const toggleStar = () => {
    if (!entry) return;
    const next = starred ? stars.filter((s) => s !== entry.headword) : [entry.headword, ...stars].slice(0, 100);
    setStars(next);
    save(LS.stars, next);
  };
  const setFont = (v: number) => {
    const n = Math.min(1.4, Math.max(0.85, Math.round(v * 100) / 100));
    setSize(n);
    save(LS.size, n);
  };
  const totalWords = dicts.reduce((n, d) => n + d.words, 0);
  const noDicts = ready && dicts.length === 0;
  const chip = "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs shadow-sm transition-colors hover:bg-[var(--bg-2)]";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      {/* heading */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)]">Tools · Dictionary</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Sanskrit Dictionary</h1>
          {dicts.length > 0 && (
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              {dicts.length} dictionaries · {totalWords.toLocaleString()} headwords · type in any script
            </p>
          )}
        </div>
      </div>

      {/* search bar */}
      <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 py-3 backdrop-blur sm:relative sm:top-auto sm:mx-0 sm:rounded-2xl sm:border sm:bg-[var(--bg-2)]/60 sm:p-3 sm:shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" size={18} />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder={mode === "word" ? "कृष्ण · kṛṣṇa · kRShNa · krishna" : "heart, knowledge, हृदय, ज्ञान, ছাত্র…  (any language)"}
              className="dict-noring h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] pl-10 pr-20 text-base shadow-sm outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_20%,transparent)]"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Search the dictionary"
            />
            <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              {loading ? (
                <Loader2 className="animate-spin text-[var(--fg-muted)]" size={16} />
              ) : q ? (
                <button onClick={() => setQ("")} aria-label="Clear" className="rounded-md p-1 text-[var(--fg-muted)] hover:text-[var(--fg)]">
                  <X size={16} />
                </button>
              ) : (
                <kbd className="hidden rounded border border-[var(--border)] px-1.5 text-[11px] text-[var(--fg-muted)] sm:inline">/</kbd>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHnvOn((v) => !v)}
              aria-pressed={hnvOn}
              title="Show Pāṇini’s grammatical terms in the entries as Śrīla Jīva Gosvāmī’s (Harināmāmṛta) terms — hover a term for Pāṇini’s"
              className={`h-11 rounded-xl border px-3 text-sm shadow-sm ${hnvOn ? "border-[var(--accent)] bg-[var(--accent)] font-medium text-[var(--color-ink)]" : "border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
            >
              HNV terms
            </button>
            <ScopePicker dicts={dicts} scope={scope} setScope={setScope} />
            <div className="inline-flex h-11 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1 text-sm shadow-sm">
              {(["word", "meaning"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-lg px-3 transition-colors ${mode === m ? "bg-[var(--accent)] font-medium text-[var(--color-ink)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
                >
                  {m === "word" ? "Word" : "Meaning"}
                </button>
              ))}
            </div>
          </div>
        </div>
        {note && <p className="mt-2 text-xs text-[var(--fg-muted)]">{note}</p>}
        {failed && <p className="mt-2 text-xs text-red-600">The search did not answer. Please try again in a moment.</p>}
      </div>

      {noDicts ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
          <BookA className="mx-auto mb-3 text-[var(--fg-muted)]" size={30} strokeWidth={1.5} />
          <p className="mb-1 font-medium">The dictionaries are being added.</p>
          <p className="text-sm text-[var(--fg-muted)]">They will be searchable here shortly.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[17rem_1fr] lg:grid-cols-[19rem_1fr]">
          {/* results */}
          <aside className={mobileEntry ? "hidden md:block" : ""}>
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-sm md:sticky md:top-20">
              {!q.trim() ? (
                <div className="p-4">
                  {stars.length > 0 && (
                    <>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-saffron)]">
                        <Star size={13} /> Starred
                      </p>
                      <div className="mb-5 flex flex-wrap gap-1.5">
                        {stars.slice(0, 20).map((w) => (
                          <button key={w} onClick={() => (setQ(w), void openEntry(w, { push: true }))} className={chip}>
                            {w}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {recent.length > 0 ? (
                    <>
                      <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--color-saffron)]">
                        <span className="flex items-center gap-1.5">
                          <History size={13} /> Recent
                        </span>
                        <button onClick={() => (setRecent([]), save(LS.recent, []))} className="font-normal normal-case tracking-normal text-[var(--fg-muted)] hover:text-[var(--fg)]">
                          Clear
                        </button>
                      </p>
                      <ul className="grid gap-0.5">
                        {recent.map((w) => (
                          <li key={w}>
                            <button onClick={() => (setQ(w), void openEntry(w, { push: true }))} className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[var(--bg-2)]">
                              {w}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--fg-muted)]">Start typing to search. Your recent and starred words appear here.</p>
                  )}
                </div>
              ) : hits.length === 0 && !loading ? (
                <p className="p-5 text-sm text-[var(--fg-muted)]">No matches. Try fewer letters, another spelling, or all dictionaries.</p>
              ) : (
                <>
                  <p className="border-b border-[var(--border)] px-4 py-2 text-xs text-[var(--fg-muted)]">{hits.length} results</p>
                  <ol ref={listRef} className="max-h-[68vh] overflow-y-auto p-1.5" role="listbox" aria-label="Results">
                    {hits.map((h, i) => {
                      const selected = entry?.headword.toLowerCase() === h.headword.toLowerCase();
                      return (
                        <li key={h.headword} data-i={i}>
                          <button
                            onClick={() => (setActive(i), void openEntry(h.headword, { push: true }))}
                            role="option"
                            aria-selected={selected}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                              selected ? "bg-[var(--accent)]/15" : i === active ? "bg-[var(--bg-2)]" : "hover:bg-[var(--bg-2)]"
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              {h.deva && <span className="mr-2 font-devanagari text-[1.05rem] leading-tight">{h.deva}</span>}
                              <span className="text-sm italic text-[var(--fg-muted)]">{h.headword}</span>
                            </span>
                            {MATCH_LABEL[h.match] && <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--fg-muted)]">{MATCH_LABEL[h.match]}</span>}
                            <span className="shrink-0 rounded-full bg-[var(--bg-2)] px-1.5 text-[10px] tabular-nums text-[var(--fg-muted)]" title={`${h.dicts.length} dictionaries`}>
                              {h.dicts.length}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </>
              )}
            </div>
          </aside>

          {/* entry */}
          <div className={mobileEntry ? "" : "hidden md:block"}>
            <button
              onClick={() => (window.history.state?.w ? window.history.back() : setMobileEntry(false))}
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] md:hidden"
            >
              <ArrowLeft size={16} /> Back to results
            </button>
            {!entry && !entryLoading ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--fg-muted)]">
                <BookA className="mx-auto mb-3" size={28} strokeWidth={1.5} />
                Choose a word to read its entries.
              </div>
            ) : (
              <article className={`transition-opacity ${entryLoading ? "opacity-50" : ""}`}>
                {entry && (
                  <>
                    <header className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-2)]/60 p-5 shadow-sm sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          {entry.deva && <h2 className="font-devanagari text-4xl leading-tight sm:text-5xl">{entry.deva}</h2>}
                          <p className={entry.deva ? "text-xl italic text-[var(--fg-muted)]" : "text-3xl font-semibold"}>{entry.headword}</p>
                          <p className="mt-2 text-xs text-[var(--fg-muted)]">
                            Found in {cards.length} dictionar{cards.length === 1 ? "y" : "ies"}
                            {tabs.length > 1 ? ` · ${tabs.length} sections` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={toggleStar} className={chip} title={starred ? "Remove star" : "Star this word"}>
                            <Star size={14} className={starred ? "fill-[var(--accent)] text-[var(--accent)]" : ""} /> {starred ? "Starred" : "Star"}
                          </button>
                          <button
                            onClick={async () => {
                              await navigator.clipboard?.writeText(window.location.href).catch(() => {});
                              setCopied(true);
                              setTimeout(() => setCopied(false), 1500);
                            }}
                            className={chip}
                          >
                            <Link2 size={14} /> {copied ? "Copied" : "Link"}
                          </button>
                          <button onClick={() => setFont(size - 0.08)} className={chip} aria-label="Smaller text">
                            <AArrowDown size={15} />
                          </button>
                          <button onClick={() => setFont(size + 0.08)} className={chip} aria-label="Larger text">
                            <AArrowUp size={15} />
                          </button>
                        </div>
                      </div>
                    </header>

                    {cards.length === 0 ? (
                      <p className="text-[var(--fg-muted)]">No entry found for this word in the chosen dictionaries.</p>
                    ) : (
                      <>
                        {/* section tabs */}
                        <div className="dict-tabs mb-4" role="tablist" aria-label="Sections">
                          <button role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")}>
                            All <span>{cards.length}</span>
                          </button>
                          {tabs.map(([t, n]) => (
                            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                              {t} <span>{n}</span>
                            </button>
                          ))}
                          <span className="ml-auto flex gap-1.5">
                            <button onClick={() => setOpenSet(new Set(cards.map((c) => c.key)))} className={chip} title="Open all">
                              <ChevronsUpDown size={14} />
                            </button>
                            <button onClick={() => setOpenSet(new Set(cards.map((c) => `-${c.key}`)))} className={chip} title="Close all">
                              <ChevronsDownUp size={14} />
                            </button>
                          </span>
                        </div>

                        <div className="space-y-6" style={{ fontSize: `${size}rem` }} onClick={onArticleClick} onDoubleClick={onArticleDblClick}>
                          {(tab === "all" ? tabs.map(([t]) => t) : [tab]).map((sec) => (
                            <div key={sec}>
                              {tab === "all" && tabs.length > 1 && (
                                <h3 className="dict-sec-head">
                                  <Layers size={14} /> {sec}
                                </h3>
                              )}
                              <div className="space-y-2.5">
                                {shownCards
                                  .filter((c) => c.section === sec)
                                  .map((c) => {
                                    const i = cards.indexOf(c);
                                    return <WorkCard key={c.key} id={`card-${i}`} c={c} open={isOpen(c, i)} onToggle={() => toggleCard(c, i)} terms={hnvTerms} />;
                                  })}
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="mt-4 text-xs text-[var(--fg-muted)]">Tip: double-click any word in an entry to look it up · press / to search.</p>
                      </>
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
