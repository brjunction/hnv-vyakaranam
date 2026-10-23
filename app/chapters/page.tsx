import type { Metadata } from "next";
import EditionChapterIndex from "@/components/hnv/EditionChapterIndex";

export const revalidate = 86400; // admin saves refresh it immediately

export const metadata: Metadata = {
  alternates: { canonical: "/chapters" },
  title: "Table of Contents",
  description:
    "The complete table of contents of Hari-nāmāmṛta Vyākaraṇa — Maṅgalācaraṇa through the Afterword, with every prakaraṇa and sūtra.",
};

export default function ChaptersIndex() {
  return <EditionChapterIndex edition="madhyama" />;
}
