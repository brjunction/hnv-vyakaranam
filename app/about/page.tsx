import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Śrī Harinamamrita Vyakarana",
  description: "About Hari-nāmāmṛta Vyākaraṇa, Śrīla Jīva Gosvāmī's grammar of the holy names.",
};

// Replace everything below with your own write-up about the text itself —
// what it is, its structure, why it was composed, how to use this site, etc.
export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3">About</p>
      <h1 className="text-3xl sm:text-4xl font-semibold mb-2">Hari-nāmāmṛta Vyākaraṇa</h1>
      <p className="text-[var(--fg-muted)] mb-10">About this text and this edition</p>

      <div className="space-y-10 leading-relaxed text-[var(--fg)]">
        <section>
          <h2 className="text-xl font-medium mb-3 text-[var(--color-vermillion)]">
            What is Hari-nāmāmṛta Vyākaraṇa?
          </h2>
          <p className="text-[var(--fg-muted)]">
            Write your introduction to the text here — what it is, who composed it, and what
            makes it distinct as a Sanskrit grammar built entirely around the holy names.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-3 text-[var(--color-vermillion)]">
            How this edition is organized
          </h2>
          <p className="text-[var(--fg-muted)]">
            Write about the structure of this edition — the chapters, sections, and how the
            sūtras, vṛtti, and notes relate to one another.
          </p>
        </section>
      </div>
    </div>
  );
}
