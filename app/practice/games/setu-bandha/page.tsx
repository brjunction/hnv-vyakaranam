import type { Metadata } from "next";
import Link from "next/link";
import GameFrame from "@/components/games/GameFrame";
import { getPracticeData } from "@/lib/data/practice";
import PageHead from "@/components/PageHead";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Setu-bandha — Sanskrit grammar game",
  description: "Help Hanumān build the bridge to Laṅkā — a right answer lays a stone, a wrong one sinks it. Questions from Hari-nāmāmṛta-vyākaraṇa, each with its sūtra.",
  alternates: { canonical: "/practice/games/setu-bandha" },
};

export default async function Page() {
  const { questions } = await getPracticeData();
  return (
    <>
      <PageHead deva="सेतु-बन्धनम्" title="Setu-bandha" width="max-w-4xl" intro="Help Hanumān build the bridge to Laṅkā — a right answer lays a stone, a wrong one sinks it." />
      <div className="mx-auto max-w-4xl px-5 pb-16 pt-6">
        <GameFrame game="setu-bandha" questions={questions} />
        <p className="mt-8 text-sm">
          <Link href="/practice" className="text-[var(--fg-muted)] hover:text-[var(--accent)]">← All practice</Link>
        </p>
      </div>
    </>
  );
}
