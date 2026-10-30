import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import WordList from "@/components/tools/WordList";
import dhatus from "@/lib/data/static/dhatus.json";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/dictionary/dhatu" },
  title: "Dhātu Dictionary",
  description: "Śrīla Jīva Gosvāmī’s Dhātu-saṅgraha: every verbal root with its gaṇa, pada, iṭ, transitivity and meaning — searchable in any script.",
};

const GANA = ["", "bhv-ādi", "ad-ādi", "hv-ādi", "div-ādi", "sv-ādi", "tud-ādi", "rudh-ādi", "tan-ādi", "kry-ādi", "cur-ādi"];
const PADA: Record<string, string> = { P: "Parasmaipada", A: "Ātmanepada", U: "Ubhayapada" };

export default function DhatuPage() {
  const rows = (dhatus as { d: string; g: number; p: string; i: string; k: string; e: string }[]).map((x) => ({ ...x, gana: `${x.g} ${GANA[x.g] ?? ""}`, pada: PADA[x.p] ?? x.p }));
  return (
    <>
      <PageHead title="Dhātu Dictionary" intro="Śrīla Jīva Gosvāmī’s Dhātu-saṅgraha (Dhātu-pāṭha), in alphabetical order: each dhātu with its meaning, gaṇa, pada, iṭ and transitivity." />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <WordList
          rows={rows}
          cols={[
            { key: "d", label: "Dhātu", sa: true, width: "30%" },
            { key: "gana", label: "Gaṇa" },
            { key: "pada", label: "Pada" },
            { key: "i", label: "Iṭ" },
            { key: "k", label: "Sak / ak" },
            { key: "e", label: "Meaning", width: "35%" },
          ]}
          filters={[
            { key: "g", label: "Gaṇa", options: GANA.slice(1).map((g, i) => ({ value: String(i + 1), label: `${i + 1} ${g}` })) },
            { key: "p", label: "Pada", options: Object.entries(PADA).map(([v, l]) => ({ value: v, label: l })) },
            { key: "i", label: "Iṭ", options: ["seṭ", "aniṭ", "veṭ"].map((v) => ({ value: v, label: v })) },
          ]}
        />
      </div>
    </>
  );
}
