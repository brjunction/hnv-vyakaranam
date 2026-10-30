import type { Metadata } from "next";
import { getMemorize } from "@/lib/data/hnv";
import Memorize from "@/components/hnv/Memorize";

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: "/memorize" },
  title: "Sūtras for memorisation",
  description: "Every sūtra of Harināmāmṛta-vyākaraṇa at once, small and in columns — sūtras only, for memorisation.",
};

export default async function Page() {
  const chapters = await getMemorize("madhyama");
  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-12 pt-8 sm:px-6">
      <p className="mb-1 text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)]">Memorise</p>
      <h1 className="mb-1 text-2xl font-semibold sm:text-3xl">All sūtras at once</h1>
      <p className="mb-5 text-sm text-[var(--fg-muted)]">Sūtras only — no vṛtti or commentary. Choose the size and the number of columns; tap a number to open the sūtra.</p>
      <Memorize chapters={chapters} sutraBase="/sutras" />
    </div>
  );
}
