import Image from "next/image";
import Link from "next/link";

const NAV = [
  { href: "/chapters", label: "Chapters" },
  { href: "/anvyaya", label: "Scriptures" },
  { href: "/practice", label: "Practice" },
  { href: "/hnv-wiki", label: "HNV-Wiki" },
  { href: "/about", label: "About" },
  { href: "/more", label: "More" },
];

export default function Footer() {
  return (
    <footer className="hero-night mt-16">
      <div className="max-w-6xl mx-auto px-5 py-14 grid gap-10 md:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Image src="/hnvlogo.png" alt="" width={40} height={40} />
            <span className="font-display text-2xl text-white">Harināmāmṛta-vyākaraṇam</span>
          </div>
          <p className="font-devanagari text-lg text-white/90 mb-1" lang="sa-Deva">
            श्रीजीवो विजयतामसौ
          </p>
          <p className="text-sm text-[var(--hero-muted)] max-w-md">
            The masterpiece of Sanskrit grammar by Śrīla Jīva Gosvāmī, for online study.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 content-start">
          {NAV.map((l) =>
            // /hnv-wiki is a standalone static HTML file, so it needs a full page load.
            l.href === "/hnv-wiki" ? (
              <a key={l.href} href={l.href} className="text-[var(--hero-muted)] hover:text-white">
                {l.label}
              </a>
            ) : (
              <Link key={l.href} href={l.href} className="text-[var(--hero-muted)] hover:text-white">
                {l.label}
              </Link>
            )
          )}
        </nav>
      </div>
      <div className="border-t border-[var(--hero-line)]">
        <p className="max-w-6xl mx-auto px-5 py-6 text-sm text-[var(--hero-muted)] leading-relaxed">
          <span className="text-white font-semibold">Credits:</span> HG Matsya Avatāra Prabhu, HG Gaurapada Prabhu,
          Bhaktivedanta Book Trust (BBT), Rasvihari Lals and Sons Publications, Gaudiya Grantha Mandira.
        </p>
      </div>
    </footer>
  );
}
