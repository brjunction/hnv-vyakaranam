import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import WordList from "@/components/tools/WordList";
import rows from "@/lib/data/static/concordance.json";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/grammar/concordance" },
  title: "Sūtra Concordance: HNV ↔ Pāṇini",
  description: "Every Bṛhat sūtra of Harināmāmṛta with its Madhyama number, the matching Aṣṭādhyāyī sūtra and Siddhānta-kaumudī number (HNV Vol. 2, Appendix 3).",
};

export default function ConcordancePage() {
  return (
    <>
      <PageHead title="Sūtra Concordance" intro="All 3181 Bṛhat sūtras with the Madhyama number, the equivalent Aṣṭādhyāyī sūtra and the Siddhānta-kaumudī number — from HNV Volume 2, Appendix 3." />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <WordList
          rows={rows as Record<string, string | number>[]}
          cols={[
            { key: "b", label: "Bṛhat", width: "4rem" },
            { key: "t", label: "Sūtra (Harināmāmṛta)", sa: true, width: "34%" },
            { key: "m", label: "Madhyama", width: "5rem" },
            { key: "a", label: "Aṣṭādhyāyī", sa: true, width: "34%" },
            { key: "k", label: "Siddhānta-kaumudī" },
          ]}
        />
      </div>
    </>
  );
}
