"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Columns2, Layers, Search, Settings2, Star, X } from "lucide-react";
import { RichIn } from "@/components/scriptures/ScriptText";
import type { ReaderPrefs } from "@/components/scriptures/prefs";
import type { CommentaryType, ScriptName } from "@/lib/scriptures/core";

// The commentary navigator — built for books with 20+ commentaries.
//  rail:    a side list (filter, available-here dots, ★ favourites, hide)
//           next to the text; "Read all" and "Compare" views; [ / ] keys.
//  compact: one searchable selector (mobile, chapter list, dual reader).
// The Anvaya and the Translation are not here: they belong to the verse.

type SetPrefs = (p: Partial<ReaderPrefs>) => void;
const LANG: Record<string, string> = { sanskrit: "Sanskrit", english: "English", bengali: "Bengali", hindi: "Hindi", nepali: "Nepali", odia: "Odia", other: "" };

function useOrdered(bookCode: string, types: CommentaryType[], c: Record<number, string>, prefs: ReaderPrefs, manage: boolean) {
  return useMemo(() => {
    const favs = prefs.favs[bookCode] ?? [];
    const hidden = new Set(prefs.hidden[bookCode] ?? []);
    const list = types.filter((t) => t.pane === "commentary" && t.appliesTo !== "division");
    const visible = manage ? list : list.filter((t) => !hidden.has(t.key));
    const ordered = [...visible].sort((a, b) => {
      const fa = favs.indexOf(a.key);
      const fb = favs.indexOf(b.key);
      if (fa >= 0 || fb >= 0) return (fa < 0 ? 1e3 : fa) - (fb < 0 ? 1e3 : fb);
      return 0;
    });
    const available = ordered.filter((t) => c[t.id]);
    return { all: list, ordered, available, favs, hidden };
  }, [bookCode, types, c, prefs.favs, prefs.hidden, manage]);
}

function Body({ t, html, script }: { t: CommentaryType; html?: string; script: ScriptName }) {
  return html ? (
    <RichIn html={html} english={t.language === "english"} script={script} className="leading-relaxed" />
  ) : (
    <p className="text-sm italic text-[var(--fg-muted)]">{t.name} has no text for this verse yet.</p>
  );
}

function Head({ t, fav, onFav }: { t: CommentaryType; fav: boolean; onFav: () => void }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
      <div className="min-w-0">
        <h3 className="text-lg font-semibold leading-snug">
          {t.name}
          {t.nameDeva && <span className="ml-2 font-devanagari text-base font-normal text-[var(--fg-muted)]">{t.nameDeva}</span>}
        </h3>
        <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
          {t.author}
          {t.author && LANG[t.language] ? " · " : ""}
          {LANG[t.language]}
        </p>
      </div>
      <button onClick={onFav} title={fav ? "Remove from favourites" : "Add to favourites (shown first)"} aria-pressed={fav} className="shrink-0 rounded-full p-1.5 hover:bg-[var(--bg-2)]">
        <Star size={17} className={fav ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--fg-muted)]"} />
      </button>
    </header>
  );
}

function Item({
  t, has, active, fav, hidden, manage, onPick, onFav, onHide,
}: {
  t: CommentaryType; has: boolean; active: boolean; fav: boolean; hidden: boolean; manage: boolean;
  onPick: () => void; onFav: () => void; onHide: () => void;
}) {
  return (
    <li className="group relative">
      <button
        onClick={manage ? onHide : onPick}
        aria-current={active ? "true" : undefined}
        className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${active ? "bg-[var(--accent)]/18 ring-1 ring-[var(--accent)]/50" : "hover:bg-[var(--bg-2)]"} ${hidden ? "opacity-45" : ""}`}
      >
        {manage ? (
          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${hidden ? "border-[var(--border)]" : "border-[var(--accent)] bg-[var(--accent)] text-[var(--color-ink)]"}`}>{!hidden && <Check size={11} strokeWidth={3} />}</span>
        ) : (
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${has ? "bg-[var(--accent)]" : "border border-[var(--fg-muted)]/50"}`} title={has ? "Has text for this verse" : "Nothing for this verse"} />
        )}
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm ${active ? "font-semibold" : ""} ${has || manage ? "" : "text-[var(--fg-muted)]"}`}>{t.name}</span>
          {t.author && <span className="block truncate text-[11px] text-[var(--fg-muted)]">{t.author}</span>}
        </span>
        {fav && !manage && <Star size={12} className="mt-1 shrink-0 fill-[var(--accent)] text-[var(--accent)]" />}
      </button>
      {!manage && (
        <button onClick={onFav} title={fav ? "Unfavourite" : "Favourite"} className="absolute right-1.5 top-1.5 hidden rounded p-1 hover:bg-[var(--bg)] group-hover:block">
          <Star size={13} className={fav ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--fg-muted)]"} />
        </button>
      )}
    </li>
  );
}

