import Image from "next/image";
import Link from "next/link";

// Site map footer: every main page, grouped as in the header.
const COLUMNS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: "Study",
    links: [
      { href: "/chapters", label: "Chapters — Madhyama" },
      { href: "/brhat/chapters", label: "Bṛhat edition" },
      { href: "/laghu/chapters", label: "Laghu edition" },
      { href: "/practice", label: "Practice" },
      { href: "/hnv-wiki", label: "HNV-Wiki", external: true },
    ],
  },
  {
    title: "Scriptures",
    links: [
      { href: "/scriptures", label: "Scripture library" },
      { href: "/scriptures/search", label: "Search verses" },
      { href: "/scriptures/read", label: "Dual reading" },
      { href: "/scriptures/syllabus", label: "Śrīla Bhaktisiddhānta’s order" },
      { href: "/songs", label: "Vaiṣṇava Bhajans" },
    ],
  },
  {
    title: "Tools",
    links: [
      { href: "/tools/dictionary/search", label: "Sanskrit dictionary" },
      { href: "/tools", label: "All tools" },
      { href: "/notes", label: "My notebook" },
    ],
  },
  {
    title: "More",
    links: [
      { href: "/more", label: "Courses & resources" },
      { href: "/about", label: "About" },
      { href: "/about/acknowledgements", label: "Acknowledgements" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-7 border-t border-[var(--border)] bg-[var(--bg-2)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.2fr_2fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/hnvlogo.png" alt="" width={40} height={40} />
            <span className="font-semibold">Harināmāmṛta-Vyākaraṇam</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--fg-muted)]">
            Śrīla Jīva Gosvāmī’s grammar of the holy names — sūtras, scriptures, bhajans and a Sanskrit dictionary, in one place.
          </p>
        </div>
        <nav aria-label="Site map" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="mb-3 text-sm font-semibold">{c.title}</p>
              <ul className="grid gap-2 text-sm">
                {c.links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a href={l.href} className="text-[var(--fg-muted)] transition-colors hover:text-[var(--accent)]">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-[var(--fg-muted)] transition-colors hover:text-[var(--accent)]">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-[var(--border)]">
        <p className="mx-auto max-w-6xl px-5 py-4 text-xs text-[var(--fg-muted)]">Harināmāmṛta-Vyākaraṇam — the masterpiece of Sanskrit grammar.</p>
      </div>
    </footer>
  );
}
