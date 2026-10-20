import type { Metadata } from "next";
import Link from "next/link";
import { BOOKS } from "@/lib/anvyayaBooks";

export const metadata: Metadata = {
  title: "Scripture Anvyayas",
  description:
    "Anvyaya (prose order) and translation of the Śrīmad-Bhāgavatam and the Bhagavad-gītā — every verse, with Devanagari and a link to Śrīla Prabhupāda's purport on Vedabase.",
  alternates: { canonical: "/anvyaya" },
};

export default function AnvyayaHome() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="anv-hero-bg absolute inset-0" aria-hidden />
        <div className="relative max-w-5xl mx-auto px-5 pt-20 pb-20 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-saffron)] mb-5">
            Scripture Anvyayas
          </p>
          <h1 className="font-devanagari text-4xl sm:text-6xl leading-tight mb-5">अन्वयाः</h1>
          <div className="anv-ornament mb-6" aria-hidden>◆</div>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed text-[var(--fg)]">
            Read the great scriptures word by word. Every verse comes with its anvyaya — the prose
            order — and a translation, so the Sanskrit opens up for you.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          {BOOKS.map((b) => (
            <Link key={b.code} href={`/anvyaya/${b.code}`} className="anv-card p-8 group">
              <p className="anv-label mb-4">{b.code}</p>
              <p className="font-devanagari text-3xl sm:text-4xl leading-snug mb-2 group-hover:text-[var(--accent)] transition-colors">
                {b.titleDeva}
              </p>
              <h2 className="text-xl font-semibold mb-2">{b.title}</h2>
              <p className="text-sm italic text-[var(--fg-muted)] mb-5">{b.tagline}</p>
              <p className="text-sm leading-relaxed text-[var(--fg-muted)] mb-6">{b.description}</p>
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="anv-pill">
                  {b.divisions.length} {b.divisionPlural}
                </span>
                <span className="anv-pill">Anvyaya · {b.anvyayaBy}</span>
              </div>
              <span className="text-sm font-medium text-[var(--color-vermillion)]">Open the book →</span>
            </Link>
          ))}
        </div>

        <p className="text-center text-sm text-[var(--fg-muted)] mt-12">
          More scriptures will be added here in time.
        </p>
      </section>
    </>
  );
}