export function CommentaryNav({
  bookCode, c, types, prefs, setPrefs, variant = "rail", keys = false,
}: {
  bookCode: string; c: Record<number, string>; types: CommentaryType[]; prefs: ReaderPrefs; setPrefs: SetPrefs;
  variant?: "rail" | "compact"; keys?: boolean;
}) {
  const [manage, setManage] = useState(false);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [compare, setCompare] = useState<string | null>(null);
  const [local, setLocal] = useState<string | null>(null);
  const { all, ordered, available, favs, hidden } = useOrdered(bookCode, types, c, prefs, manage);
  const onlyAvail = prefs.onlyAvail && !manage;
  const f = filter.trim().toLowerCase();
  const listed = (onlyAvail ? available : ordered).filter((t) => !f || `${t.name} ${t.author} ${t.nameDeva}`.toLowerCase().includes(f));

  // current: the remembered one if it has text here, else the first available
  const remembered = local ?? prefs.tab[bookCode];
  const current =
    remembered === "all"
      ? "all"
      : ordered.find((t) => t.key === remembered && (c[t.id] || local))?.key ?? available[0]?.key ?? ordered[0]?.key ?? "all";
  const pick = (k: string) => {
    setLocal(k);
    setOpen(false);
    setPrefs({ tab: { ...prefs.tab, [bookCode]: k } });
  };
  const toggleFav = (k: string) => setPrefs({ favs: { ...prefs.favs, [bookCode]: favs.includes(k) ? favs.filter((x) => x !== k) : [...favs, k] } });
  const toggleHide = (k: string) => {
    const h = prefs.hidden[bookCode] ?? [];
    setPrefs({ hidden: { ...prefs.hidden, [bookCode]: h.includes(k) ? h.filter((x) => x !== k) : [...h, k] } });
  };
  const nav = (dir: 1 | -1) => {
    const seq = (available.length ? available : ordered).map((t) => t.key);
    const i = seq.indexOf(current);
    const n = seq[(i + dir + seq.length) % seq.length];
    if (n) pick(n);
  };
  const navRef = useRef(nav);
  navRef.current = nav;
  useEffect(() => {
    if (!keys) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      if (e.key === "]") navRef.current(1);
      if (e.key === "[") navRef.current(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keys]);

  if (!all.length) return null;
  const cur = ordered.find((t) => t.key === current);
  const cmp = compare ? ordered.find((t) => t.key === compare) : null;

  const readAll = (
    <div>
      <nav className="mb-6 flex flex-wrap gap-1.5" aria-label="In this view">
        {available.map((t) => (
          <a key={t.key} href={`#cm-${t.key}`} className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs hover:border-[var(--accent)]">
            {t.name}
          </a>
        ))}
      </nav>
      <div className="space-y-10">
        {(available.length ? available : ordered).map((t) => (
          <section key={t.key} id={`cm-${t.key}`} className="scroll-mt-40">
            <Head t={t} fav={favs.includes(t.key)} onFav={() => toggleFav(t.key)} />
            <Body t={t} html={c[t.id]} script={prefs.script} />
          </section>
        ))}
      </div>
    </div>
  );

  const content =
    current === "all" ? (
      readAll
    ) : cur ? (
      <div className={cmp ? "grid gap-8 2xl:grid-cols-2" : ""}>
        <section>
          <Head t={cur} fav={favs.includes(cur.key)} onFav={() => toggleFav(cur.key)} />
          <Body t={cur} html={c[cur.id]} script={prefs.script} />
        </section>
        {cmp && (
          <section className="2xl:border-l 2xl:border-[var(--border)] 2xl:pl-8">
            <Head t={cmp} fav={favs.includes(cmp.key)} onFav={() => toggleFav(cmp.key)} />
            <Body t={cmp} html={c[cmp.id]} script={prefs.script} />
          </section>
        )}
      </div>
    ) : null;

  const toolbar = (
    <div className="mb-5 flex flex-wrap items-center gap-1.5">
      {available.length > 1 && (
        <>
          <button onClick={() => nav(-1)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] hover:border-[var(--accent)]" aria-label="Previous commentary ([)" title="Previous commentary  [">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => nav(1)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] hover:border-[var(--accent)]" aria-label="Next commentary (])" title="Next commentary  ]">
            <ChevronRight size={15} />
          </button>
        </>
      )}
      <button
        onClick={() => pick(current === "all" ? available[0]?.key ?? ordered[0]?.key : "all")}
        aria-pressed={current === "all"}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs ${current === "all" ? "border-[var(--accent)] bg-[var(--accent)]/15" : "border-[var(--border)] hover:border-[var(--accent)]"}`}
      >
        <Layers size={13} /> Read all{available.length ? ` (${available.length})` : ""}
      </button>
      {current !== "all" && ordered.length > 1 && (
        <label className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs ${compare ? "border-[var(--accent)] bg-[var(--accent)]/15" : "border-[var(--border)]"}`}>
          <Columns2 size={13} />
          <select value={compare ?? ""} onChange={(e) => setCompare(e.target.value || null)} className="max-w-[10rem] bg-transparent outline-none" aria-label="Compare with">
            <option value="">Compare…</option>
            {ordered
              .filter((t) => t.key !== current)
              .map((t) => (
                <option key={t.key} value={t.key}>
                  {c[t.id] ? "● " : "○ "}
                  {t.name}
                </option>
              ))}
          </select>
          {compare && (
            <button onClick={() => setCompare(null)} aria-label="Stop comparing">
              <X size={12} />
            </button>
          )}
        </label>
      )}
    </div>
  );

  const listUi = (
    <>
      {all.length > 6 && (
        <label className="relative mb-2 block">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter commentaries" className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] pl-8 pr-2 text-xs outline-none focus:border-[var(--accent)]" />
        </label>
      )}
      {!manage && (
        <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-[var(--bg-2)] p-0.5 text-[11px]">
          {([true, false] as const).map((v) => (
            <button key={String(v)} onClick={() => setPrefs({ onlyAvail: v })} className={`rounded-md py-1 ${prefs.onlyAvail === v ? "bg-[var(--bg)] font-semibold shadow-sm" : "text-[var(--fg-muted)]"}`}>
              {v ? `Here (${available.length})` : `All (${ordered.length})`}
            </button>
          ))}
        </div>
      )}
      <ul className="grid gap-0.5">
        {listed.map((t) => (
          <Item
            key={t.key}
            t={t}
            has={Boolean(c[t.id])}
            active={!manage && current === t.key}
            fav={favs.includes(t.key)}
            hidden={hidden.has(t.key)}
            manage={manage}
            onPick={() => pick(t.key)}
            onFav={() => toggleFav(t.key)}
            onHide={() => toggleHide(t.key)}
          />
        ))}
        {!listed.length && <li className="px-2.5 py-3 text-xs text-[var(--fg-muted)]">{onlyAvail ? "No commentary has text for this verse yet." : "No match."}</li>}
      </ul>
      <button onClick={() => setManage((m) => !m)} className="mt-3 inline-flex items-center gap-1.5 px-2.5 text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <Settings2 size={12} /> {manage ? "Done" : "Choose which to show"}
      </button>
    </>
  );

  // ------------------------------------------------------------ compact
  if (variant === "compact") {
    return (
      <div>
        <div className="relative mb-4">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-left hover:border-[var(--accent)]"
          >
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">
                Commentary · {available.length} of {all.length} here
              </span>
              <span className="block truncate font-semibold">{current === "all" ? "All commentaries" : cur?.name}</span>
            </span>
            <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg)] p-2 shadow-[var(--shadow-lift)]">
              {listUi}
            </div>
          )}
        </div>
        {available.length > 1 && <div className="-mt-2">{toolbar}</div>}
        {content}
      </div>
    );
  }

  // --------------------------------------------------------------- rail
  return (
    <div className="@container">
      <div className="grid gap-6 @[36rem]:grid-cols-[12.5rem_1fr]">
        <aside className="hidden @[36rem]:block">
          <div className="sticky top-0 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--fg-muted)]">Commentaries</p>
            {listUi}
          </div>
        </aside>
        <div className="min-w-0">
          <div className="@[36rem]:hidden">
            <CommentaryNav bookCode={bookCode} c={c} types={types} prefs={prefs} setPrefs={setPrefs} variant="compact" />
          </div>
          <div className="hidden @[36rem]:block">
            {toolbar}
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
