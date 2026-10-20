import type { Metadata } from "next";
import Link from "next/link";
import { chapters } from "@/lib/content";

export const metadata: Metadata = {
  title: "Table of Contents",
  description:
    "The complete table of contents of Hari-nāmāmṛta Vyākaraṇa — Maṅgalācaraṇa through the Afterword, with every prakaraṇa and sūtra.",
};

export default function ChaptersIndex() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3">
        Table of contents
      </p>
      <h1 className="text-3xl sm:text-4xl font-semibold mb-4">The full Madhyama curriculum</h1>
      <p className="text-[var(--fg-muted)] mb-12 max-w-xl">
        Every prakaraṇa of Hari-nāmāmṛta Vyākaraṇa, Madhyama version, sūtra by sūtra.
      </p>

      <ol className="space-y-3">
        {chapters.map((ch) => (
          <li key={ch.slug}>
            <Link
              href={`/chapters/${ch.slug}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] px-5 py-4 hover:border-[var(--accent)] transition-colors group"
            >
              <span className="flex items-baseline gap-4">
                <span className="sutra-number text-sm text-[var(--fg-muted)] w-6">
                  {ch.number === 0 || ch.number === 8 ? "—" : ch.number}
                </span>
                <span>
                  <span className="font-devanagari text-lg group-hover:text-[var(--accent)] transition-colors">
                    {ch.title}
                  </span>
                  <span className="block text-sm text-[var(--fg-muted)]">{ch.titleEnglish}</span>
                </span>
              </span>
              <span className="text-xs text-[var(--fg-muted)] shrink-0">{ch.sutraRange}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
