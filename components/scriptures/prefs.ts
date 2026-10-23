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
  /** Chapter page view: verses only, + translation, + a chosen commentary. */
  chapterMode: "verse" | "translation" | "commentary";
  chapterAnvaya: boolean;
  /** Commentary shown on the chapter page, per book. */
  chapterComm: Record<string, string>;
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
  chapterMode: "translation",
  chapterAnvaya: false,
  chapterComm: {},
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

