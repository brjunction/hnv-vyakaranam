import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import ScriptConverter from "@/components/tools/ScriptConverter";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/text/converter" },
  title: "Script & Font Converter",
  description: "Convert between Balarama, IAST, Devanagari, Bengali, Odia, Harvard-Kyoto, ITRANS and SLP1 — Sanskrit-aware, with a Sanskrit / normal-text checker.",
};

export default function ConverterPage() {
  return (
    <>
      <PageHead title="Script & Font Converter" intro="Balarama, IAST, Devanagari, Bengali, Odia and more — in any direction. Sanskrit is converted as Sanskrit, ordinary text letter by letter." />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5">
        <ScriptConverter />
      </div>
    </>
  );
}
