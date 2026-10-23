"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Download, Expand, Link2, NotebookPen, Plus, Search, Trash2, Upload, X } from "lucide-react";

// The site-wide notebook: free notes on anything, from any page. Kept on
// the reader's own device (localStorage) — no account, no database cost —
// with backup / restore as a file.

export type Note = { id: string; title: string; body: string; updated: number };
const KEY = "hnv:notebook";
const EVENT = "hnv-notebook";

function readAll(): Note[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeAll(notes: Note[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(notes));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function useNotebook() {
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    setNotes(readAll());
    const sync = () => setNotes(readAll());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const create = useCallback((body = "") => {
    const n: Note = { id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), title: "", body, updated: Date.now() };
    writeAll([n, ...readAll()]);
    return n.id;
  }, []);
  const update = useCallback((id: string, patch: Partial<Note>) => {
    writeAll(readAll().map((n) => (n.id === id ? { ...n, ...patch, updated: Date.now() } : n)));
  }, []);
  const remove = useCallback((id: string) => writeAll(readAll().filter((n) => n.id !== id)), []);
  return { notes: [...notes].sort((a, b) => b.updated - a.updated), create, update, remove };
}

const when = (t: number) => {
  const d = new Date(t);
  const today = new Date();
  return d.toDateString() === today.toDateString() ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString();
};
const titleOf = (n: Note) => n.title.trim() || n.body.trim().split("\n")[0]?.slice(0, 60) || "Untitled note";

/** List + editor. `page` = full page layout (two columns on desktop). */
export function NotebookBody({ page = false, onClose }: { page?: boolean; onClose?: () => void }) {
  const { notes, create, update, remove } = useNotebook();
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const open = notes.find((n) => n.id === openId) ?? null;
  const shown = useMemo(() => {
    const f = q.trim().toLowerCase();
    return f ? notes.filter((n) => `${n.title} ${n.body}`.toLowerCase().includes(f)) : notes;
  }, [notes, q]);
  useEffect(() => {
    if (page && !openId && notes[0]) setOpenId(notes[0].id);
  }, [page, openId, notes]);

  const addNew = () => {
    const id = create();
    setOpenId(id);
    setTimeout(() => bodyRef.current?.focus(), 30);
  };
  const addLink = () => {
    const line = `${document.title.replace(/\s*\|.*$/, "")} — ${window.location.href}`;
    if (open) update(open.id, { body: open.body ? `${open.body}\n${line}` : line });
    else setOpenId(create(line));
  };
  const backup = () => {
    const blob = new Blob([JSON.stringify({ app: "hnv-notebook", version: 1, exportedAt: new Date().toISOString(), notes: readAll() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `notebook-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const restore = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as { app?: string; notes?: Note[] };
      if (data.app !== "hnv-notebook" || !Array.isArray(data.notes)) throw new Error("That file is not a notebook backup.");
      const cur = readAll();
      const add = data.notes.filter((n) => n?.id && !cur.some((c) => c.id === n.id));
      writeAll([...cur, ...add]);
      setMsg(`Restored ${add.length} note${add.length === 1 ? "" : "s"}.`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const list = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 p-3">
        <label className="ui-trigger flex-1 !pr-3">
          <Search size={14} className="text-[var(--fg-muted)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" className="dict-noring min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <button onClick={addNew} className="ui-btn ui-btn-primary">
          <Plus size={15} /> New
        </button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {shown.map((n) => (
          <li key={n.id}>
            <button
              onClick={() => setOpenId(n.id)}
              className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${open?.id === n.id ? "bg-[var(--ctl-on-bg)] ring-1 ring-[var(--ctl-on-border)]" : "hover:bg-[var(--bg-2)]"}`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold">{titleOf(n)}</span>
                <span className="shrink-0 text-[11px] text-[var(--fg-muted)]">{when(n.updated)}</span>
              </span>
              <span className="line-clamp-2 text-xs text-[var(--fg-muted)]">{n.body.replace(/\n+/g, " · ") || "Empty"}</span>
            </button>
          </li>
        ))}
        {!shown.length && (
          <li className="px-3 py-10 text-center text-sm text-[var(--fg-muted)]">
            {notes.length ? "No note matches." : "Your notebook is empty. Write anything — thoughts, references, a sūtra to remember."}
          </li>
        )}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] p-3 text-xs text-[var(--fg-muted)]">
        <span className="mr-auto">Saved on this device</span>
        <button onClick={backup} className="ui-btn ui-btn-sm" title="Download a backup file">
          <Download size={13} /> Backup
        </button>
        <button onClick={() => fileRef.current?.click()} className="ui-btn ui-btn-sm" title="Restore from a backup file">
          <Upload size={13} /> Restore
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
      </div>
      {msg && <p className="border-t border-[var(--border)] px-3 py-2 text-xs">{msg}</p>}
    </div>
  );

  const editor = open ? (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        {!page && (
          <button onClick={() => setOpenId(null)} className="ui-icon-btn ui-btn-sm" aria-label="Back to all notes">
            <ArrowLeft size={15} />
          </button>
        )}
        <input
          value={open.title}
          onChange={(e) => update(open.id, { title: e.target.value })}
          placeholder="Title"
          className="dict-noring min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-[var(--fg-muted)]"
        />
        <button onClick={addLink} className="ui-btn ui-btn-sm" title="Add a link to the page you are on">
          <Link2 size={13} /> This page
        </button>
        <button
          onClick={() => {
            if (window.confirm("Delete this note?")) {
              remove(open.id);
              setOpenId(null);
            }
          }}
          className="ui-icon-btn ui-btn-sm"
          aria-label="Delete note"
          title="Delete note"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <textarea
        ref={bodyRef}
        value={open.body}
        onChange={(e) => update(open.id, { body: e.target.value })}
        placeholder="Write anything…"
        className="dict-noring min-h-0 flex-1 resize-none bg-transparent p-4 text-[0.95rem] leading-relaxed outline-none placeholder:text-[var(--fg-muted)]"
      />
      <p className="border-t border-[var(--border)] px-4 py-2 text-[11px] text-[var(--fg-muted)]">
        {open.body.trim() ? open.body.trim().split(/\s+/).length : 0} words · saved {when(open.updated)}
      </p>
    </div>
  ) : null;

  if (page) {
    return (
      <div className="grid h-[calc(100dvh-12rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow-lift)] md:grid-cols-[20rem_1fr]">
        <div className={`flex min-h-0 flex-col border-[var(--border)] md:border-r ${open ? "hidden md:flex" : "flex"}`}>{list}</div>
        <div className={`min-h-0 flex-col ${open ? "flex" : "hidden md:flex"}`}>
          {editor ?? <p className="m-auto p-10 text-center text-sm text-[var(--fg-muted)]">Choose a note, or start a new one.</p>}
          {open && (
            <button onClick={() => setOpenId(null)} className="ui-btn ui-btn-sm m-3 md:hidden">
              <ArrowLeft size={13} /> All notes
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <span className="flex items-center gap-2 font-semibold">
          <NotebookPen size={17} className="text-[var(--accent)]" /> Notebook
        </span>
        <span className="flex items-center gap-1.5">
          <Link href="/notes" onClick={onClose} className="ui-icon-btn ui-btn-sm" title="Open as a full page" aria-label="Open as a full page">
            <Expand size={14} />
          </Link>
          <button onClick={onClose} className="ui-icon-btn ui-btn-sm" aria-label="Close notebook">
            <X size={15} />
          </button>
        </span>
      </div>
      {open ? editor : list}
    </div>
  );
}

/** Header button + slide-over drawer, available on every page. */
export default function NotebookButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Notebook"
        title="Notebook"
        className={`group relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--fg)] ${className}`}
      >
        <NotebookPen size={19} strokeWidth={1.75} />
      </button>
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[95]">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 right-0 flex w-[min(28rem,100vw)] flex-col border-l border-[var(--border)] bg-[var(--bg)] shadow-2xl" style={{ animation: "ui-pop-in .15s ease-out" }}>
              <NotebookBody onClose={() => setOpen(false)} />
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
