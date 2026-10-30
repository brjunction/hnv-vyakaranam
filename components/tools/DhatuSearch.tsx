"use client";

import Lexicon, { type LexConfig } from "@/components/tools/Lexicon";

const GANA = ["", "bhv-ādi", "ad-ādi", "hv-ādi", "div-ādi", "sv-ādi", "tud-ādi", "rudh-ādi", "tan-ādi", "kry-ādi", "cur-ādi"];
const PADA: Record<string, string> = { P: "Parasmaipada (parapada)", A: "Ātmanepada (ātmapada)", U: "Ubhayapada" };

const config: LexConfig = {
  head: "dhatu",
  // the bare dhātu: the first word, without its anubandha in brackets
  bare: (r) => (r.dhatu.split(/\s+/)[0] ?? "").replace(/\[[^\]]*\]/g, ""),
  fields: [
    { key: "dhatu", label: "Dhātu", sa: true },
    { key: "artha", label: "Sanskrit meaning", sa: true },
    { key: "e", label: "English meaning" },
  ],
  chips: [
    { key: "g", label: "Gaṇa", options: GANA.slice(1).map((g, i) => ({ value: String(i + 1), label: `${i + 1} ${g}`, hint: `${i + 1} · ${g}` })) },
    { key: "p", label: "Pada", options: Object.entries(PADA).map(([v, l]) => ({ value: v, label: v === "P" ? "Parasmai" : v === "A" ? "Ātmane" : "Ubhaya", hint: l })) },
    { key: "i", label: "Iṭ", options: ["seṭ", "aniṭ", "veṭ"].map((v) => ({ value: v, label: v })) },
    { key: "k", label: "Object", match: "contains", options: [{ value: "sak", label: "sakarmaka (transitive)" }, { value: "ak", label: "akarmaka (intransitive)" }] },
  ],
  badges: (r) => [`${r.g} ${GANA[Number(r.g)] ?? ""}`, r.p, r.i].filter(Boolean),
  placeholder: "Search a dhātu or a meaning — bhū, gam, कृ, to go …",
};

export default function DhatuSearch({ rows }: { rows: Record<string, string>[] }) {
  return <Lexicon rows={rows} config={config} />;
}
