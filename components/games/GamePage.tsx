import Link from "next/link";
import type { Metadata } from "next";
import GameFrame from "@/components/games/GameFrame";
import { GameLogo } from "@/components/games/GameArt";
import PageHead from "@/components/PageHead";
import { getPracticeData } from "@/lib/data/practice";
import { gameMeta, type GameId } from "@/lib/practice/games";

export const gameMetadata = (id: GameId): Metadata => {
  const m = gameMeta(id);
  return { title: `${m.title} — Sanskrit grammar game`, description: m.description, alternates: { canonical: m.href } };
};

export default async function GamePage({ id }: { id: GameId }) {
  const m = gameMeta(id);
  const { questions, paradigms } = await getPracticeData();
  return (
    <>
      <PageHead deva={m.deva} title={m.title} width="max-w-4xl" intro={m.intro} />
      <div className="mx-auto max-w-4xl px-5 pb-16 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <GameLogo game={id} size={44} />
          <p className="text-sm text-[var(--fg-muted)]">Learn the grammar by playing — every answer shows its sūtra.</p>
        </div>
        <GameFrame game={id} questions={questions} paradigms={paradigms} />
        <p className="mt-8 text-sm">
          <Link href="/practice" className="text-[var(--fg-muted)] hover:text-[var(--accent)]">← All practice</Link>
        </p>
      </div>
    </>
  );
}
