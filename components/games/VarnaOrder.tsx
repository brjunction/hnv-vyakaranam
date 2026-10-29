"use client";

import { useMemo, useState } from "react";
import OrderRound, { ResultBar, type OrderItem, type RoundResult } from "@/components/games/OrderGame";
import { Stars, useBest } from "@/components/games/shared";

// Varṇa Order — put the letters of the varṇa-krama in their order. The alphabet
// is the standard Sanskrit varṇamālā. For the vowels, sūtra 2 of the grammar
// says the first fourteen letters are the sarveśvaras.

const L = (s: string): OrderItem[] => s.split(" ").map((x) => { const [d, i] = x.split("/"); return { id: d, main: d, sub: i }; });

const GROUPS: { id: string; name: string; note?: string; items: OrderItem[] }[] = [
  { id: "svara", name: "Vowels (sarveśvara)", note: "Sūtra 2: “tatrādau caturdaśa sarveśvarāḥ” — the first fourteen letters.", items: L("अ/a आ/ā इ/i ई/ī उ/u ऊ/ū ऋ/ṛ ॠ/ṝ ऌ/ḷ ॡ/ḹ ए/e ऐ/ai ओ/o औ/au") },
  { id: "ka", name: "Ka-varga (velar)", items: L("क/ka ख/kha ग/ga घ/gha ङ/ṅa") },
  { id: "ca", name: "Ca-varga (palatal)", items: L("च/ca छ/cha ज/ja झ/jha ञ/ña") },
  { id: "ta1", name: "Ṭa-varga (retroflex)", items: L("ट/ṭa ठ/ṭha ड/ḍa ढ/ḍha ण/ṇa") },
  { id: "ta2", name: "Ta-varga (dental)", items: L("त/ta थ/tha द/da ध/dha न/na") },
  { id: "pa", name: "Pa-varga (labial)", items: L("प/pa फ/pha ब/ba भ/bha म/ma") },
  { id: "ya", name: "Semivowels", items: L("य/ya र/ra ल/la व/va") },
  { id: "sa", name: "Sibilants and ha", items: L("श/śa ष/ṣa स/sa ह/ha") },
];
const CONSONANTS = GROUPS.slice(1).flatMap((g) => g.items);
const ALL = [...GROUPS[0].items, ...CONSONANTS];

type Choice = { id: string; name: string; note?: string; items: OrderItem[] };
const CHOICES: Choice[] = [
  ...GROUPS,
  { id: "cons", name: "All 33 consonants", items: CONSONANTS },
  { id: "all", name: "The whole varṇa-krama (47)", items: ALL },
];

export default function VarnaOrder() {
  const [pick, setPick] = useState<Choice | null>(null);
  const [round, setRound] = useState(0);
  const [res, setRes] = useState<RoundResult | null>(null);
  const items = useMemo(() => pick?.items ?? [], [pick]);
  const { best, submit } = useBest(`varna:${pick?.id ?? ""}`);

  if (!pick)
    return (
      <div>
        <p className="mb-4 text-sm text-[var(--fg-muted)]">Tap the letters in the order of the varṇa-krama. Choose a row to practise — or the whole alphabet.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CHOICES.map((c) => (
            <button key={c.id} type="button" onClick={() => { setPick(c); setRes(null); setRound((n) => n + 1); }} className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-3 text-left hover:border-[var(--accent)]">
              <span className="font-medium">{c.name}</span>
              <span className="block font-devanagari text-lg text-[var(--fg-muted)]">{c.items.slice(0, 7).map((x) => x.main).join(" ")}{c.items.length > 7 ? " …" : ""}</span>
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <div>
      <p className="mb-1 font-medium">{pick.name}</p>
      {pick.note && <p className="mb-3 text-xs text-[var(--fg-muted)]">{pick.note}</p>}
      <OrderRound key={round} items={items} onDone={(r) => { setRes(r); submit(r.score); }} />
      {res && (
        <>
          <ResultBar r={res} label="Well placed" onAgain={() => { setRes(null); setRound((n) => n + 1); }} onMenu={() => { setPick(null); setRes(null); }} />
          <p className="mt-2 text-center text-xs text-[var(--fg-muted)]">Best here: {best ?? res.score} <Stars n={res.stars} /></p>
        </>
      )}
      {!res && <button type="button" onClick={() => setPick(null)} className="mt-6 text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]">← Choose another row</button>}
    </div>
  );
}
