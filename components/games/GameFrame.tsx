"use client";

import { useMemo, useState } from "react";
import { SectionIcon } from "@/components/practice/icons";
import { SECTIONS, sectionFor } from "@/lib/practice/sections";
import type { Question } from "@/lib/practiceData";
import type { GameId } from "@/lib/practice/games";
import RamaRavana from "@/components/games/RamaRavana";
import LankaDash from "@/components/games/LankaDash";
import SandhiForge, { forgeable } from "@/components/games/SandhiForge";
import NamaGrid from "@/components/games/NamaGrid";
import SutraSorter, { sortable } from "@/components/games/SutraSorter";

// Every game can be played on any prakaraṇa that has what it needs — choose it
// here, then the game's own menu (mode and level) appears. Prakaraṇas that
// have nothing for this game yet are shown, but marked "soon".

const firstRef = (q: Question) => /(\d+(?:\.\d+)*)/.exec(q.sutraRefs[0] ?? "")?.[1] ?? "";

function ready(game: GameId, chapter: string, questions: Question[], paradigms: Question[]): boolean {
  const qs = questions.filter((q) => q.chapter === chapter);
  switch (game) {
    case "nama-grid":
      return paradigms.some((p) => p.chapter === chapter);
    case "sandhi-forge":
      return qs.filter(forgeable).length >= 4;
    case "rule-sorter":
      return new Set(qs.filter(sortable).map(firstRef)).size >= 3;
    default:
      return qs.length >= 4;
  }
}

export default function GameFrame({ game, questions, paradigms = [] }: { game: GameId; questions: Question[]; paradigms?: Question[] }) {
  const open = useMemo(() => SECTIONS.map((s) => s.slug).filter((c) => ready(game, c, questions, paradigms)), [game, questions, paradigms]);
  const [ch, setCh] = useState(open[0] ?? "");
  const qs = useMemo(() => questions.filter((q) => q.chapter === ch), [questions, ch]);
  const ps = useMemo(() => paradigms.filter((p) => p.chapter === ch), [paradigms, ch]);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Play with</span>
        {SECTIONS.map((s) => {
          const on = s.slug === ch;
          const can = open.includes(s.slug);
          return (
            <button
              key={s.slug}
              type="button"
              disabled={!can}
              onClick={() => setCh(s.slug)}
              title={can ? undefined : `${s.short}: coming soon for this game`}
              className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-45"
              style={on ? { background: s.color, borderColor: s.color, color: "#fff" } : { borderColor: "var(--border)" }}
            >
              <SectionIcon name={s.icon} size={14} /> {s.short}
              {!can && <span className="text-[10px] uppercase tracking-wider opacity-80">soon</span>}
            </button>
          );
        })}
      </div>
      {!ch ? (
        <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">This game is being filled with questions — please come back soon.</p>
      ) : (
        <GameBody key={`${game}-${ch}`} game={game} qs={qs} ps={ps} />
      )}
      {ch && <p className="sr-only">{sectionFor(ch).short}</p>}
    </div>
  );
}

function GameBody({ game, qs, ps }: { game: GameId; qs: Question[]; ps: Question[] }) {
  switch (game) {
    case "rama-ravana":
      return <RamaRavana questions={qs} />;
    case "lanka-dash":
      return <LankaDash questions={qs} />;
    case "sandhi-forge":
      return <SandhiForge questions={qs} />;
    case "nama-grid":
      return <NamaGrid paradigms={ps} />;
    case "rule-sorter":
      return <SutraSorter questions={qs} />;
  }
}
