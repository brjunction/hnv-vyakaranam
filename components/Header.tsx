"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ThemeToggle from "./ThemeToggle";
import NotebookButton from "@/components/notebook/Notebook";
import ToolsMenu, { ToolsGrid } from "@/components/tools/ToolsMenu";
import Image from "next/image";
import { BookSearch, SquareLibrary, Info, LayoutGrid, Menu, X, Earth, LandPlot, Wrench, ChevronDown, Music } from "lucide-react";

const links = [
  { href: "/chapters", label: "Chapters", icon: BookSearch },
  { href: "/scriptures", label: "Scriptures", icon: SquareLibrary },
  { href: "/songs", label: "Songs", icon: Music },
  { href: "/practice", label: "Practice", icon: LandPlot },
  // Served as a raw static HTML page (its own full document), not a Next
  // route — a plain <a> forces a normal browser navigation to it.
  { href: "/hnv-wiki", label: "HNV-Wiki", icon: Earth, external: true },
  { href: "/about", label: "About", icon: Info },
  { href: "/more", label: "More", icon: LayoutGrid },
];

function MobileMenu({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(pathname?.startsWith("/tools") ?? false);
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
          if (l.href === "/more") return null;
          const Icon = l.icon;
          const active =
            pathname === l.href ||
            (l.href !== "/" && pathname?.startsWith(l.href)) ||
            (l.href === "/chapters" && /^\/(brhat|laghu)\/chapters/.test(pathname ?? ""));
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
        <button
          onClick={() => setToolsOpen((v) => !v)}
          aria-expanded={toolsOpen}
          className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-lg transition-colors text-left ${
            pathname?.startsWith("/tools") ? "text-[var(--accent)] bg-[var(--bg-2)]" : "text-[var(--fg)] hover:bg-[var(--bg-2)]"
          }`}
        >
          <Wrench size={22} strokeWidth={1.75} /> Tools
          <ChevronDown size={18} className={`ml-auto transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
        </button>
        {toolsOpen && (
          <div className="px-2 pb-4">
            <ToolsGrid compact onNavigate={onClose} />
          </div>
        )}
        <Link
          href="/more"
          className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-lg transition-colors ${
            pathname?.startsWith("/more") ? "text-[var(--accent)] bg-[var(--bg-2)]" : "text-[var(--fg)] hover:bg-[var(--bg-2)]"
          }`}
        >
          <LayoutGrid size={22} strokeWidth={1.75} /> More
        </Link>
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
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 group">
           <Image src="/hnvlogo.png" alt="HNV Logo" width={40} height={40} />
          <span className="hidden sm:inline md:hidden 2xl:inline text-sm tracking-wide uppercase text-[var(--fg-muted)] group-hover:text-[var(--fg)] transition-colors">
            Harināmāmṛta Vyākaraṇam
          </span>
        </Link>

        {/* Desktop nav: labelled tabs — an icon in a small circle inside a soft rounded rectangle */}
        <nav className="hidden md:flex items-center gap-0.5 xl:gap-1">
          {[...links.filter((l) => l.href !== "/more"), "tools" as const, ...links.filter((l) => l.href === "/more")].map((l) => {
            if (l === "tools") return <ToolsMenu key="tools" />;
            const Icon = l.icon;
            const active =
              pathname === l.href ||
              (l.href !== "/" && pathname?.startsWith(l.href)) ||
              (l.href === "/chapters" && /^\/(brhat|laghu)\/chapters/.test(pathname ?? ""));
            const inner = (
              <>
                <span className="nav-ic">
                  <Icon size={15} strokeWidth={1.9} />
                </span>
                <span className="nav-label">{l.label}</span>
              </>
            );
            const cls = `nav-tab ${active ? "on" : ""}`;
            return "external" in l && l.external ? (
              <a key={l.href} href={l.href} aria-label={l.label} title={l.label} className={cls}>
                {inner}
              </a>
            ) : (
              <Link key={l.href} href={l.href} aria-label={l.label} title={l.label} className={cls} aria-current={active ? "page" : undefined}>
                {inner}
              </Link>
            );
          })}
          <span className="w-px h-5 bg-[var(--border)] mx-1.5" />
          <NotebookButton />
          <ThemeToggle />
        </nav>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex md:hidden items-center gap-1">
          <NotebookButton />
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
