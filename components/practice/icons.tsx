import { BookOpen, Flame, Layers, Link2, Puzzle, Sprout, Target, Waves } from "lucide-react";
import type { PracticeSection } from "@/lib/practice/sections";

const MAP = { waves: Waves, layers: Layers, flame: Flame, target: Target, link: Link2, puzzle: Puzzle, sprout: Sprout, book: BookOpen } as const;

export function SectionIcon({ name, size = 20 }: { name: PracticeSection["icon"]; size?: number }) {
  const I = MAP[name] ?? BookOpen;
  return <I size={size} strokeWidth={1.8} />;
}
