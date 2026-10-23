import type { Metadata } from "next";
import { Suspense } from "react";
import { getBooks } from "@/lib/data/scriptures";
import DualReader from "@/components/scriptures/DualReader";

export const metadata: Metadata = {
  title: "Dual reading — Scriptures",
  description: "Read two scriptures, or two places in one, side by side.",
  alternates: { canonical: "/scriptures/read" },
};

export default async function Read() {
  const books = await getBooks();
  return (
    <div className="mx-auto max-w-[110rem] px-4 pb-16 pt-6 sm:px-6">
      <Suspense>
        <DualReader books={books.map((b) => ({ code: b.code, title: b.title }))} />
      </Suspense>
    </div>
  );
}
