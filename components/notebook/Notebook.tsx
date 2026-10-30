"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Cloud, CloudOff, Download, Eraser, Expand, FilePlus2, FolderPlus, GripHorizontal, Link2, Maximize2, Minimize2, NotebookPen, PanelBottom, PanelLeft, PanelRight, PanelTop,
  PenLine, Search, Square, Trash2, Upload, X,
} from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { loadMyNotebook, saveMyNotebook, whoAmI, type NotebookData } from "@/lib/actions/notebook";

// The site-wide notebook, like OneNote: sections (coloured tabs) → pages.
// Each page has rich text (Word-like toolbar) and a drawing. Signed-in users
// (admin login) have it saved online; everyone else keeps it on this device,
// with backup / restore as a file. Opens as a panel that can be docked left,
// right, top, bottom, centre, full screen, or float and be dragged — the page
// behind stays visible (no dimming or blur).

type Page = NotebookData["sections"][number]["pages"][number];
type Section = NotebookData["sections"][number];
type Book = NotebookData;

const KEY = "hnv:notebook2";
const OLD_KEY = "hnv:notebook";
const EVENT = "hnv-notebook";
const COLORS = ["#c9a227", "#d9622b", "#3f8f6b", "#6b9bd8", "#9b59b6", "#b3341a", "#2c7a7b"];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function emptyBook(): Book {
  return { v: 2, updated: Date.now(), sections: [{ id: uid(), name: "My notes", color: COLORS[0], pages: [] }] };
}

function readLocal(): Book {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v?.v === 2 && Array.isArray(v.sections)) return v;
    // the first notebook (plain notes) becomes a section
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? "[]") as { id: string; title: string; body: string; updated: number }[];
    const b = emptyBook();
    if (Array.isArray(old) && old.length)
      b.sections[0].pages = old.map((n) => ({ id: n.id, title: n.title, html: n.body.split("\n").map((l) => `<p>${esc(l)}</p>`).join(""), ink: "", updated: n.updated }));
    return b;
  } catch {
    return emptyBook();
  }
}
function writeLocal(b: Book) {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {}
}

/** The notebook, kept on the device and (when signed in) online. */
function useBook() {
  const [book, setBook] = useState<Book | null>(null);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const local = readLocal();
    setBook(local);
    whoAmI()
      .then(async (u) => {
        setUser(u);
        if (!u) return;
        const r = await loadMyNotebook();
        if (r.data && r.data.updated >= local.updated) {
          setBook(r.data);
          writeLocal(r.data);
        }
        setStatus("Saved online");
      })
      .catch(() => {});
    const sync = () => setBook(readLocal());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const change = useCallback(
    (fn: (b: Book) => Book) => {
      setBook((prev) => {
        if (!prev) return prev;
        const next = { ...fn(prev), updated: Date.now() };
        writeLocal(next);
        if (user) {
          setStatus("Saving…");
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            saveMyNotebook(next)
              .then((r) => setStatus(r.ok ? "Saved online" : r.message))
              .catch(() => setStatus("Offline — saved on this device"));
          }, 1500);
        }
        return next;
      });
    },
    [user]
  );
  return { book, change, user, status };
}

const when = (t: number) => {
  const d = new Date(t);
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString();
};
const plain = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const titleOf = (p: Page) => p.title.trim() || plain(p.html).slice(0, 50) || "Untitled page";

// ------------------------------------------------------------------ drawing
function InkPad({ value, onChange }: { value: string; onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState("#1f2937");
  const [size, setSize] = useState(3);
  const [erase, setErase] = useState(false);
  const drawing = useRef(false);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
    }
  }, [value]);
  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [((e.clientX - r.left) * ref.current!.width) / r.width, ((e.clientY - r.top) * ref.current!.height) / r.height];
  };
  const down = (e: React.PointerEvent) => {
    drawing.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const ctx = ref.current!.getContext("2d")!;
    const [x, y] = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const [x, y] = pos(e);
    ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = erase ? size * 6 : size * (e.pressure ? 0.5 + e.pressure : 1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(ref.current!.toDataURL("image/png"));
  };
  return (
    <div className="border-t border-[var(--border)] p-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
        {["#1f2937", "#b3341a", "#d9622b", "#c9a227", "#3f8f6b", "#2563eb", "#9b59b6"].map((c) => (
          <button key={c} type="button" onClick={() => (setColor(c), setErase(false))} aria-label={`Pen ${c}`} className={`h-6 w-6 rounded-full border-2 ${color === c && !erase ? "border-[var(--fg)]" : "border-transparent"}`} style={{ background: c }} />
        ))}
        <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="ui-btn ui-btn-sm" aria-label="Pen size">
          {[1, 2, 3, 5, 8].map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setErase((x) => !x)} aria-pressed={erase} className="ui-btn ui-btn-sm">
          <Eraser size={13} /> Eraser
        </button>
        <button type="button" onClick={() => window.confirm("Clear the drawing?") && onChange("")} className="ui-btn ui-btn-sm">
          Clear
        </button>
      </div>
      <canvas
        ref={ref}
        width={1200}
        height={700}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        className="w-full touch-none rounded-xl border border-[var(--border)] bg-white"
        style={{ aspectRatio: "12 / 7", cursor: erase ? "cell" : "crosshair" }}
      />
    </div>
  );
}

