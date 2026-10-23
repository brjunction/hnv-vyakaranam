"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, ChevronDown, Columns2, Copy, Check, Eye, EyeOff,
  List, NotebookPen, Share2, X, Navigation, Keyboard,
} from "lucide-react";
import { ScriptPicker, SizeControl, VersePane } from "@/components/scriptures/Panes";
import { CommentaryNav } from "@/components/scriptures/CommentaryNav";
import { useMarks, useNotes, useReaderPrefs } from "@/components/scriptures/prefs";
import {
  childrenOf, divisionPath, levelName, parseJump, readingOrder, versePath, verseRef,
  type BookInfo, type DivisionData, type TreeNode,
} from "@/lib/scriptures/core";

type Target = { path: string[]; verse?: string };

function useIsDesktop() {
  const [d, setD] = useState(true);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const f = () => setD(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return d;
}

/** Where "previous" / "next" lead, crossing chapter (and canto) boundaries. */
function neighbours(tree: TreeNode[], data: DivisionData, key: string): { prev: Target | null; next: Target | null } {
  const vs = data.verses;
  const i = vs.findIndex((v) => v.key === key);
  const order = readingOrder(tree);
  const oi = order.findIndex((n) => n.id === data.division.id);
  const edge = (n: TreeNode | undefined, last: boolean): Target | null => (n ? { path: n.path, verse: (last ? n.lastVerse : n.firstVerse) ?? undefined } : null);
  return {
    prev: i > 0 ? { path: data.division.path, verse: vs[i - 1].key } : edge(order[oi - 1], true),
    next: i >= 0 && i < vs.length - 1 ? { path: data.division.path, verse: vs[i + 1].key } : edge(order[oi + 1], false),
  };
}

const label = (t: Target | null) => (t ? [...t.path, t.verse].filter(Boolean).join(".") : "");

export default function Reader({
  book,
  tree,
  data,
  verseKey,
  embedded = false,
  onGo,
  side,
}: {
  book: BookInfo;
  tree: TreeNode[];
  data: DivisionData;
  verseKey: string;
  /** Inside the dual reader: stacked panes, navigation through onGo. */
  embedded?: boolean;
  onGo?: (t: Target) => void;
  side?: "a" | "b";
}) {
  const router = useRouter();
  const desktop = useIsDesktop();
  const [prefs, setPrefs] = useReaderPrefs();
  const bookmarks = useMarks("bookmarks");
  const history = useMarks("history");
  const { notes, save: saveNote } = useNotes();
  const verse = data.verses.find((v) => v.key === verseKey) ?? data.verses[0];
  const ref = verseRef(book, verse?.verseNo ?? "");
  const href = versePath(book.code, data.division.path, verse?.key ?? "");
  const { prev, next } = useMemo(() => neighbours(tree, data, verse?.key ?? ""), [tree, data, verse?.key]);
  const index = data.verses.findIndex((v) => v.key === verse?.key);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [copied, setCopied] = useState("");
  const [sheet, setSheet] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [jump, setJump] = useState("");
  const [jumpErr, setJumpErr] = useState(false);
  const [openVerse, setOpenVerse] = useState(true);
  const [openComm, setOpenComm] = useState(true);
  const [split, setSplit] = useState(prefs.split);
  const gridRef = useRef<HTMLDivElement>(null);
  const jumpRef = useRef<HTMLInputElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => setSplit(prefs.split), [prefs.split]);
  useEffect(() => setNoteText(notes[href]?.text ?? ""), [notes, href]);

  const go = useCallback(
    (t: Target | null) => {
      if (!t) return;
      if (onGo) return onGo(t);
      router.push(t.verse ? versePath(book.code, t.path, t.verse) : divisionPath(book.code, t.path));
    },
    [onGo, router, book.code]
  );

  // reading history ("continue reading") — page mode only
  useEffect(() => {
    if (!embedded && verse) history.push({ book: book.code, ref, href, title: book.title });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);

  // keyboard: ← → prev/next, j jump, d Devanagari, b bookmark, n note, ? help
  useEffect(() => {
    if (embedded) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") go(prev);
      else if (e.key === "ArrowRight") go(next);
      else if (e.key === "j") {
        e.preventDefault();
        if (!desktop) setSheet(true);
        setTimeout(() => jumpRef.current?.focus(), 30);
      } else if (e.key === "d") setPrefs({ showDeva: !prefs.showDeva });
      else if (e.key === "b") bookmarks.toggle({ book: book.code, ref, href, title: book.title });
      else if (e.key === "n") setNoteOpen((o) => !o);
      else if (e.key === "?") setShowKeys((s) => !s);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [embedded, go, prev, next, desktop, prefs.showDeva, setPrefs, bookmarks, book.code, book.title, ref, href]);

  if (!verse) return <p className="text-[var(--fg-muted)]">No verses here yet.</p>;

  const marked = bookmarks.has(href);
  const hasComm = data.types.some((t) => t.pane === "commentary" && t.appliesTo !== "division");
  const fontStyle = { fontSize: `${prefs.fontScale}rem` };
  const commStyle = { fontSize: `${prefs.commScale}rem` };
  const verseSize = <SizeControl value={prefs.fontScale} onChange={(v) => setPrefs({ fontScale: v })} label="verse" />;
  const commSize = <SizeControl value={prefs.commScale} onChange={(v) => setPrefs({ commScale: v })} label="commentary" />;

  async function copy(kind: "verse" | "link") {
    const url = window.location.origin + href;
    const text = kind === "link" ? url : `${ref}\n${(verse.iast || verse.devanagari).split(/\s*\/\s*/).join("\n")}\n${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(""), 1500);
    } catch {}
  }
  async function share() {
    const url = window.location.origin + href;
    if (navigator.share) {
      try {
        await navigator.share({ title: ref, url });
        return;
      } catch {}
    }
    void copy("link");
  }

  // ------------------------------------------------------------ selectors
  const pathNodes: TreeNode[] = [];
  {
    let parent: number | null = null;
    for (const k of data.division.path) {
      const n = tree.find((x) => x.parentId === parent && x.key === k);
      if (!n) break;
      pathNodes.push(n);
      parent = n.id;
    }
  }
  const firstReadable = (n: TreeNode): Target => {
    const t = readingOrder(tree).find((x) => x.path.slice(0, n.path.length).join("/") === n.path.join("/"));
    return t ? { path: t.path, verse: t.firstVerse ?? undefined } : { path: n.path };
  };
  const selectors = (
    <div className="flex flex-wrap items-center gap-2">
      {book.levels.map((lv, depth) => {
        const parentId = depth === 0 ? null : pathNodes[depth - 1]?.id;
        if (depth > 0 && parentId == null) return null;
        const opts = childrenOf(tree, parentId ?? null);
        if (!opts.length) return null;
        return (
          <label key={depth} className="inline-flex h-9 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg)] pl-3 pr-1 text-sm">
            <span className="text-[var(--fg-muted)]">{lv}</span>
            <select
              value={pathNodes[depth]?.id ?? ""}
              onChange={(e) => {
                const n = tree.find((x) => x.id === Number(e.target.value));
                if (n) go(firstReadable(n));
              }}
              className="max-w-[9rem] cursor-pointer bg-transparent pr-1 font-semibold outline-none"
              aria-label={lv}
            >
              {opts.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.number}
                  {o.title ? ` · ${o.title}` : ""}
                </option>
              ))}
            </select>
          </label>
        );
      })}
      <label className="inline-flex h-9 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg)] pl-3 pr-1 text-sm">
        <span className="text-[var(--fg-muted)]">{book.verseLabel}</span>
        <select value={verse.key} onChange={(e) => go({ path: data.division.path, verse: e.target.value })} className="cursor-pointer bg-transparent pr-1 font-semibold outline-none" aria-label={book.verseLabel}>
          {data.verses.map((v) => (
            <option key={v.key} value={v.key}>
              {v.key}
            </option>
          ))}
        </select>
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = parseJump(jump, book.levels.length, data.division.path);
          if (!t) return setJumpErr(true);
          setJumpErr(false);
          setJump("");
          setSheet(false);
          go(t.verse ? t : firstReadable(tree.find((n) => n.path.join("/") === t.path.join("/")) ?? pathNodes[0]));
        }}
      >
        <input
          ref={jumpRef}
          value={jump}
          onChange={(e) => (setJump(e.target.value), setJumpErr(false))}
          placeholder={book.levels.length > 1 ? "1.12.1" : "2.13"}
          aria-label="Jump to a verse"
          className={`h-9 w-28 rounded-full border bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--accent)] ${jumpErr ? "border-[var(--color-vermillion)]" : "border-[var(--border)]"}`}
        />
      </form>
    </div>
  );

  // --------------------------------------------------------------- panes
  const versePane = (
    <VersePane verse={verse} refLabel={ref} types={data.types} prefs={prefs} setPrefs={setPrefs} />
  );
  const noteBox = (noteOpen || noteText) && (
    <section className="mt-6 rounded-xl border border-dashed border-[var(--accent)]/60 bg-[var(--bg-2)]/60 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
          <NotebookPen size={13} /> My note
        </span>
        <span className="text-[10px] text-[var(--fg-muted)]">saved on this device</span>
      </div>
      <textarea
        value={noteText}
        autoFocus={noteOpen && !noteText}
        onChange={(e) => setNoteText(e.target.value)}
        onBlur={() => saveNote({ href, book: book.code, ref, text: noteText })}
        rows={Math.min(10, Math.max(3, noteText.split("\n").length + 1))}
        placeholder="Your own thoughts on this verse…"
        className="w-full resize-y bg-transparent text-[0.95em] outline-none"
      />
    </section>
  );
  const commPane = (
    <CommentaryNav
      bookCode={book.code}
      c={verse.c}
      types={data.types}
      prefs={prefs}
      setPrefs={setPrefs}
      variant={desktop && !embedded ? "rail" : "compact"}
      keys={!embedded}
    />
  );

  const actions = (
    <div className="flex flex-wrap items-center gap-1.5">
      <ScriptPicker prefs={prefs} setPrefs={setPrefs} compact />
      <IconBtn label={marked ? "Remove bookmark (b)" : "Bookmark (b)"} onClick={() => bookmarks.toggle({ book: book.code, ref, href, title: book.title })} active={marked}>
        {marked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
      </IconBtn>
      <IconBtn label="My note (n)" onClick={() => setNoteOpen((o) => !o)} active={Boolean(noteText) || noteOpen}>
        <NotebookPen size={16} />
      </IconBtn>
      <IconBtn label={copied === "verse" ? "Copied" : "Copy verse"} onClick={() => copy("verse")}>
        {copied === "verse" ? <Check size={16} /> : <Copy size={16} />}
      </IconBtn>
      <IconBtn label={copied === "link" ? "Link copied" : "Share"} onClick={share}>
        {copied === "link" ? <Check size={16} /> : <Share2 size={16} />}
      </IconBtn>
      {!embedded && (
        <Link href={`/scriptures/read?a=${encodeURIComponent(`${book.code}/${[...data.division.path, verse.key].join("/")}`)}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 text-sm hover:border-[var(--accent)]" title="Read two places side by side">
          <Columns2 size={16} /> <span className="hidden xl:inline">Dual</span>
        </Link>
      )}
    </div>
  );

  // -------------------------------------------------------- embedded (dual)
  if (embedded) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-3 flex flex-wrap items-center gap-2">{selectors}</div>
        <div className="mb-3">{actions}</div>
        <div className="flex-1 space-y-6">
          <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
            <div className="absolute right-3 top-3">{verseSize}</div>
            <div style={fontStyle}>
              {versePane}
              {noteBox}
            </div>
          </div>
          {hasComm && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
              <div className="mb-3 flex justify-end">{commSize}</div>
              <div style={commStyle}>{commPane}</div>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <NavBtn t={prev} dir="prev" onGo={go} />
          <span className="text-xs tabular-nums text-[var(--fg-muted)]">
            {side?.toUpperCase()} · {index + 1} / {data.verses.length}
          </span>
          <NavBtn t={next} dir="next" onGo={go} />
        </div>
      </div>
    );
  }

  const chapterHref = divisionPath(book.code, data.division.path);
  const chapterTitle = `${levelName(book, data.division.depth)} ${data.division.number}${data.division.title ? ` · ${data.division.title}` : ""}`;

  // ------------------------------------------------------------- desktop
  if (desktop) {
    const hideV = hasComm && prefs.hideVerse;
    const hideC = !hasComm || prefs.hideCommentary;
    const cols = hideV ? "0 0 1fr" : hideC ? "1fr 0 0" : `${split}% 10px 1fr`;
    return (
      <div className="pb-10">
        <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-[var(--border)] bg-[var(--bg)]/92 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {selectors}
            {actions}
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <Link href={chapterHref} className="inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
            <List size={15} /> {chapterTitle}
          </Link>
          <span className="flex items-center gap-3 text-xs text-[var(--fg-muted)]">
            {index + 1} / {data.verses.length}
            <button onClick={() => setShowKeys((s) => !s)} className="inline-flex items-center gap-1 hover:text-[var(--fg)]">
              <Keyboard size={13} /> shortcuts
            </button>
          </span>
        </div>
        {showKeys && <KeysHelp onClose={() => setShowKeys(false)} />}
        <div ref={gridRef} className={`grid items-start ${hasComm ? "" : "mx-auto max-w-4xl"}`} style={{ gridTemplateColumns: cols }}>
          <section className={`${hideV ? "hidden" : ""} min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow-lift)]`}>
            <PaneHead title={book.verseLabel} size={verseSize} onHide={hasComm ? () => setPrefs({ hideVerse: true, hideCommentary: false }) : undefined} />
            <div className="p-6 xl:p-8" style={fontStyle}>
              {versePane}
              {noteBox}
            </div>
          </section>
          <div
            className={`${hideV || hideC ? "hidden" : ""} group relative h-full cursor-col-resize select-none`}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panes"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setPrefs({ split: Math.max(25, split - 3) });
              if (e.key === "ArrowRight") setPrefs({ split: Math.min(75, split + 3) });
            }}
            onPointerDown={(e) => {
              const box = gridRef.current?.getBoundingClientRect();
              if (!box) return;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              let last = split;
              const move = (ev: PointerEvent) => {
                last = Math.min(75, Math.max(25, ((ev.clientX - box.left) / box.width) * 100));
                setSplit(last);
              };
              const up = () => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
                setPrefs({ split: Math.round(last) });
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
            }}
            onDoubleClick={() => setPrefs({ split: 44 })}
          >
            <span className="absolute inset-y-6 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-[var(--border)] transition-colors group-hover:bg-[var(--accent)]" />
          </div>
          <section className={`${hideC ? "hidden" : ""} min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow-lift)] lg:sticky lg:top-32`}>
            <PaneHead title="Commentary" size={commSize} onHide={() => setPrefs({ hideCommentary: true, hideVerse: false })} />
            <div className="max-h-[calc(100vh-11rem)] overflow-y-auto p-6 xl:p-8" style={commStyle}>
              {commPane}
            </div>
          </section>
        </div>
        {hasComm && (hideV || hideC) && (
          <button onClick={() => setPrefs({ hideVerse: false, hideCommentary: false })} className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]">
            <Eye size={15} /> Show {hideV ? book.verseLabel.toLowerCase() : "commentary"} pane
          </button>
        )}
        <div className="mt-8 flex items-center justify-between gap-3">
          <NavBtn t={prev} dir="prev" onGo={go} />
          <NavBtn t={next} dir="next" onGo={go} />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- mobile
  const both = hasComm && openVerse && openComm;
  return (
    <div className="pb-28">
      <div className="sticky top-16 z-20 -mx-4 mb-4 flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg)]/95 px-4 py-2 backdrop-blur">
        <button onClick={() => setSheet(true)} className="inline-flex min-h-[44px] items-center gap-1.5 font-semibold" aria-label="Choose location">
          {ref} <ChevronDown size={16} />
        </button>
        <div className="flex items-center gap-1">
          <ScriptPicker prefs={prefs} setPrefs={setPrefs} compact />
          <IconBtn label={marked ? "Remove bookmark" : "Bookmark"} onClick={() => bookmarks.toggle({ book: book.code, ref, href, title: book.title })} active={marked}>
            {marked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </IconBtn>
          <IconBtn label="More" onClick={() => setSheet(true)}>
            <Navigation size={16} />
          </IconBtn>
        </div>
      </div>

      <section
        className="mb-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)]"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const s = touch.current;
          touch.current = null;
          if (!s || window.getSelection()?.toString()) return;
          const dx = e.changedTouches[0].clientX - s.x;
          const dy = e.changedTouches[0].clientY - s.y;
          if (Math.abs(dx) > 60 && Math.abs(dy) < 45) go(dx < 0 ? next : prev);
        }}
      >
        <div className="flex min-h-[44px] items-center justify-between gap-2 px-4">
          <button onClick={() => setOpenVerse((o) => !o)} className="flex flex-1 items-center gap-1.5 py-2 text-left text-sm font-semibold" aria-expanded={openVerse}>
            <ChevronDown size={16} className={`transition-transform ${openVerse ? "" : "-rotate-90"}`} /> {book.verseLabel}
          </button>
          {openVerse && verseSize}
        </div>
        {openVerse && (
          <div className={`px-4 pb-5 ${both ? "max-h-[50dvh] overflow-y-auto" : ""}`} style={fontStyle}>
            {versePane}
            {noteBox}
          </div>
        )}
      </section>
      <section className={`${hasComm ? "" : "hidden"} overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)]`}>
        <div className="flex min-h-[44px] items-center justify-between gap-2 px-4">
          <button onClick={() => setOpenComm((o) => !o)} className="flex flex-1 items-center gap-1.5 py-2 text-left text-sm font-semibold" aria-expanded={openComm}>
            <ChevronDown size={16} className={`transition-transform ${openComm ? "" : "-rotate-90"}`} /> Commentary
          </button>
          {openComm && commSize}
        </div>
        {openComm && (
          <div className={`px-4 pb-5 ${both ? "max-h-[50dvh] overflow-y-auto" : ""}`} style={commStyle}>
            {commPane}
          </div>
        )}
      </section>

      {/* sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--bg)]/95 px-3 pt-2 backdrop-blur" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2">
          <button onClick={() => go(prev)} disabled={!prev} className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-full px-3 text-sm disabled:opacity-30">
            <ArrowLeft size={18} /> Prev
          </button>
          <Link href={chapterHref} className="text-sm tabular-nums text-[var(--fg-muted)]">
            {index + 1} / {data.verses.length}
          </Link>
          <button onClick={() => go(next)} disabled={!next} className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-full px-3 text-sm disabled:opacity-30">
            Next <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* bottom sheet: location, tools */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setSheet(false)}>
          <div className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-[var(--bg)] p-5 shadow-2xl" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">{book.title}</span>
              <button onClick={() => setSheet(false)} className="p-2" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Go to</p>
            {selectors}
            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Reading</p>
            {actions}
            <Link href={chapterHref} className="mt-5 inline-flex items-center gap-1.5 text-sm underline">
              <List size={15} /> Whole chapter
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${active ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--fg)]" : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]"}`}
    >
      {children}
    </button>
  );
}

function PaneHead({ title, onHide, size }: { title: string; onHide?: () => void; size?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-2">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--fg-muted)]">{title}</span>
      <span className="flex items-center gap-2">
        {size}
        {onHide && <HideBtn onHide={onHide} />}
      </span>
    </div>
  );
}

function HideBtn({ onHide }: { onHide: () => void }) {
  return (
    <>
      <button onClick={onHide} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]" title="Hide this pane">
        <EyeOff size={13} /> Hide
      </button>
    </>
  );
}

function NavBtn({ t, dir, onGo }: { t: Target | null; dir: "prev" | "next"; onGo: (t: Target) => void }) {
  if (!t) return <span />;
  return (
    <button
      onClick={() => onGo(t)}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm transition-colors hover:border-[var(--accent)]"
    >
      {dir === "prev" && <ArrowLeft size={16} />}
      {label(t)}
      {dir === "next" && <ArrowRight size={16} />}
    </button>
  );
}

function KeysHelp({ onClose }: { onClose: () => void }) {
  const keys: [string, string][] = [
    ["← / →", "previous / next verse"],
    ["j", "jump to a verse"],
    ["d", "show / hide Devanagari"],
    ["b", "bookmark"],
    ["n", "my note"],
    ["?", "this help"],
  ];
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[var(--border)] bg-[var(--bg-2)] px-4 py-3 text-sm">
      {keys.map(([k, v]) => (
        <span key={k}>
          <kbd className="rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 text-xs">{k}</kbd> {v}
        </span>
      ))}
      <button onClick={onClose} className="ml-auto text-[var(--fg-muted)]" aria-label="Close">
        <X size={15} />
      </button>
    </div>
  );
}
