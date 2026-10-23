import type { Metadata } from "next";
import EditionChapterIndex from "@/components/hnv/EditionChapterIndex";

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: "/laghu/chapters" },
  title: "Laghu edition — Table of Contents",
  description: "The Laghu edition of Śrīla Jīva Gosvāmī's Harināmāmṛta-vyākaraṇa.",
};

export default function Page() {
  return <EditionChapterIndex edition="laghu" />;
}
