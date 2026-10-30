import Image from "next/image";
import Link from "next/link";

// Site map footer: every main page, grouped as in the header.
const COLUMNS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: "Study",
    links: [
      { href: "/chapters", label: "Madhyama edition" },
      { href: "/brhat/chapters", label: "Bṛhat edition" },
      { href: "/laghu/chapters", label: "Laghu edition" },
      { href: "/chapters/samjna-sandhi-prakarana", label: "Saṁjñā & Sandhi" },
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
      { href: "/more", label: "Courses & resources" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About this grammar" },
      { href: "/about/acaryas", label: "Ācārya biographies" },
      { href: "/about/places", label: "Holy places & temples" },
      { href: "/about/acknowledgements", label: "Acknowledgements" },
      { href: "/about/contact", label: "Contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-7 border-t border-[var(--border)] bg-[var(--bg-2)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[1.1fr_2.4fr]">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/hnvlogo.png" alt="" width={40} height={40} />
            <span className="font-semibold">Harināmāmṛta-Vyākaraṇam</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--fg-muted)]">
            Śrīla Jīva Gosvāmī’s grammar of the holy names — sūtras, scriptures, bhajans and a Sanskrit dictionary, in one place.
          </p>
          <p className="mt-4 font-devanagari text-lg text-[var(--accent)]">श्री हरिनामामृत व्याकरणम्</p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">The Grammar of the Holy Names of Lord Hari</p>
        </div>
        <nav aria-label="Site map" className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4 lg:text-left">
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
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 py-4 text-center text-xs text-[var(--fg-muted)] sm:flex-row sm:flex-wrap sm:justify-between sm:text-left">
          <p>Harināmāmṛta-Vyākaraṇam — the masterpiece of Sanskrit grammar.</p>
          <p>Hare Kṛṣṇa Hare Kṛṣṇa Kṛṣṇa Kṛṣṇa Hare Hare · Hare Rāma Hare Rāma Rāma Rāma Hare Hare</p>
        </div>
      </div>
    </footer>
  );
}
