"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, ListTree, Dumbbell, BookA, BookOpenText, Quote, CalendarDays, Users, Wrench, UserRound,
  PanelLeftClose, PanelLeftOpen, Menu, X, Sun, Moon, ExternalLink, LogOut, ChevronsUpDown, type LucideIcon,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";

type Item = { href: string; label: string; icon: LucideIcon; owner?: boolean };
const GROUPS: { label: string; items: Item[] }[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Content",
    items: [
      { href: "/admin/hnv", label: "Chapters & sūtras", icon: ListTree },
      { href: "/admin/practice", label: "Practice", icon: Dumbbell },
      { href: "/admin/dictionaries", label: "Dictionaries", icon: BookA },
    ],
  },
  {
    label: "Daily",
    items: [
      { href: "/admin/verses", label: "Verse of the Day", icon: BookOpenText },
      { href: "/admin/subhashita", label: "Subhāṣita", icon: Quote },
      { href: "/admin/schedule", label: "Schedule", icon: CalendarDays },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/users", label: "Admins", icon: Users, owner: true },
      { href: "/admin/tools", label: "Tools", icon: Wrench, owner: true },
      { href: "/admin/account", label: "Account", icon: UserRound },
    ],
  },
];

const KEY = "hnv-admin-sidebar";

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };
  return { dark, toggle };
}

function Nav({ role, collapsed, onNavigate }: { role: string; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex flex-col gap-5">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => !i.owner || role === "owner");
        if (!items.length) return null;
        return (
          <div key={g.label}>
            {!collapsed && <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-[var(--a-fg-muted)]">{g.label}</p>}
            <ul className="grid gap-0.5">
              {items.map(({ href, label, icon: Icon }) => {
                const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      title={collapsed ? label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex h-9 items-center gap-3 rounded-lg text-sm transition-colors ${
                        collapsed ? "justify-center px-0" : "px-3"
                      } ${
                        active
                          ? "bg-[var(--a-card)] font-medium text-[var(--a-fg)] shadow-[var(--a-shadow)] ring-1 ring-[var(--a-border)]"
                          : "text-[var(--a-fg-muted)] hover:bg-[var(--a-card)] hover:text-[var(--a-fg)]"
                      }`}
                    >
                      {active && !collapsed && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[var(--a-brand)]" />}
                      <Icon size={17} strokeWidth={1.8} className={active ? "text-[var(--a-brand)]" : ""} />
                      {!collapsed && <span className="truncate">{label}</span>}
                      {collapsed && (
                        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-[var(--a-primary)] px-2 py-1 text-xs text-[var(--a-primary-fg)] opacity-0 shadow-[var(--a-shadow-lg)] transition-opacity group-hover:opacity-100">
                          {label}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function UserMenu({ user, collapsed }: { user: { name: string; email: string; role: string }; collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const initials = user.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[var(--a-card)] ${collapsed ? "justify-center" : ""}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--a-primary)] text-xs font-semibold text-[var(--a-primary-fg)]">
          {initials}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user.name}</span>
              <span className="block truncate text-xs capitalize text-[var(--a-fg-muted)]">{user.role}</span>
            </span>
            <ChevronsUpDown size={15} className="text-[var(--a-fg-muted)]" />
          </>
        )}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-60 rounded-xl border border-[var(--a-border)] bg-[var(--a-card)] p-1.5 shadow-[var(--a-shadow-lg)]">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-[var(--a-fg-muted)]">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-[var(--a-border)]" />
          <Link href="/admin/account" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-[var(--a-muted)]">
            <UserRound size={15} /> Account &amp; password
          </Link>
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-[var(--a-muted)]">
            <ExternalLink size={15} /> View site
          </a>
          <div className="my-1 h-px bg-[var(--a-border)]" />
          <form action={logout}>
            <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[var(--a-danger)] hover:bg-[var(--a-muted)]">
              <LogOut size={15} /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function AdminShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const pathname = usePathname();
  const { dark, toggle } = useTheme();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(KEY) === "1");
    } catch {}
  }, []);
  useEffect(() => setMobile(false), [pathname]);

  const setC = (v: boolean) => {
    setCollapsed(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {}
  };

  const brand = (small: boolean) => (
    <Link href="/admin" className={`flex items-center gap-2.5 ${small ? "justify-center" : "px-1"}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--a-card)] shadow-[var(--a-shadow)] ring-1 ring-[var(--a-border)]">
        <Image src="/hnvlogo.png" alt="" width={22} height={22} />
      </span>
      {!small && (
        <span className="leading-tight">
          <span className="block text-sm font-semibold">HNV Admin</span>
          <span className="block text-[11px] text-[var(--a-fg-muted)]">Harināmāmṛta</span>
        </span>
      )}
    </Link>
  );

  return (
    <div className="admin-ui min-h-dvh">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[var(--a-border)] bg-[var(--a-muted)]/60 backdrop-blur transition-[width] duration-200 lg:flex ${
          collapsed ? "w-[4.25rem] px-2.5" : "w-64 px-3"
        }`}
      >
        <div className="flex h-14 items-center">{brand(collapsed)}</div>
        <div className="flex-1 overflow-y-auto py-3">
          <Nav role={user.role} collapsed={collapsed} />
        </div>
        <div className="border-t border-[var(--a-border)] py-3">
          <UserMenu user={user} collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobile(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-[var(--a-border)] bg-[var(--a-bg)] px-3 shadow-[var(--a-shadow-lg)]">
            <div className="flex h-14 items-center justify-between">
              {brand(false)}
              <button onClick={() => setMobile(false)} aria-label="Close menu" className="rounded-md p-2 hover:bg-[var(--a-muted)]">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3">
              <Nav role={user.role} collapsed={false} onNavigate={() => setMobile(false)} />
            </div>
            <div className="border-t border-[var(--a-border)] py-3">
              <UserMenu user={user} collapsed={false} />
            </div>
          </aside>
        </div>
      )}

      <div className={`transition-[padding] duration-200 ${collapsed ? "lg:pl-[4.25rem]" : "lg:pl-64"}`}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[var(--a-border)] bg-[var(--a-bg)]/80 px-3 backdrop-blur sm:px-5">
          <button onClick={() => setMobile(true)} aria-label="Open menu" className="rounded-md p-2 hover:bg-[var(--a-muted)] lg:hidden">
            <Menu size={18} />
          </button>
          <button
            onClick={() => setC(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden rounded-md p-2 text-[var(--a-fg-muted)] hover:bg-[var(--a-muted)] hover:text-[var(--a-fg)] lg:inline-flex"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <span className="mx-1 hidden h-5 w-px bg-[var(--a-border)] lg:block" />
          <span className="truncate text-sm text-[var(--a-fg-muted)]">Harināmāmṛta-vyākaraṇam</span>
          <div className="ml-auto flex items-center gap-1.5">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden h-8 items-center gap-1.5 rounded-lg border border-[var(--a-border)] bg-[var(--a-card)] px-3 text-sm shadow-[var(--a-shadow-sm)] hover:bg-[var(--a-muted)] sm:inline-flex"
            >
              <ExternalLink size={14} /> View site
            </a>
            <button
              onClick={toggle}
              aria-label="Toggle light or dark mode"
              title={dark ? "Light mode" : "Dark mode"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--a-border)] bg-[var(--a-card)] shadow-[var(--a-shadow-sm)] hover:bg-[var(--a-muted)]"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
