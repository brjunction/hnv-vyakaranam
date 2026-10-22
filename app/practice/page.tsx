import type { Metadata } from "next";
import PracticeApp from "./PracticeApp";

export const metadata: Metadata = {
  title: "Practice",
  description: "Practice Sandhi and Sandhi-viccheda from Hari-nāmāmṛta Vyākaraṇa — choose a chapter, topic, and difficulty, then test yourself.",
};

export default function PracticePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="anv-hero-bg absolute inset-0" aria-hidden />
        <div className="relative max-w-5xl mx-auto px-5 pt-14 pb-12 grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div className="text-center md:text-left">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-4">Practice</p>
            <h1 className="font-devanagari text-5xl sm:text-6xl mb-4">अभ्यासः</h1>
            <p className="text-lg text-[var(--fg-muted)] max-w-md mx-auto md:mx-0">
              Test yourself chapter by chapter. Every answer shows the sūtra behind it, so each round teaches as well as
              tests.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-3">
            {[
              ["30", "verified questions"],
              ["3", "kinds of sandhi"],
              ["41–86", "sūtras covered"],
            ].map(([n, label]) => (
              <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)]/70 p-4 text-center">
                <dt className="sr-only">{label}</dt>
                <dd className="text-2xl sm:text-3xl font-semibold text-[var(--accent)] sutra-number">{n}</dd>
                <dd className="text-xs text-[var(--fg-muted)] mt-1">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <PracticeApp />
    </>
  );
}
