"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Columns2, Copy, Eye, EyeOff, Keyboard, List, Share2, X } from "lucide-react";
import { ScriptPicker, SizeControl, VersePane } from "@/components/scriptures/Panes";
import { CommentaryNav } from "@/components/scriptures/CommentaryNav";
import { useMarks, useReaderPrefs } from "@/components/scriptures/prefs";
import Select from "@/components/ui/Select";
import {
  childrenOf, divisionPath, levelName, parseJump, readingOrder, versePath, verseRef,
  type BookInfo, type DivisionData, type TreeNode,
} from "@/lib/scriptures/core";
import DictButton from "@/components/DictButton";

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
  const history = useMarks("history");
  const verse = data.verses.find((v) => v.key === verseKey) ?? data.verses[0];
  const ref = verseRef(book, verse?.verseNo ?? "");
  const href = versePath(book.code, data.division.path, verse?.key ?? "");
  const { prev, next } = useMemo(() => neighbours(tree, data, verse?.key ?? ""), [tree, data, verse?.key]);
  const index = data.verses.findIndex((v) => v.key === verse?.key);
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

  const go = useCallback(
    (t: Target | null) => {
      if (!t) return;
      if (onGo) return onGo(t);
      router.push(t.verse ? versePath(book.code, t.path, t.verse) : divisionPath(book.code, t.path));
    },
    [onGo, router, book.code]
  );

  // "Continue reading" (one place per book) — page mode only
  useEffect(() => {
    if (!embedded && verse) history.push({ book: book.code, ref, href, title: book.title });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);

  // keyboard: ← → prev/next, j jump, d Devanagari, [ ] commentary, ? help
  useEffect(() => {
    if (embedded) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") go(prev);
      else if (e.key === "ArrowRight") go(next);
      else if (e.key === "j") {
        e.preventDefault();
        if (!desktop) setSheet(true);
        setTimeout(() => jumpRef.current?.focus(), 30);
      } else if (e.key === "d") setPrefs({ showDeva: !prefs.showDeva });
      else if (e.key === "?") setShowKeys((s) => !s);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [embedded, go, prev, next, desktop, prefs.showDeva, setPrefs]);

  if (!verse) return <p className="text-[var(--fg-muted)]">No verses here yet.</p>;

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
        const cur = pathNodes[depth];
        return (
          <Select
            key={depth}
            label={lv}
            value={String(cur?.id ?? "")}
            onChange={(v) => {
              const n = tree.find((x) => x.id === Number(v));
              if (n) go(firstReadable(n));
            }}
            options={opts.map((o) => ({
              value: String(o.id),
              label: `${o.number}${o.title ? ` · ${o.title}` : ""}`,
              short: o.number,
              sub: o.subtitle || undefined,
              dot: o.verses > 0 || o.hasBody || childrenOf(tree, o.id).length ? "on" : "off",
            }))}
            width={340}
          />
        );
      })}
      <Select
        label={book.verseLabel}
        value={verse.key}
        onChange={(v) => go({ path: data.division.path, verse: v })}
        options={data.verses.map((v) => ({ value: v.key, label: v.key, sub: (v.iast || v.devanagari).split(/\s*\/\s*/)[0]?.slice(0, 48) }))}
        width={300}
        searchable={data.verses.length > 12}
      />
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
          placeholder={`Go to ${book.levels.length > 1 ? "1.12.1" : "2.13"}`}
          aria-label="Jump to a verse"
          className={`ui-trigger w-32 !pr-3 outline-none placeholder:text-[var(--fg-muted)] ${jumpErr ? "!border-[var(--color-vermillion)]" : ""}`}
        />
      </form>
    </div>
  );

  const actions = (
    <div className="flex flex-wrap items-center gap-1.5">
      <ScriptPicker prefs={prefs} setPrefs={setPrefs} />
      <DictButton />
      <button type="button" onClick={() => copy("verse")} className="ui-icon-btn" title={copied === "verse" ? "Copied" : "Copy verse"} aria-label="Copy verse">
        {copied === "verse" ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <button type="button" onClick={share} className="ui-icon-btn" title={copied === "link" ? "Link copied" : "Share"} aria-label="Share">
        {copied === "link" ? <Check size={16} /> : <Share2 size={16} />}
      </button>
      {!embedded && (
        <Link href={`/scriptures/read?a=${encodeURIComponent(`${book.code}/${[...data.division.path, verse.key].join("/")}`)}`} className="ui-btn" title="Read two places side by side">
          <Columns2 size={16} /> Dual
        </Link>
      )}
    </div>
  );

  const versePane = <VersePane verse={verse} refLabel={ref} types={data.types} prefs={prefs} setPrefs={setPrefs} />;
  const commPane = <CommentaryNav bookCode={book.code} c={verse.c} types={data.types} prefs={prefs} setPrefs={setPrefs} keys={!embedded} />;

  // -------------------------------------------------------- embedded (dual)
  if (embedded) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-3">{selectors}</div>
        <div className="mb-3">{actions}</div>
        <div className="flex-1 space-y-5">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
            <div className="mb-3 flex justify-end">{verseSize}</div>
            <div style={fontStyle}>{versePane}</div>
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
    const cols = hideV ? "0 0 1fr" : hideC ? "1fr 0 0" : `${split}% 14px 1fr`;
    return (
      <div className="pb-10">
        <div className="sticky top-16 z-20 -mx-4 mb-5 border-b border-[var(--border)] bg-[var(--bg)]/92 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {selectors}
            {actions}
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Link href={chapterHref} className="ui-btn ui-btn-sm max-w-full">
            <List size={14} /> <span className="truncate">{chapterTitle}</span>
          </Link>
          <span className="flex items-center gap-3 text-xs text-[var(--fg-muted)]">
            <span className="tabular-nums">
              {book.verseLabel} {index + 1} of {data.verses.length}
            </span>
            <button onClick={() => setShowKeys((s) => !s)} className="ui-btn ui-btn-sm">
              <Keyboard size={13} /> Shortcuts
            </button>
          </span>
        </div>
        {showKeys && <KeysHelp onClose={() => setShowKeys(false)} />}
        <div ref={gridRef} className={`grid items-start ${hasComm ? "" : "mx-auto max-w-4xl"}`} style={{ gridTemplateColumns: cols }}>
          <section className={`${hideV ? "hidden" : ""} min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow-lift)]`}>
            <PaneHead title={book.verseLabel} size={verseSize} onHide={hasComm ? () => setPrefs({ hideVerse: true, hideCommentary: false }) : undefined} />
            <div className="p-6 xl:p-8" style={fontStyle}>
              {versePane}
            </div>
          </section>
          <div
            className={`${hideV || hideC ? "hidden" : ""} group relative h-full min-h-40 cursor-col-resize select-none`}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panes"
            tabIndex={0}
            title="Drag to resize · double-click to reset"
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
            onDoubleClick={() => setPrefs({ split: 46 })}
          >
            <span className="absolute inset-y-8 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-[var(--border)] transition-colors group-hover:bg-[var(--accent)]" />
          </div>
          <section className={`${hideC ? "hidden" : ""} min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow-lift)] lg:sticky lg:top-32`}>
            <PaneHead title="Commentary" size={commSize} onHide={() => setPrefs({ hideCommentary: true, hideVerse: false })} />
            <div className="max-h-[calc(100vh-11rem)] overflow-y-auto p-6 xl:p-8" style={commStyle}>
              {commPane}
            </div>
          </section>
        </div>
        {hasComm && (hideV || hideC) && (
          <button onClick={() => setPrefs({ hideVerse: false, hideCommentary: false })} className="ui-btn mt-4">
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
        <button onClick={() => setSheet(true)} className="ui-btn !h-10 font-semibold" aria-label="Choose location">
          {ref} <ChevronDown size={16} />
        </button>
        <ScriptPicker prefs={prefs} setPrefs={setPrefs} />
        <DictButton />
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
        <div className="flex min-h-[48px] items-center justify-between gap-2 px-4">
          <button onClick={() => setOpenVerse((o) => !o)} className="flex flex-1 items-center gap-1.5 py-2 text-left text-sm font-semibold" aria-expanded={openVerse}>
            <ChevronDown size={16} className={`transition-transform ${openVerse ? "" : "-rotate-90"}`} /> {book.verseLabel}
          </button>
          {openVerse && verseSize}
        </div>
        {openVerse && (
          <div className={`px-4 pb-5 ${both ? "max-h-[50dvh] overflow-y-auto" : ""}`} style={fontStyle}>
            {versePane}
          </div>
        )}
      </section>
      {hasComm && (
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)]">
          <div className="flex min-h-[48px] items-center justify-between gap-2 px-4">
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
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--bg)]/95 px-3 pt-2 backdrop-blur" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2">
          <button onClick={() => go(prev)} disabled={!prev} className="ui-btn !h-11 min-w-[44px]">
            <ArrowLeft size={18} /> Prev
          </button>
          <Link href={chapterHref} className="text-sm tabular-nums text-[var(--fg-muted)]">
            {index + 1} / {data.verses.length}
          </Link>
          <button onClick={() => go(next)} disabled={!next} className="ui-btn !h-11 min-w-[44px]">
            Next <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setSheet(false)}>
          <div className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-[var(--bg)] p-5 shadow-2xl" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">{book.title}</span>
              <button onClick={() => setSheet(false)} className="ui-icon-btn" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="mb-2 text-sm font-medium text-[var(--fg-muted)]">Go to</p>
            {selectors}
            <p className="mb-2 mt-5 text-sm font-medium text-[var(--fg-muted)]">Reading</p>
            {actions}
            <Link href={chapterHref} className="ui-btn mt-5">
              <List size={15} /> Whole chapter
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function PaneHead({ title, onHide, size }: { title: string; onHide?: () => void; size?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-2.5">
      <span className="text-sm font-medium text-[var(--fg)]">{title}</span>
      <span className="flex items-center gap-2">
        {size}
        {onHide && (
          <button onClick={onHide} className="ui-btn ui-btn-sm" title="Hide this pane">
            <EyeOff size={13} /> Hide
          </button>
        )}
      </span>
    </div>
  );
}

function NavBtn({ t, dir, onGo }: { t: Target | null; dir: "prev" | "next"; onGo: (t: Target) => void }) {
  if (!t) return <span />;
  return (
    <button onClick={() => onGo(t)} className="ui-btn">
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
    ["[ / ]", "previous / next commentary"],
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
