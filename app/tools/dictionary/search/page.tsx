import type { Metadata } from "next";
import { Suspense } from "react";
import DictionaryApp from "@/components/dict/DictionaryApp";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/dictionary/search" },
  title: "Sanskrit Dictionary",
  description: "Search Monier-Williams and other Sanskrit dictionaries in Devanagari, IAST, ITRANS or plain English letters.",
};

export default function DictionaryPage() {
  return (
    <Suspense>
      <DictionaryApp />
    </Suspense>
  );
}
