"use client";

import { useMemo, useState } from "react";
import { SectionIcon } from "@/components/practice/icons";
import { sectionFor } from "@/lib/practice/sections";
import type { Question } from "@/lib/practiceData";
import RamaRavana from "@/components/games/RamaRavana";
import SandhiMatch from "@/components/games/SandhiMatch";
import SetuBandha from "@/components/games/SetuBandha";

// Every game can be played on any prakaraṇa that has questions: choose it
// here, then the game's own menu (levels) appears.

export type GameId = "rama-ravana" | "sandhi-match" | "setu-bandha";

export default function GameFrame({ game, questions }: { game: GameId; questions: Question[] }) {
  const chapters = useMemo(() => [...new Set(questions.map((q) => q.chapter))].filter(Boolean), [questions]);
  const [ch, setCh] = useState(chapters[0] ?? "");
  const qs = useMemo(() => questions.filter((q) => q.chapter === ch), [questions, ch]);
  const Game = game === "rama-ravana" ? RamaRavana : game === "setu-bandha" ? SetuBandha : SandhiMatch;
  return (
    <div>
      {chapters.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Play with</span>
          {chapters.map((c) => {
            const s = sectionFor(c);
            const on = c === ch;
            return (
              <button key={c} onClick={() => setCh(c)} className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors" style={on ? { background: s.color, borderColor: s.color, color: "#fff" } : { borderColor: "var(--border)" }}>
                <SectionIcon name={s.icon} size={14} /> {s.short}
              </button>
            );
          })}
        </div>
      )}
      <Game key={`${game}-${ch}`} questions={qs} />
    </div>
  );
}
