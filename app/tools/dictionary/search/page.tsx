import type { Metadata } from "next";
import { Suspense } from "react";
import DictionaryApp from "@/components/dict/DictionaryApp";
import { getFeatures } from "@/lib/features";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/dictionary/search" },
  title: "Sanskrit Dictionary",
  description: "Search Monier-Williams and other Sanskrit dictionaries in Devanagari, IAST, ITRANS or plain English letters.",
};

export const revalidate = 3600;

export default async function DictionaryPage() {
  const f = await getFeatures();
  return (
    <Suspense>
      <DictionaryApp hnvTermsEnabled={f["dict-hnv-terms"]} />
    </Suspense>
  );
}
