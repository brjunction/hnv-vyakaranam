"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScriptName } from "@/lib/scriptures/core";

// Reader preferences, remembered per browser (localStorage). Every read and
// write is guarded: private windows and blocked storage just use defaults.

export type ReaderPrefs = {
  script: ScriptName;
  /** IAST mode: also show the Devanagari (docs/06 §3 "Show Devanagari"). */
  showDeva: boolean;
  /** Text size of the verse side (verse, Anvaya, Translation). */
  fontScale: number;
  /** Text size of the commentary side — set separately. */
  commScale: number;
  /** Left pane width in % (desktop two-pane reader). */
  split: number;
  hideVerse: boolean;
  hideCommentary: boolean;
  /** Last chosen commentary tab per book: code → type key | "all". */
  tab: Record<string, string>;
  /** Chapter view: show commentaries open by default. */
  expandAll: boolean;
  /** Favourite commentary keys per book (shown first). */
  favs: Record<string, string[]>;
  /** Commentary keys the reader chose to hide, per book. */
  hidden: Record<string, string[]>;
  /** Commentary list: only those with text for this verse. */
  onlyAvail: boolean;
};

const DEFAULTS: ReaderPrefs = {
  script: "iast",
  showDeva: false,
  fontScale: 1,
  commScale: 1,
  split: 44,
  hideVerse: false,
  hideCommentary: false,
  tab: {},
  expandAll: false,
  favs: {},
  hidden: {},
  onlyAvail: true,
};
const KEY = "scr:prefs";
const EVENT = "scr-prefs";

function read(): ReaderPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    const legacy = localStorage.getItem("scr:show-deva");
    const p = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    if (!raw && legacy) p.showDeva = legacy === "1";
    return p;
  } catch {
    return { ...DEFAULTS };
  }
}

export function useReaderPrefs() {
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULTS);
  useEffect(() => {
    setPrefs(read());
    const sync = () => setPrefs(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const update = useCallback((patch: Partial<ReaderPrefs>) => {
    const next = { ...read(), ...patch };
    setPrefs(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [prefs, update] as const;
}

// ------------------------------------------------ bookmarks & history ----
export type Mark = { book: string; ref: string; href: string; title: string; at: number };
const BM = "scr:bookmarks";
const HIST = "scr:history";

function list(key: string): Mark[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as Mark[];
  } catch {
    return [];
  }
}
function store(key: string, v: Mark[]) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
  window.dispatchEvent(new Event(EVENT + key));
}

export function useMarks(key: "bookmarks" | "history") {
  const k = key === "bookmarks" ? BM : HIST;
  const [items, setItems] = useState<Mark[]>([]);
  useEffect(() => {
    setItems(list(k));
    const sync = () => setItems(list(k));
    window.addEventListener(EVENT + k, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT + k, sync);
      window.removeEventListener("storage", sync);
    };
  }, [k]);
  const toggle = useCallback(
    (m: Omit<Mark, "at">) => {
      const cur = list(k);
      const has = cur.some((x) => x.href === m.href);
      store(k, has ? cur.filter((x) => x.href !== m.href) : [{ ...m, at: Date.now() }, ...cur].slice(0, 300));
    },
    [k]
  );
  const push = useCallback(
    (m: Omit<Mark, "at">) => {
      const cur = list(k).filter((x) => x.href !== m.href && !(x.book === m.book && key === "history"));
      store(k, [{ ...m, at: Date.now() }, ...cur].slice(0, 30));
    },
    [k, key]
  );
  const clear = useCallback(() => store(k, []), [k]);
  return { items, toggle, push, clear, has: (href: string) => items.some((x) => x.href === href) };
}

// ------------------------------------------------------------ my notes ----
export type Note = { href: string; book: string; ref: string; text: string; at: number };
const NOTES = "scr:notes";

function readNotes(): Record<string, Note> {
  try {
    return JSON.parse(localStorage.getItem(NOTES) ?? "{}") as Record<string, Note>;
  } catch {
    return {};
  }
}

export function useNotes() {
  const [notes, setNotes] = useState<Record<string, Note>>({});
  useEffect(() => {
    setNotes(readNotes());
    const sync = () => setNotes(readNotes());
    window.addEventListener(EVENT + NOTES, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT + NOTES, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const save = useCallback((n: Omit<Note, "at">) => {
    const all = readNotes();
    if (n.text.trim()) all[n.href] = { ...n, at: Date.now() };
    else delete all[n.href];
    try {
      localStorage.setItem(NOTES, JSON.stringify(all));
    } catch {}
    window.dispatchEvent(new Event(EVENT + NOTES));
  }, []);
  return { notes, save };
}

/** Everything a reader keeps on this device, for backup / moving to another device. */
export function exportPersonal(): string {
  const get = (k: string) => {
    try {
      return JSON.parse(localStorage.getItem(k) ?? "null");
    } catch {
      return null;
    }
  };
  return JSON.stringify(
    { app: "hnv-scriptures", version: 1, exportedAt: new Date().toISOString(), bookmarks: get(BM) ?? [], history: get(HIST) ?? [], notes: get(NOTES) ?? {}, prefs: get(KEY) ?? {} },
    null,
    2
  );
}

/** Merge a backup into this device (nothing here is deleted). Returns counts. */
export function importPersonal(json: string): { bookmarks: number; notes: number } {
  const data = JSON.parse(json) as { app?: string; bookmarks?: Mark[]; notes?: Record<string, Note>; history?: Mark[] };
  if (data.app !== "hnv-scriptures") throw new Error("That file is not a Scriptures backup.");
  const bm = list(BM);
  const addBm = (data.bookmarks ?? []).filter((m) => m?.href && !bm.some((x) => x.href === m.href));
  store(BM, [...bm, ...addBm].sort((a, b) => b.at - a.at));
  const notes = readNotes();
  let n = 0;
  for (const [k, v] of Object.entries(data.notes ?? {})) {
    if (!v?.text) continue;
    if (!notes[k] || notes[k].at < v.at) {
      notes[k] = v;
      n++;
    }
  }
  try {
    localStorage.setItem(NOTES, JSON.stringify(notes));
  } catch {}
  window.dispatchEvent(new Event(EVENT + NOTES));
  return { bookmarks: addBm.length, notes: n };
}
