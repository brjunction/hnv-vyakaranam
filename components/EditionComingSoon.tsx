import Link from "next/link";
import { EDITIONS, type EditionSlug } from "@/lib/editions";
import EditionTabs from "@/components/EditionTabs";

/** Honest placeholder for an edition whose sūtras haven't been entered yet. */
export default function EditionComingSoon({ slug }: { slug: Exclude<EditionSlug, "madhyama"> }) {
  const e = EDITIONS.find((x) => x.slug === slug)!;
  return (
    <div className="max-w-4xl mx-auto px-5 py-16">
      <EditionTabs active={slug} />
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3">Table of contents</p>
      <h1 className="text-3xl sm:text-4xl font-semibold mb-2">{e.name} Harināmāmṛta-vyākaraṇa</h1>
      <p className="font-devanagari text-xl text-[var(--fg-muted)] mb-10">{e.deva} हरिनामामृतव्याकरणम्</p>
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
        <p className="text-lg font-medium mb-2">The {e.name} sūtras are being prepared.</p>
        <p className="text-[var(--fg-muted)] max-w-md mx-auto mb-6">
          They will appear here chapter by chapter as they are entered. Meanwhile, the Madhyama edition is complete.
        </p>
        <Link href="/chapters" className="inline-block px-6 py-3 rounded-full bg-[var(--accent)] text-[var(--color-ink)] font-medium hover:opacity-90">
          Read the Madhyama edition
        </Link>
      </div>
    </div>
  );
}
