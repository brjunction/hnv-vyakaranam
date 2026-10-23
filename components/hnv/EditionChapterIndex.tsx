import Link from "next/link";
import EditionTabs from "@/components/EditionTabs";
import EditionComingSoon from "@/components/EditionComingSoon";
import { getChapterList } from "@/lib/data/hnv";
import { EDITIONS, type EditionSlug } from "@/lib/editions";

/** Table of contents for one edition, read from the database. */
export default async function EditionChapterIndex({ edition }: { edition: EditionSlug }) {
  const e = EDITIONS.find((x) => x.slug === edition)!;
  const list = await getChapterList(edition);
  if (list.length === 0 && edition !== "madhyama") return <EditionComingSoon slug={edition} />;

  return (
    <div className="max-w-4xl mx-auto px-5 py-16">
      <EditionTabs active={edition} />
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3">Table of contents</p>
      <h1 className="text-3xl sm:text-4xl font-semibold mb-4">The full {e.name} curriculum</h1>
      <p className="text-[var(--fg-muted)] mb-12 max-w-xl">
        Every prakaraṇa of Hari-nāmāmṛta Vyākaraṇa, {e.name} version, sūtra by sūtra.
      </p>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">
          The chapters will appear here.
        </div>
      ) : (
        <ol className="space-y-3">
          {list.map((ch) => (
            <li key={ch.slug}>
              <Link
                href={`${e.href}/${ch.slug}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] px-5 py-4 hover:border-[var(--accent)] transition-colors group"
              >
                <span className="flex items-baseline gap-4">
                  <span className="sutra-number text-sm text-[var(--fg-muted)] w-6">{ch.number ?? "—"}</span>
                  <span>
                    <span className="font-devanagari text-lg group-hover:text-[var(--accent)] transition-colors">
                      {ch.title}
                    </span>
                    <span className="block text-sm text-[var(--fg-muted)]">{ch.titleEn}</span>
                  </span>
                </span>
                <span className="text-xs text-[var(--fg-muted)] shrink-0">{ch.rangeLabel}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
