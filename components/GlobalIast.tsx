"use client";

import { useEffect } from "react";
import { IAST_CYCLE } from "@/lib/text/iast-cycle";

/**
 * The IAST keyboard everywhere: in any text box (search, notes, the script
 * converter …), Shift pressed on its own turns the letter before the
 * cursor into the next one with a diacritic. Off with localStorage
 * "hnv:iast-shift" = "0".
 */
export default function GlobalIast() {
  useEffect(() => {
    let alone = false;
    const down = (e: KeyboardEvent) => {
      alone = e.key === "Shift" && (e.location === 1 || e.location === 2) && !e.repeat;
    };
    const up = (e: KeyboardEvent) => {
      if (!(e.key === "Shift" && (e.location === 1 || e.location === 2) && alone)) return;
      alone = false;
      try {
        if (localStorage.getItem("hnv:iast-shift") === "0") return;
      } catch {}
      const el = document.activeElement as HTMLElement | null;
      if (!el) return;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el instanceof HTMLInputElement && !/^(text|search|)$/.test(el.type)) return;
        const at = el.selectionStart ?? 0;
        if (!at || at !== el.selectionEnd) return;
        const next = IAST_CYCLE[el.value[at - 1]];
        if (!next) return;
        el.setSelectionRange(at - 1, at);
        // insertText keeps undo and tells React / editors about the change
        if (!document.execCommand("insertText", false, next)) {
          el.setRangeText(next, at - 1, at, "end");
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
        return;
      }
      if (el.isContentEditable) {
        const sel = window.getSelection();
        if (!sel || !sel.isCollapsed || !sel.anchorNode || sel.anchorNode.nodeType !== Node.TEXT_NODE) return;
        const off = sel.anchorOffset;
        const text = sel.anchorNode.textContent ?? "";
        if (!off) return;
        const next = IAST_CYCLE[text[off - 1]];
        if (!next) return;
        sel.modify("extend", "backward", "character");
        document.execCommand("insertText", false, next);
      }
    };
    const any = (e: KeyboardEvent) => {
      if (e.key !== "Shift") alone = false;
    };
    window.addEventListener("keydown", down, true);
    window.addEventListener("keydown", any, true);
    window.addEventListener("keyup", up, true);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keydown", any, true);
      window.removeEventListener("keyup", up, true);
    };
  }, []);
  return null;
}
