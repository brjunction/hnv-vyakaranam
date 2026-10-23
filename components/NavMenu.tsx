"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, type LucideIcon } from "lucide-react";

// A header group (Study, Scriptures …): a tab with its icon beside the name,
// opening a panel of large tiles (like the Tools menu) on hover, click or focus.

export type NavItem = {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  external?: boolean;
  /** Quick links shown inside the tile. */
  links?: { href: string; label: string; external?: boolean }[];
};

export function isActive(pathname: string | null, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname?.startsWith(`${p}/`));
}

function A({ href, external, className, children }: { href: string; external?: boolean; className: string; children: React.ReactNode }) {
  return external ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default function NavMenu({
  label,
  icon: Icon,
  items,
  prefixes,
  title,
  intro,
}: {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  prefixes: string[];
  title: string;
  intro: string;
}) {
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
      <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)} className={`nav-tab ${active || open ? "on" : ""}`}>
        <Icon size={17} strokeWidth={1.8} />
        <span className="nav-label">{label}</span>
        <ChevronDown size={13} className={`-ml-0.5 opacity-70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="fixed left-1/2 top-[3.75rem] z-50 -translate-x-1/2 pt-1">
          <div className={`rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] ${items.length > 2 ? "w-[min(760px,calc(100vw-2rem))]" : "w-[min(560px,calc(100vw-2rem))]"}`}>
            <div className="mb-3 px-1">
              <p className="font-semibold">{title}</p>
              <p className="text-xs text-[var(--fg-muted)]">{intro}</p>
            </div>
            <div className={`grid gap-3 ${items.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {items.map((it) => {
                const I = it.icon;
                const on = isActive(pathname, [it.href]);
                return (
                  <div key={it.href} className={`nav-tile ${on ? "on" : ""}`}>
                    <A href={it.href} external={it.external} className="group/tile block">
                      <span className="nav-tile-ic">
                        <I size={19} strokeWidth={1.75} />
                      </span>
                      <span className="mt-3 flex items-center gap-1 text-[15px] font-semibold group-hover/tile:text-[var(--accent)]">
                        {it.label}
                        <ArrowRight size={14} className="opacity-0 transition-all group-hover/tile:translate-x-0.5 group-hover/tile:opacity-100" />
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-[var(--fg-muted)]">{it.desc}</span>
                    </A>
                    {it.links && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3">
                        {it.links.map((l) => (
                          <A key={l.href} href={l.href} external={l.external} className="rounded-md border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--fg-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--fg)]">
                            {l.label}
                          </A>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
