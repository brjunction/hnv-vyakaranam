"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ThemeToggle from "./ThemeToggle";
import NotebookButton from "@/components/notebook/Notebook";
import ToolsMenu, { ToolsGrid } from "@/components/tools/ToolsMenu";
import Image from "next/image";
import { BookSearch, SquareLibrary, Info, LayoutGrid, Menu, X, Earth, LandPlot, Wrench, ChevronDown, Music, GraduationCap, Landmark, Mail, type LucideIcon } from "lucide-react";
import NavMenu, { isActive, type NavItem } from "@/components/NavMenu";

// Header groups. Desktop: Study · Scriptures · Tools · About, then icons (More, Notebook, Theme).
const STUDY: NavItem[] = [
  {
    href: "/chapters",
    label: "Chapters",
    desc: "Harināmāmṛta-vyākaraṇam sūtra by sūtra — vṛtti, translation and commentaries.",
    icon: BookSearch,
    links: [
      { href: "/chapters", label: "Madhyama" },
      { href: "/brhat/chapters", label: "Bṛhat" },
      { href: "/laghu/chapters", label: "Laghu" },
    ],
  },
  { href: "/practice", label: "Practice", desc: "Sandhi exercises by topic and level — every answer shows its sūtra.", icon: LandPlot },
  // Served as a raw static HTML page (its own document) — a plain <a> navigates to it.
  { href: "/hnv-wiki", label: "HNV-Wiki", desc: "The sūtras explained simply, with meanings and examples.", icon: Earth, external: true },
];
const SCRIPTURES: NavItem[] = [
  {
    href: "/scriptures",
    label: "Scriptures",
    desc: "The library of śāstra — verse by verse, with synonyms, anvaya, translation and commentaries.",
    icon: SquareLibrary,
    links: [
      { href: "/scriptures", label: "Library" },
      { href: "/scriptures/search", label: "Search verses" },
      { href: "/scriptures/read", label: "Dual reading" },
      { href: "/scriptures/syllabus", label: "Bhaktisiddhānta’s order" },
    ],
  },
  {
    href: "/songs",
    label: "Vaiṣṇava Bhajans",
    desc: "Songs of the ācāryas, aṣṭakams and stotras — search any bhajan, A–Z.",
    icon: Music,
    links: [
      { href: "/songs", label: "All bhajans" },
    ],
  },
];
const ABOUT: NavItem[] = [
  { href: "/about", label: "About this grammar", desc: "Śrīla Jīva Gosvāmī’s Hari-nāmāmṛta-vyākaraṇa and this website.", icon: Info },
  { href: "/about/acaryas", label: "Ācārya biographies", desc: "The disciplic succession, from Śrī Kṛṣṇa to Śrīla Prabhupāda.", icon: GraduationCap },
  { href: "/about/places", label: "Holy places & temples", desc: "Holy dhāmas and important ISKCON temples.", icon: Landmark },
  { href: "/about/acknowledgements", label: "Acknowledgements", desc: "With gratitude to all whose work makes this possible.", icon: Earth },
  { href: "/about/contact", label: "Contact", desc: "Write or call: questions, corrections and seva.", icon: Mail },
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
        <p className="px-4 pb-1 pt-3 text-xs font-semibold text-[var(--color-saffron)]">More</p>
        <MobileLink href="/more" icon={LayoutGrid} label="More — courses & resources" active={isActive(pathname, ["/more"])} />
        {ABOUT.map((a) => (
          <MobileLink key={a.href} href={a.href} icon={a.icon} label={a.label} active={pathname === a.href} />
        ))}
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

        {/* Desktop: Study · Scriptures · Tools · More · About | Notebook · Theme */}
        <nav className="hidden md:flex items-center gap-0.5 lg:gap-1" aria-label="Main">
          <NavMenu label="Study" icon={GraduationCap} items={STUDY} prefixes={STUDY_PREFIXES} title="Study" intro="Learn Harināmāmṛta-vyākaraṇam, step by step." />
          <NavMenu label="Scriptures" icon={SquareLibrary} items={SCRIPTURES} prefixes={SCRIPTURE_PREFIXES} title="Scriptures" intro="Read śāstra and sing the songs of the ācāryas." />
          <ToolsMenu />
          <Link href="/more" className={`nav-tab ${isActive(pathname, ["/more"]) ? "on" : ""}`} title="Courses, resources and news">
            <LayoutGrid size={17} strokeWidth={1.8} />
            <span className="nav-label">More</span>
          </Link>
          <NavMenu label="About" icon={Info} items={ABOUT} prefixes={["/about"]} title="About" intro="The grammar, our ācāryas, holy places and thanks." />
          <span className="w-px h-6 bg-[var(--border)] mx-1.5" />
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
