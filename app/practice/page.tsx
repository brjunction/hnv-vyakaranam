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
        <div className="relative max-w-3xl mx-auto px-5 pt-16 pb-10 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-4">Practice</p>
          <h1 className="font-devanagari text-4xl sm:text-5xl mb-3">अभ्यासः</h1>
          <p className="text-[var(--fg-muted)] max-w-xl mx-auto">
            Test yourself, chapter by chapter, topic by topic — starting with Sandhi.
          </p>
        </div>
      </section>
      <PracticeApp />
    </>
  );
}
