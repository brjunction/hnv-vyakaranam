import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import WordList from "@/components/tools/WordList";
import terms from "@/lib/data/static/terms.json";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/dictionary/term-mapper" },
  title: "Pāṇini ↔ HNV Terms",
  description: "Śrīla Jīva Gosvāmī’s grammatical terms beside Pāṇini’s (HNV Vol. 1, Appendix 3): saṁjñās, tenses, compounds and kṛt suffixes.",
};

export default function TermMapperPage() {
  const rows = terms as { h: string; p: string; s: string }[];
  const sections = [...new Set(rows.map((r) => r.s))];
  return (
    <>
      <PageHead title="Pāṇini ↔ HNV Terms" intro="Śrīla Jīva Gosvāmī’s terms in Harināmāmṛta beside the Aṣṭādhyāyī’s — from HNV Volume 1, Appendix 3." />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <WordList
          rows={rows}
          cols={[
            { key: "h", label: "Harināmāmṛta", sa: true, width: "35%" },
            { key: "p", label: "Aṣṭādhyāyī (Pāṇini)", sa: true, width: "35%" },
            { key: "s", label: "Group" },
          ]}
          filters={[{ key: "s", label: "Group", options: sections.map((s) => ({ value: s, label: s })) }]}
        />
      </div>
    </>
  );
}
