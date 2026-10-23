"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

// The site's dropdown: a styled trigger + a popover list rendered in a
// portal (never clipped by scrolling panes), with search, groups, a
// sub-line, a status dot and a badge per option, full keyboard support,
// and a bottom sheet on phones. Works in light and dark mode (.ui-* CSS).

export type Opt = {
  value: string;
  label: string;
  sub?: string;
  badge?: string;
  /** Status dot: on = has content, off = empty. */
  dot?: "on" | "off";
  group?: string;
  /** Text shown in the trigger instead of `label`. */
  short?: string;
  className?: string;
};

export default function Select({
  value,
  onChange,
  options,
  label,
  icon,
  searchable,
  placeholder = "Choose…",
  size = "md",
  width = 280,
  align = "left",
  sheet = true,
  title,
  className = "",
  triggerClassName = "",
  valueClassName = "",
  meta,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
  label?: string;
  icon?: React.ReactNode;
  /** Show a search box (default: when more than 10 options). */
  searchable?: boolean;
  placeholder?: string;
  size?: "md" | "lg";
  width?: number;
  align?: "left" | "right";
  sheet?: boolean;
  title?: string;
  className?: string;
  triggerClassName?: string;
  valueClassName?: string;
  /** Quiet text on the right of the trigger, e.g. "8 of 11 available". */
  meta?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxH: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value);
  const showSearch = searchable ?? options.length > 10;

  const filtered = useMemo(() => {
    const f = q.trim().toLowerCase();
    if (!f) return options;
    const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return options.filter((o) => plain(`${o.label} ${o.sub ?? ""} ${o.value}`).includes(plain(f)) || `${o.label} ${o.sub ?? ""}`.toLowerCase().includes(f));
  }, [options, q]);

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.max(width, r.width);
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const spaceAbove = r.top - 12;
    const up = spaceBelow < 260 && spaceAbove > spaceBelow;
    let left = align === "right" ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left, width: w, maxH: Math.min(440, up ? spaceAbove : spaceBelow), up });
  }, [width, align]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const i = Math.max(0, filtered.findIndex((o) => o.value === value));
    setActive(i);
    const onScroll = (e: Event) => {
      if (list.current && list.current.contains(e.target as Node)) return;
      place();
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, place]);

  useEffect(() => {
    if (open && showSearch) setTimeout(() => input.current?.focus(), 10);
    if (!open) setQ("");
  }, [open, showSearch]);

  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    btn.current?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) return setOpen(true);
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      const o = filtered[active];
      if (o) choose(o.value);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Home" && open) setActive(0);
    else if (e.key === "End" && open) setActive(filtered.length - 1);
  };

  let lastGroup: string | undefined;
  return (
    <>
      <button
        ref={btn}
        type="button"
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
        className={`ui-trigger ${size === "lg" ? "ui-trigger-lg" : ""} ${triggerClassName} ${className}`}
      >
        {icon && <span className="shrink-0 text-[var(--fg-muted)]">{icon}</span>}
        <span className={`flex min-w-0 flex-1 ${size === "lg" ? "flex-col" : "items-baseline gap-1.5"}`}>
          {label && <span className={`ui-trigger-label ${size === "lg" ? "ui-trigger-label-lg" : ""}`}>{label}</span>}
          <span className={`ui-trigger-value ${valueClassName}`}>{current ? current.short ?? current.label : placeholder}</span>
        </span>
        {meta && <span className="ui-trigger-meta">{meta}</span>}
        <ChevronDown size={16} className="ui-chev" aria-hidden />
      </button>
      {open &&
        pos &&
        createPortal(
          <>
            <div className={`ui-backdrop ${sheet ? "ui-dim" : ""}`} onMouseDown={() => setOpen(false)} />
            <div
              className={`ui-pop ${sheet ? "ui-pop-sheet" : ""}`}
              style={{
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxH,
                ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
              }}
              onKeyDown={onKey}
            >
              {showSearch && (
                <label className="ui-pop-search">
                  <Search size={14} className="text-[var(--fg-muted)]" />
                  <input ref={input} value={q} onChange={(e) => (setQ(e.target.value), setActive(0))} placeholder="Search…" aria-label="Search options" className="dict-noring" />
                </label>
              )}
              <div ref={list} id={id} role="listbox" className="ui-pop-list">
                {filtered.map((o, i) => {
                  const head = o.group && o.group !== lastGroup ? o.group : null;
                  lastGroup = o.group;
                  return (
                    <div key={`${o.value}-${i}`}>
                      {head && <div className="ui-pop-group">{head}</div>}
                      <button
                        type="button"
                        role="option"
                        data-i={i}
                        aria-selected={o.value === value}
                        data-active={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => choose(o.value)}
                        className={`ui-opt ${o.className ?? ""}`}
                      >
                        {o.dot && <span className={`ui-opt-dot ${o.dot}`} aria-hidden />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{o.label}</span>
                          {o.sub && <span className="ui-opt-sub truncate">{o.sub}</span>}
                        </span>
                        {o.badge && <span className="ui-opt-badge">{o.badge}</span>}
                        {o.value === value && <Check size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden />}
                      </button>
                    </div>
                  );
                })}
                {!filtered.length && <p className="px-3 py-4 text-center text-sm text-[var(--fg-muted)]">Nothing matches.</p>}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
