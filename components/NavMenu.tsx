"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

// A header group (Study, Scriptures …): icon above its name; opens a small
// menu on hover, click or keyboard focus.

export type NavItem = { href: string; label: string; desc: string; icon: LucideIcon; external?: boolean };

export function isActive(pathname: string | null, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname?.startsWith(`${p}/`));
}

export default function NavMenu({ label, icon: Icon, items, prefixes }: { label: string; icon: LucideIcon; items: NavItem[]; prefixes: string[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = isActive(pathname, prefixes);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 150);
  };
  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)} className={`nav-tab ${active || open ? "on" : ""}`}>
        <Icon size={18} strokeWidth={1.8} />
        <span className="nav-label">
          {label}
          <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
          <div role="menu" className="w-72 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]">
            {items.map((it) => {
              const I = it.icon;
              const on = isActive(pathname, [it.href]);
              const inner = (
                <>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-[var(--border)] ${on ? "bg-[var(--accent)] text-[var(--color-ink)]" : "bg-[var(--bg-2)] text-[var(--accent)]"}`}>
                    <I size={17} strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{it.label}</span>
                    <span className="block text-xs leading-snug text-[var(--fg-muted)]">{it.desc}</span>
                  </span>
                </>
              );
              const cls = "flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-[var(--bg-2)]";
              return it.external ? (
                <a key={it.href} href={it.href} role="menuitem" className={cls}>
                  {inner}
                </a>
              ) : (
                <Link key={it.href} href={it.href} role="menuitem" className={cls}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
