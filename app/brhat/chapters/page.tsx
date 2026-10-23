import type { Metadata } from "next";
import EditionChapterIndex from "@/components/hnv/EditionChapterIndex";

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: "/brhat/chapters" },
  title: "Bṛhat edition — Table of Contents",
  description: "The Bṛhat edition of Śrīla Jīva Gosvāmī's Harināmāmṛta-vyākaraṇa.",
};

export default function Page() {
  return <EditionChapterIndex edition="brhat" />;
}