// ------------------------------------------------------------------ body
/** Sections · pages · the open page. */
export function NotebookBody({ page = false, onClose, header }: { page?: boolean; onClose?: () => void; header?: React.ReactNode }) {
  const { book, change, user, status } = useBook();
  const [secId, setSecId] = useState<string | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [draw, setDraw] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const sec = book?.sections.find((s) => s.id === secId) ?? book?.sections[0] ?? null;
  const pg = sec?.pages.find((p) => p.id === pageId) ?? null;
  const results = useMemo(() => {
    const f = q.trim().toLowerCase();
    if (!f || !book) return null;
    return book.sections.flatMap((s) => s.pages.filter((p) => `${p.title} ${plain(p.html)}`.toLowerCase().includes(f)).map((p) => ({ s, p })));
  }, [q, book]);

  if (!book || !sec) return <p className="p-6 text-sm text-[var(--fg-muted)]">Loading…</p>;

  const setSec = (fn: (s: Section) => Section) => change((b) => ({ ...b, sections: b.sections.map((s) => (s.id === sec.id ? fn(s) : s)) }));
  const setPage = (patch: Partial<Page>) => pg && setSec((s) => ({ ...s, pages: s.pages.map((p) => (p.id === pg.id ? { ...p, ...patch, updated: Date.now() } : p)) }));
  const addSection = () => {
    const name = window.prompt("Name of the new section", "New section");
    if (!name) return;
    const s: Section = { id: uid(), name, color: COLORS[book.sections.length % COLORS.length], pages: [] };
    change((b) => ({ ...b, sections: [...b.sections, s] }));
    setSecId(s.id);
    setPageId(null);
  };
  const renameSection = () => {
    const name = window.prompt("Rename the section", sec.name);
    if (name) setSec((s) => ({ ...s, name }));
  };
  const deleteSection = () => {
    if (book.sections.length < 2) return setMsg("A notebook keeps at least one section.");
    if (!window.confirm(`Delete the section “${sec.name}” and its ${sec.pages.length} page(s)?`)) return;
    change((b) => ({ ...b, sections: b.sections.filter((s) => s.id !== sec.id) }));
    setSecId(null);
    setPageId(null);
  };
  const addPage = (html = "") => {
    const p: Page = { id: uid(), title: "", html, ink: "", updated: Date.now() };
    setSec((s) => ({ ...s, pages: [p, ...s.pages] }));
    setPageId(p.id);
  };
  const addLink = () => {
    const line = `<p><a href="${esc(window.location.href)}">${esc(document.title.replace(/\s*\|.*$/, ""))}</a></p>`;
    if (pg) setPage({ html: pg.html + line });
    else addPage(line);
  };
  const backup = () => {
    const blob = new Blob([JSON.stringify({ app: "hnv-notebook", version: 2, notebook: book }, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `notebook-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const restore = async (f: File) => {
    try {
      const d = JSON.parse(await f.text());
      const nb: Book | null = d?.notebook?.v === 2 ? d.notebook : null;
      if (!nb) throw new Error("That file is not a notebook backup.");
      change((b) => ({ ...b, sections: [...b.sections, ...nb.sections.filter((s) => !b.sections.some((x) => x.id === s.id))] }));
      setMsg("Restored.");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const tabs = (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] px-2 pt-2">
      {book.sections.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => (setSecId(s.id), setPageId(null))}
          onDoubleClick={renameSection}
          className={`shrink-0 rounded-t-lg border border-b-0 px-3 py-1.5 text-sm ${s.id === sec.id ? "bg-[var(--bg)] font-semibold" : "bg-[var(--bg-2)] text-[var(--fg-muted)]"}`}
          style={{ borderTop: `3px solid ${s.color}` }}
          title="Double-click to rename"
        >
          {s.name}
        </button>
      ))}
      <button type="button" onClick={addSection} className="ui-icon-btn ui-btn-sm shrink-0" title="New section" aria-label="New section">
        <FolderPlus size={15} />
      </button>
    </div>
  );

  const pages = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 p-2">
        <label className="ui-trigger min-w-0 flex-1 !pr-3">
          <Search size={14} className="shrink-0 text-[var(--fg-muted)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="dict-noring min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <button type="button" onClick={() => addPage()} className="ui-btn ui-btn-primary ui-btn-sm shrink-0" title="New page">
          <FilePlus2 size={14} /> Page
        </button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {(results ?? sec.pages.map((p) => ({ s: sec, p }))).map(({ s, p }) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => (setSecId(s.id), setPageId(p.id), setQ(""))}
              className={`w-full rounded-lg px-3 py-2 text-left ${pg?.id === p.id ? "bg-[var(--ctl-on-bg)] ring-1 ring-[var(--ctl-on-border)]" : "hover:bg-[var(--bg-2)]"}`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold">{titleOf(p)}</span>
                <span className="shrink-0 text-[11px] text-[var(--fg-muted)]">{when(p.updated)}</span>
              </span>
              {results && <span className="text-[11px] text-[var(--fg-muted)]">{s.name}</span>}
            </button>
          </li>
        ))}
        {!sec.pages.length && !results && <li className="px-3 py-8 text-center text-sm text-[var(--fg-muted)]">No pages yet. Start one with “Page”.</li>}
      </ul>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] p-2 text-xs text-[var(--fg-muted)]">
        <span className="mr-auto inline-flex items-center gap-1" title={user ? `Signed in as ${user.name}` : "Not signed in"}>
          {user ? <Cloud size={13} /> : <CloudOff size={13} />}
          {user ? status || "Online" : <Link href={`/admin/login?next=${encodeURIComponent("/notes")}`} className="underline">Sign in to save online</Link>}
        </span>
        <button type="button" onClick={renameSection} className="ui-btn ui-btn-sm">Rename</button>
        <button type="button" onClick={deleteSection} className="ui-btn ui-btn-sm" title="Delete this section">
          <Trash2 size={12} />
        </button>
        <button type="button" onClick={backup} className="ui-btn ui-btn-sm" title="Download a backup">
          <Download size={12} />
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="ui-btn ui-btn-sm" title="Restore a backup">
          <Upload size={12} />
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
      </div>
      {msg && <p className="border-t border-[var(--border)] px-3 py-1.5 text-xs">{msg}</p>}
    </div>
  );

  const editor = pg ? (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <button type="button" onClick={() => setPageId(null)} className="ui-btn ui-btn-sm md:hidden">
          ← Pages
        </button>
        <input
          value={pg.title}
          onChange={(e) => setPage({ title: e.target.value })}
          placeholder="Page title"
          className="dict-noring min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-[var(--fg-muted)]"
        />
        <button type="button" onClick={() => setDraw((d) => !d)} aria-pressed={draw} className="ui-btn ui-btn-sm" title="Drawing">
          <PenLine size={13} /> Draw
        </button>
        <button type="button" onClick={addLink} className="ui-btn ui-btn-sm" title="Add a link to the page you are on">
          <Link2 size={13} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Delete this page?")) {
              setSec((s) => ({ ...s, pages: s.pages.filter((p) => p.id !== pg.id) }));
              setPageId(null);
            }
          }}
          className="ui-icon-btn ui-btn-sm"
          aria-label="Delete page"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="p-3">
          <RichTextEditor key={pg.id} name="note" defaultValue={pg.html} minHeight={260} placeholder="Write anything…" onChange={(html) => html !== pg.html && setPage({ html })} />
        </div>
        {(draw || pg.ink) && <InkPad value={pg.ink} onChange={(ink) => setPage({ ink })} />}
      </div>
    </div>
  ) : (
    <p className="m-auto p-10 text-center text-sm text-[var(--fg-muted)]">Choose a page, or start a new one.</p>
  );

  return (
    <div className={`flex min-h-0 flex-col bg-[var(--bg)] ${page ? "h-[calc(100dvh-12rem)] min-h-[32rem] overflow-hidden rounded-2xl border border-[var(--border)] shadow-[var(--shadow-lift)]" : "h-full"}`}>
      {header}
      {tabs}
      <div className="grid min-h-0 flex-1 md:grid-cols-[17rem_minmax(0,1fr)]">
        <div className={`min-h-0 min-w-0 overflow-hidden flex-col border-[var(--border)] md:flex md:border-r ${pg ? "hidden" : "flex"}`}>{pages}</div>
        <div className={`min-h-0 min-w-0 flex-col md:flex ${pg ? "flex" : "hidden"}`}>{editor}</div>
      </div>
      {onClose && null}
    </div>
  );
}

// ------------------------------------------------------------------ panel
type Dock = "right" | "left" | "bottom" | "top" | "center" | "full" | "float";
const DOCKS: { d: Dock; icon: React.ReactNode; label: string }[] = [
  { d: "left", icon: <PanelLeft size={14} />, label: "Left" },
  { d: "right", icon: <PanelRight size={14} />, label: "Right" },
  { d: "top", icon: <PanelTop size={14} />, label: "Top" },
  { d: "bottom", icon: <PanelBottom size={14} />, label: "Bottom" },
  { d: "center", icon: <Square size={14} />, label: "Centre" },
  { d: "float", icon: <GripHorizontal size={14} />, label: "Float (drag me)" },
];

/** Header button + the notebook panel, available on every page. */
export default function NotebookButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dock, setDock] = useState<Dock>("right");
  const [big, setBig] = useState(false);
  const [xy, setXy] = useState({ x: 80, y: 90 });
  useEffect(() => {
    setMounted(true);
    try {
      const p = JSON.parse(localStorage.getItem("hnv:notebook-panel") ?? "{}");
      if (p.dock) setDock(p.dock);
      if (p.big) setBig(true);
      if (p.xy) setXy(p.xy);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("hnv:notebook-panel", JSON.stringify({ dock, big, xy }));
    } catch {}
  }, [dock, big, xy]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const drag = (e: React.PointerEvent) => {
    if (dock !== "float" || (e.target as HTMLElement).closest("button,a")) return;
    const start = { x: e.clientX - xy.x, y: e.clientY - xy.y };
    const mv = (ev: PointerEvent) => setXy({ x: Math.max(0, Math.min(window.innerWidth - 120, ev.clientX - start.x)), y: Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - start.y)) });
    const upf = () => (window.removeEventListener("pointermove", mv), window.removeEventListener("pointerup", upf));
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", upf);
  };

  const full = dock === "full" || big;
  const style: React.CSSProperties =
    dock === "full"
      ? { inset: 0 }
      : dock === "right"
        ? { top: 0, bottom: 0, right: 0, width: big ? "100vw" : "min(50vw, 100vw)", minWidth: "min(28rem, 100vw)" }
        : dock === "left"
          ? { top: 0, bottom: 0, left: 0, width: big ? "100vw" : "min(50vw, 100vw)", minWidth: "min(28rem, 100vw)" }
          : dock === "bottom"
            ? { left: 0, right: 0, bottom: 0, height: big ? "100dvh" : "50dvh" }
            : dock === "top"
              ? { left: 0, right: 0, top: 0, height: big ? "100dvh" : "50dvh" }
              : dock === "center"
                ? big
                  ? { inset: 0 }
                  : { left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(64rem, 96vw)", height: "min(80dvh, 46rem)" }
                : { left: xy.x, top: xy.y, width: big ? "90vw" : "min(40rem, 94vw)", height: big ? "85dvh" : "min(70dvh, 40rem)", resize: "both", overflow: "hidden" };

  const header = (
    <div onPointerDown={drag} className={`flex items-center gap-1 border-b border-[var(--border)] px-3 py-2 ${dock === "float" ? "cursor-move select-none" : ""}`}>
      <span className="mr-auto flex items-center gap-2 font-semibold">
        <NotebookPen size={17} className="text-[var(--accent)]" /> Notebook
      </span>
      <span className="hidden items-center gap-0.5 sm:flex" role="group" aria-label="Position">
        {DOCKS.map((o) => (
          <button key={o.d} type="button" onClick={() => setDock(o.d)} aria-pressed={dock === o.d} className="ui-icon-btn ui-btn-sm" title={o.label} aria-label={o.label}>
            {o.icon}
          </button>
        ))}
      </span>
      <button type="button" onClick={() => (dock === "full" ? setDock("right") : setBig((b) => !b))} className="ui-icon-btn ui-btn-sm" title={full ? "Smaller" : "Full size"} aria-label={full ? "Smaller" : "Full size"}>
        {full ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
      <Link href="/notes" onClick={() => setOpen(false)} className="ui-icon-btn ui-btn-sm" title="Open as a page" aria-label="Open as a page">
        <Expand size={14} />
      </Link>
      <button type="button" onClick={() => setOpen(false)} className="ui-icon-btn ui-btn-sm" aria-label="Close notebook">
        <X size={15} />
      </button>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notebook"
        title="Notebook"
        className={`group relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--fg)] ${className}`}
      >
        <NotebookPen size={19} strokeWidth={1.75} />
      </button>
      {mounted &&
        open &&
        createPortal(
          // no backdrop: the page behind stays visible and usable
          <aside className="fixed z-[95] flex flex-col overflow-hidden rounded-none border border-[var(--border)] bg-[var(--bg)] shadow-2xl sm:rounded-xl" style={style}>
            <NotebookBody header={header} onClose={() => setOpen(false)} />
          </aside>,
          document.body
        )}
    </>
  );
}

// kept for the /notes page and other callers
export function useNotebook() {
  return useBook();
}
