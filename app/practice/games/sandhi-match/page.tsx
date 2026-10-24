import type { Metadata } from "next";
import Link from "next/link";
import GameFrame from "@/components/games/GameFrame";
import { getPracticeData } from "@/lib/data/practice";
import { GameLogo } from "@/components/games/GameArt";
import PageHead from "@/components/PageHead";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Sandhi Match — Sanskrit grammar game",
  description: "Flip the cards and pair every Sandhi with its joined form, against the clock. Questions from Hari-nāmāmṛta-vyākaraṇa, each with its sūtra.",
  alternates: { canonical: "/practice/games/sandhi-match" },
};

export default async function Page() {
  const { questions } = await getPracticeData();
  return (
    <>
      <PageHead deva="सन्धि-युग्मम्" title="Sandhi Match" width="max-w-4xl" intro="Flip the cards and pair every Sandhi with its joined form, against the clock." />
      <div className="mx-auto max-w-4xl px-5 pb-16 pt-6">
        <div className="mb-4 flex items-center gap-3"><GameLogo game="sandhi-match" size={44} /><p className="text-sm text-[var(--fg-muted)]">Learn Sandhi by playing — every answer shows its sūtra.</p></div>
        <GameFrame game="sandhi-match" questions={questions} />
        <p className="mt-8 text-sm">
          <Link href="/practice" className="text-[var(--fg-muted)] hover:text-[var(--accent)]">← All practice</Link>
        </p>
      </div>
    </>
  );
}
