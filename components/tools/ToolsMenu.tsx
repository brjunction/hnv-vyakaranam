"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wrench, ChevronDown } from "lucide-react";
import { TOOL_GROUPS, toolHref } from "@/lib/tools";

/** The grouped tool list (used in the desktop dropdown and the mobile menu). */
export function ToolsGrid({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  return (
    <div className={compact ? "grid gap-5" : "grid gap-6 md:grid-cols-3"}>
      {TOOL_GROUPS.map((g) => (
        <div key={g.slug}>
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-saffron)]">{g.name}</p>
          <ul className="grid gap-0.5">
            {g.tools.map((t) => {
              const Icon = t.icon;
              return (
                <li key={t.slug}>
                  <Link
                    href={toolHref(g, t)}
                    onClick={onNavigate}
                    className="group/t flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[var(--bg-2)]"
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                        t.ready
                          ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "border-[var(--border)] text-[var(--fg-muted)]"
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-medium text-[var(--fg)] group-hover/t:text-[var(--accent)]">
                        {t.name}
                        {!t.ready && (
                          <span className="rounded-full border border-[var(--border)] px-1.5 text-[10px] font-normal text-[var(--fg-muted)]">
                            soon
                          </span>
                        )}
                      </span>
                      {!compact && <span className="block text-xs leading-snug text-[var(--fg-muted)]">{t.blurb}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Desktop: icon button that opens the tools panel on hover or focus. */
export default function ToolsMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = pathname?.startsWith("/tools");

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
      <Link href="/tools" aria-label="Tools" title="Tools" aria-expanded={open} className={`nav-tab ${active || open ? "on" : ""}`}>
        <span className="nav-ic">
          <Wrench size={15} strokeWidth={1.9} />
        </span>
        <span className="nav-label">Tools</span>
        <ChevronDown size={13} className={`-ml-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </Link>
      {open && (
        <div className="absolute right-0 top-full z-50 pt-3">
          <div className="w-[min(860px,calc(100vw-2rem))] rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]">
            <div className="mb-4 flex items-baseline justify-between px-2">
              <p className="font-semibold">Tools</p>
              <Link href="/tools" className="text-xs text-[var(--fg-muted)] hover:text-[var(--accent)]">
                All tools →
              </Link>
            </div>
            <ToolsGrid />
          </div>
        </div>
      )}
    </div>
  );
}
