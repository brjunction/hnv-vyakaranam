import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import AvyayaSearch from "@/components/tools/AvyayaSearch";
import avyayas from "@/lib/data/static/avyayas.json";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/dictionary/avyaya" },
  title: "Avyaya-śabda-saṅgraha",
  description: "Indeclinable words (avyayas) with their Sanskrit and English meanings — searchable in any script.",
};

export default function AvyayaPage() {
  return (
    <>
      <PageHead title="Avyaya-śabda-saṅgraha" intro="The indeclinable words (avyayas), with their meanings in Sanskrit and in English." />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <AvyayaSearch rows={avyayas as Record<string, string>[]} />
      </div>
    </>
  );
}
