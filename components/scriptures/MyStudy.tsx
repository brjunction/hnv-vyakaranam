"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, Download, History, NotebookPen, Search, Trash2, Upload } from "lucide-react";
import { exportPersonal, importPersonal, useMarks, useNotes } from "@/components/scriptures/prefs";

/** Everything a reader saved on this device: bookmarks, notes, history — with backup/restore. */
export default function MyStudy() {
  const bookmarks = useMarks("bookmarks");
  const history = useMarks("history");
  const { notes, save } = useNotes();
  const [tab, setTab] = useState<"notes" | "bookmarks" | "history">("notes");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const noteList = useMemo(() => Object.values(notes).sort((a, b) => b.at - a.at), [notes]);
  const f = q.trim().toLowerCase();
  const match = (s: string) => !f || s.toLowerCase().includes(f);

  function download() {
    const blob = new Blob([exportPersonal()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scriptures-notes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function restore(file: File) {
    try {
      const r = importPersonal(await file.text());
      setMsg(`Restored ${r.notes} note${r.notes === 1 ? "" : "s"} and ${r.bookmarks} bookmark${r.bookmarks === 1 ? "" : "s"}.`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  const tabs = [
    { k: "notes", label: "My notes", icon: NotebookPen, n: noteList.length },
    { k: "bookmarks", label: "Bookmarks", icon: Bookmark, n: bookmarks.items.length },
    { k: "history", label: "Recently read", icon: History, n: history.items.length },
  ] as const;

  return (
    <div>
      <Link href="/scriptures" className="text-sm text-[var(--fg-muted)] hover:underline">
        ← Scriptures
      </Link>
      <div className="mb-8 mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">My bookmarks & notes</h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">Kept privately on this device. Make a backup to move them to another phone or computer.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={download} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-4 py-2 text-sm hover:border-[var(--accent)]">
            <Download size={15} /> Backup
          </button>
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-4 py-2 text-sm hover:border-[var(--accent)]">
            <Upload size={15} /> Restore
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
        </div>
      </div>
      {msg && <p className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--bg-2)] px-4 py-3 text-sm">{msg}</p>}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-2)] p-1">
          {tabs.map(({ k, label, icon: Icon, n }) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm ${tab === k ? "bg-[var(--accent)] font-semibold text-[var(--color-ink)]" : "hover:bg-[var(--bg)]"}`}
            >
              <Icon size={15} /> {label} <span className="tabular-nums opacity-70">{n}</span>
            </button>
          ))}
        </div>
        <label className="relative ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="h-10 rounded-full border border-[var(--border)] bg-[var(--bg)] pl-9 pr-4 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
      </div>

      {tab === "notes" &&
        (noteList.filter((n) => match(n.ref + n.text)).length ? (
          <ul className="grid gap-3">
            {noteList
              .filter((n) => match(n.ref + n.text))
              .map((n) => (
                <li key={n.href} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Link href={n.href} className="font-semibold hover:underline">
                      {n.ref}
                    </Link>
                    <span className="flex items-center gap-3 text-xs text-[var(--fg-muted)]">
                      {new Date(n.at).toLocaleDateString()}
                      <button onClick={() => window.confirm("Delete this note?") && save({ ...n, text: "" })} aria-label="Delete note" className="hover:text-[var(--color-vermillion)]">
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{n.text}</p>
                </li>
              ))}
          </ul>
        ) : (
          <Empty text="Write a note on any verse with the ✎ button in the reader (or press n)." />
        ))}

      {tab !== "notes" &&
        ((tab === "bookmarks" ? bookmarks : history).items.filter((m) => match(m.ref + m.title)).length ? (
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)]">
            {(tab === "bookmarks" ? bookmarks : history).items
              .filter((m) => match(m.ref + m.title))
              .map((m) => (
                <li key={m.href} className="flex items-center justify-between gap-3 px-5 py-3">
                  <Link href={m.href} className="min-w-0 hover:underline">
                    <span className="font-semibold">{m.ref}</span> <span className="text-sm text-[var(--fg-muted)]">{m.title}</span>
                  </Link>
                  <span className="flex shrink-0 items-center gap-3 text-xs text-[var(--fg-muted)]">
                    {new Date(m.at).toLocaleDateString()}
                    {tab === "bookmarks" && (
                      <button onClick={() => bookmarks.toggle(m)} aria-label="Remove bookmark" className="hover:text-[var(--color-vermillion)]">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <Empty text={tab === "bookmarks" ? "Bookmark verses with the bookmark button in the reader (or press b)." : "Verses you read appear here."} />
        ))}
      {tab === "history" && history.items.length > 0 && (
        <button onClick={history.clear} className="mt-4 text-sm text-[var(--fg-muted)] underline">
          Clear reading history
        </button>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--fg-muted)]">{text}</p>;
}
