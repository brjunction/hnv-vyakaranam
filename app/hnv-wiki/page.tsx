import type { Metadata } from "next";
import { loadWiki } from "@/lib/wiki";
import WikiShell from "@/components/wiki/WikiShell";

// The HNV-Wiki, rendered inside the site's header and footer. Content comes
// from public/hnv-wiki.html at build time (replace that file to update the
// wiki). Static page; no database.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "HNV-Wiki — Saṁjñā, Sandhi and Nāma reference",
  description:
    "HNV-Wiki: a detailed reference of Hari-nāmāmṛta-vyākaraṇa — the alphabet and its names, sandhi rules, and noun paradigms with declension tables and sūtra listings.",
  alternates: { canonical: "/hnv-wiki" },
};

export default function HnvWikiPage() {
  const wiki = loadWiki();
  return <WikiShell css={wiki.css} html={wiki.html} js={wiki.js} />;
}
