import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import DhatuSearch from "@/components/tools/DhatuSearch";
import dhatus from "@/lib/data/static/dhatus.json";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/dictionary/dhatu" },
  title: "Dhātu Dictionary",
  description: "Śrīla Jīva Gosvāmī’s Dhātu-saṅgraha: every verbal root with its gaṇa, pada, iṭ, transitivity and meaning — searchable in any script.",
};


export default function DhatuPage() {
  // "gam[ḷ] gatau" → dhātu "gam[ḷ] gatau", artha "gatau" (the locative after the root)
  const rows = (dhatus as { d: string; g: number; p: string; i: string; k: string; e: string }[]).map((x) => ({
    dhatu: x.d,
    artha: x.d.split(/\s+/).slice(1).join(" "),
    g: String(x.g),
    p: x.p,
    i: x.i,
    k: x.k,
    e: x.e,
  }));
  return (
    <>
      <PageHead title="Dhātu Dictionary" intro="Śrīla Jīva Gosvāmī’s Dhātu-saṅgraha: 1113 dhātus with their meaning, gaṇa, pada, iṭ and object — search by root (with or without diacritics, or in Devanagari), by meaning, browse by letter." />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <DhatuSearch rows={rows} />
      </div>
    </>
  );
}
