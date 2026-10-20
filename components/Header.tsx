"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ThemeToggle from "./ThemeToggle";
import Image from "next/image";
import { BookOpen, ScrollText, BookMarked, Dumbbell, Info, LayoutGrid, Menu, X } from "lucide-react";

const links = [
  { href: "/chapters", label: "Chapters", icon: BookOpen },
  { href: "/anvyaya", label: "Scripture Anvyayas", icon: ScrollText },
  { href: "/practice", label: "Practice", icon: Dumbbell },
  // Served as a raw static HTML page (its own full document), not a Next
  // route — a plain <a> forces a normal browser navigation to it.
  { href: "/hnv-wiki", label: "HNV-Wiki", icon: BookMarked, external: true },
  { href: "/about", label: "About", icon: Info },
  { href: "/more", label: "More", icon: LayoutGrid },
];

function MobileMenu({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  // Rendered via a portal straight into <body> — deliberately NOT a
  // descendant of <header>. A header with backdrop-blur (backdrop-filter)
  // creates a CSS containing block for any `position: fixed` descendant,
  // which silently clips a fixed full-screen menu to the header's own
  // ~64px height instead of the viewport. Escaping to the body avoids
  // that entirely, rather than fighting z-index.
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-[var(--bg)] md:hidden flex flex-col">
      <div className="flex items-center justify-between px-5 h-16 border-b border-[var(--border)]">
        <Image src="/hnvlogo.png" alt="HNV Logo" width={40} height={40} />
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="p-2 -mr-2 text-[var(--fg)] hover:text-[var(--accent)] transition-colors"
        >
          <X size={26} strokeWidth={1.75} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-1">
        {links.map((l) => {
          const Icon = l.icon;
          const active = pathname === l.href || (l.href !== "/" && pathname?.startsWith(l.href));
          const className = `flex items-center gap-4 px-4 py-4 rounded-2xl text-lg transition-colors ${
            active ? "text-[var(--accent)] bg-[var(--bg-2)]" : "text-[var(--fg)] hover:bg-[var(--bg-2)]"
          }`;
          return "external" in l && l.external ? (
            <a key={l.href} href={l.href} className={className}>
              <Icon size={22} strokeWidth={1.75} /> {l.label}
            </a>
          ) : (
            <Link key={l.href} href={l.href} className={className}>
              <Icon size={22} strokeWidth={1.75} /> {l.label}
            </Link>
          );
        })}
      </nav>
    </div>,
    document.body
  );
}

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur border-b border-[var(--border)] bg-[var(--bg)]/85">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
           <Image src="/hnvlogo.png" alt="HNV Logo" width={40} height={40} />
          <span className="hidden sm:inline text-sm tracking-wide uppercase text-[var(--fg-muted)] group-hover:text-[var(--fg)] transition-colors">
            Harināmāmṛta Vyākaraṇa
          </span>
        </Link>

        {/* Desktop nav: icon only, label on hover via title + tooltip */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname === l.href || (l.href !== "/" && pathname?.startsWith(l.href));
            const className = `group relative flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
              active ? "text-[var(--accent)] bg-[var(--bg-2)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-2)]"
            }`;
            const inner = (
              <>
                <Icon size={19} strokeWidth={1.75} />
                <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs px-2 py-1 rounded-md bg-[var(--bg-2)] border border-[var(--border)] text-[var(--fg)] opacity-0 group-hover:opacity-100 transition-opacity">
                  {l.label}
                </span>
              </>
            );
            return "external" in l && l.external ? (
              <a key={l.href} href={l.href} aria-label={l.label} className={className}>
                {inner}
              </a>
            ) : (
              <Link key={l.href} href={l.href} aria-label={l.label} className={className}>
                {inner}
              </Link>
            );
          })}
          <span className="w-px h-5 bg-[var(--border)] mx-2" />
          <ThemeToggle />
        </nav>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="p-2 -mr-2 text-[var(--fg)] hover:text-[var(--accent)] transition-colors"
          >
            <Menu size={24} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {mounted && open && <MobileMenu onClose={() => setOpen(false)} />}
    </header>
  );
}
