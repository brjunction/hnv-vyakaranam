import type { Metadata } from "next";
import Link from "next/link";
import GameFrame from "@/components/games/GameFrame";
import { getPracticeData } from "@/lib/data/practice";
import PageHead from "@/components/PageHead";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Rāma–Rāvaṇa battle — Sanskrit grammar game",
  description: "Answer before Rāvaṇa’s arrow lands — Śrī Rāma’s arrow cuts it down. Easy, medium or hard. Questions from Hari-nāmāmṛta-vyākaraṇa, each with its sūtra.",
  alternates: { canonical: "/practice/games/rama-ravana" },
};

export default async function Page() {
  const { questions } = await getPracticeData();
  return (
    <>
      <PageHead deva="राम-रावण युद्धम्" title="Rāma–Rāvaṇa battle" width="max-w-4xl" intro="Answer before Rāvaṇa’s arrow lands — Śrī Rāma’s arrow cuts it down. Easy, medium or hard." />
      <div className="mx-auto max-w-4xl px-5 pb-16 pt-6">
        <GameFrame game="rama-ravana" questions={questions} />
        <p className="mt-8 text-sm">
          <Link href="/practice" className="text-[var(--fg-muted)] hover:text-[var(--accent)]">← All practice</Link>
        </p>
      </div>
    </>
  );
}
