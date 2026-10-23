"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ThemeToggle from "./ThemeToggle";
import NotebookButton from "@/components/notebook/Notebook";
import ToolsMenu, { ToolsGrid } from "@/components/tools/ToolsMenu";
import Image from "next/image";
import { BookSearch, SquareLibrary, Info, LayoutGrid, Menu, X, Earth, LandPlot, Wrench, ChevronDown, Music, GraduationCap, Landmark, type LucideIcon } from "lucide-react";
import NavMenu, { isActive, type NavItem } from "@/components/NavMenu";

// Header groups. Desktop: Study · Scriptures · Tools · About, then icons (More, Notebook, Theme).
const STUDY: NavItem[] = [
  { href: "/chapters", label: "Chapters", desc: "Harināmāmṛta-vyākaraṇam, sūtra by sūtra", icon: BookSearch },
  { href: "/practice", label: "Practice", desc: "Exercises, every answer tied to its sūtra", icon: LandPlot },
  // Served as a raw static HTML page (its own document) — a plain <a> navigates to it.
  { href: "/hnv-wiki", label: "HNV-Wiki", desc: "The sūtras explained simply", icon: Earth, external: true },
];
const SCRIPTURES: NavItem[] = [
  { href: "/scriptures", label: "Scriptures", desc: "The library of śāstra, verse by verse", icon: SquareLibrary },
  { href: "/songs", label: "Vaiṣṇava songs", desc: "Songs, aṣṭakams, stotras — A–Z", icon: Music },
  { href: "/scriptures/syllabus", label: "Śrīla Bhaktisiddhānta’s order", desc: "The order of study of śāstra", icon: Landmark },
];
const STUDY_PREFIXES = ["/chapters", "/brhat", "/laghu", "/practice", "/hnv-wiki"];
const SCRIPTURE_PREFIXES = ["/scriptures", "/songs"];


function MobileLink({ href, icon: Icon, label, active, external }: { href: string; icon: LucideIcon; label: string; active: boolean; external?: boolean }) {
  const cls = `flex items-center gap-4 px-4 py-3 rounded-2xl text-lg transition-colors ${active ? "text-[var(--accent)] bg-[var(--bg-2)]" : "text-[var(--fg)] hover:bg-[var(--bg-2)]"}`;
  const inner = (
    <>
      <Icon size={22} strokeWidth={1.75} /> {label}
    </>
  );
  return external ? (
    <a href={href} className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

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
      <nav className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-1">
        {(
          [
            ["Study", STUDY],
            ["Scriptures", SCRIPTURES],
          ] as [string, NavItem[]][]
        ).map(([g, items]) => (
          <div key={g} className="mb-2">
            <p className="px-4 pb-1 pt-2 text-xs font-semibold text-[var(--color-saffron)]">{g}</p>
            {items.map((l) => (
              <MobileLink key={l.href} href={l.href} icon={l.icon} label={l.label} external={l.external} active={isActive(pathname, [l.href])} />
            ))}
          </div>
        ))}
        <p className="px-4 pb-1 pt-2 text-xs font-semibold text-[var(--color-saffron)]">Tools</p>
        <button
          onClick={() => setToolsOpen((v) => !v)}
          aria-expanded={toolsOpen}
          className={`flex items-center gap-4 px-4 py-3 rounded-2xl text-lg transition-colors text-left ${
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
        <p className="px-4 pb-1 pt-3 text-xs font-semibold text-[var(--color-saffron)]">About</p>
        <MobileLink href="/about" icon={Info} label="About" active={isActive(pathname, ["/about"])} />
        <MobileLink href="/more" icon={LayoutGrid} label="Courses, resources & news" active={isActive(pathname, ["/more"])} />
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
          <span className="hidden sm:inline md:hidden xl:inline text-sm tracking-wide uppercase text-[var(--fg-muted)] group-hover:text-[var(--fg)] transition-colors">
            Harināmāmṛta Vyākaraṇam
          </span>
        </Link>

        {/* Desktop: four groups (icon above the name), then icon-only buttons */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main">
          <NavMenu label="Study" icon={GraduationCap} items={STUDY} prefixes={STUDY_PREFIXES} />
          <NavMenu label="Scriptures" icon={SquareLibrary} items={SCRIPTURES} prefixes={SCRIPTURE_PREFIXES} />
          <ToolsMenu />
          <Link href="/about" className={`nav-tab ${isActive(pathname, ["/about"]) ? "on" : ""}`}>
            <Info size={18} strokeWidth={1.8} />
            <span className="nav-label">About</span>
          </Link>
          <span className="w-px h-6 bg-[var(--border)] mx-2" />
          <Link
            href="/more"
            aria-label="More — courses, resources and news"
            title="More — courses, resources and news"
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isActive(pathname, ["/more"]) ? "bg-[var(--bg-2)] text-[var(--accent)]" : "text-[var(--fg-muted)] hover:bg-[var(--bg-2)] hover:text-[var(--fg)]"}`}
          >
            <LayoutGrid size={19} strokeWidth={1.75} />
          </Link>
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
