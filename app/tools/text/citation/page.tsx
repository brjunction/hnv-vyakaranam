import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import CitationGenerator from "@/components/tools/CitationGenerator";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/text/citation" },
  title: "Citation Generator",
  description: "Cite any sūtra, scripture verse or page of this site — MLA, APA, Chicago or a short form.",
};

export default function CitationPage() {
  return (
    <>
      <PageHead title="Citation Generator" intro="Cite a sūtra, a verse or any page of the site in MLA, APA or Chicago style." />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <CitationGenerator site={SITE_URL.replace(/\/$/, "")} siteName="Harināmāmṛta-vyākaraṇam" />
      </div>
    </>
  );
}
