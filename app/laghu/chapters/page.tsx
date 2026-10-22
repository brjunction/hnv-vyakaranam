import type { Metadata } from "next";
import EditionComingSoon from "@/components/EditionComingSoon";

export const metadata: Metadata = {
  title: "Laghu edition — Table of Contents",
  description: "The Laghu edition of Śrīla Jīva Gosvāmī's Harināmāmṛta-vyākaraṇa.",
};

export default function Page() {
  return <EditionComingSoon slug="laghu" />;
}
