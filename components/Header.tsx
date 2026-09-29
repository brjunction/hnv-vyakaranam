import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/chapters", label: "Chapters" },
  { href: "/anvyaya", label: "Scripture Anvyayas", short: "Anvyayas" },
  // Served as a raw static HTML page (its own full document), not a Next
  // route — a plain <a> below forces a normal browser navigation to it.
  { href: "/hnv-wiki", label: "HNV-Wiki", external: true },
  { href: "/about", label: "About" },
  { href: "/more", label: "More" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur border-b border-[var(--border)] bg-[var(--bg)]/85">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2 group">
          <span className="font-devanagari text-xl text-[var(--accent)]">हरि</span>
          <span className="hidden sm:inline text-sm tracking-wide uppercase text-[var(--fg-muted)] group-hover:text-[var(--fg)] transition-colors">
            Harināmāmṛta Vyākaraṇa
          </span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
          {links.map((l) =>
            "external" in l && l.external ? (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
              >
                {"short" in l ? (
                  <>
                    <span className="sm:hidden">{l.short}</span>
                    <span className="hidden sm:inline">{l.label}</span>
                  </>
                ) : (
                  l.label
                )}
              </a>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
              >
                {"short" in l ? (
                  <>
                    <span className="sm:hidden">{l.short}</span>
                    <span className="hidden sm:inline">{l.label}</span>
                  </>
                ) : (
                  l.label
                )}
              </Link>
            )
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
