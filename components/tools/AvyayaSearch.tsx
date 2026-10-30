"use client";

import Lexicon, { type LexConfig } from "@/components/tools/Lexicon";

const config: LexConfig = {
  head: "w",
  fields: [
    { key: "w", label: "Avyaya", sa: true },
    { key: "s", label: "Sanskrit meaning", sa: true },
    { key: "e", label: "English meaning" },
  ],
  placeholder: "Search an avyaya or a meaning — atha, eva, अपि, quickly …",
};

export default function AvyayaSearch({ rows }: { rows: Record<string, string>[] }) {
  return <Lexicon rows={rows} config={config} />;
}
