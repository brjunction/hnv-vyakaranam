import {
  Languages, Keyboard, Quote, Combine, TableProperties, ScanSearch, Workflow, Puzzle, SpellCheck2,
  AudioWaveform, BookA, Sprout, BookText, ArrowLeftRight, Network, type LucideIcon,
} from "lucide-react";

// Every tool from the platform spec (6.6), grouped. `ready: true` tools are
// live; the rest show a "coming soon" page at their URL.
// URLs: /tools/<group>/<tool>  (spec: /tools/text, /tools/grammar, /tools/dictionary)

import type { Features, FeatureKey } from "@/lib/feature-list";

/** feature: hidden ("coming soon") until the developer switches it on; href: opens elsewhere; ownPage: has its own route */
export type Tool = { slug: string; name: string; blurb: string; icon: LucideIcon; ready?: boolean; feature?: FeatureKey; href?: string; ownPage?: boolean };
export type ToolGroup = { slug: "dictionary" | "grammar" | "text"; name: string; blurb: string; tools: Tool[] };

export const TOOL_GROUPS: ToolGroup[] = [
  {
    slug: "dictionary",
    name: "Dictionary & Lexicon",
    blurb: "Look up words in any script",
    tools: [
      { slug: "search", name: "Dictionary", blurb: "Monier-Williams, Apte and more — search in any script", icon: BookA, ready: true },
      { slug: "dhatu", name: "Dhātu Dictionary", blurb: "Śrīla Jīva Gosvāmī’s Dhātu-saṅgraha: gaṇa, pada, iṭ and meaning", icon: Sprout, ready: true },
      { slug: "avyaya", name: "Avyaya-saṅgraha", blurb: "Indeclinable words with Sanskrit and English meanings", icon: BookText, ready: true },
      { slug: "term-mapper", name: "Pāṇini ↔ HNV Terms", blurb: "Saṁjñās, tenses, compounds and kṛt suffixes side by side", icon: ArrowLeftRight, ready: true },
      { slug: "amarakosa", name: "Amarakośa", blurb: "Synonyms by kāṇḍa and varga — search the Amarakośa", icon: Network, feature: "tool-amarakosa", href: "/tools/dictionary/search?only=amar" },
    ],
  },
  {
    slug: "grammar",
    name: "HNV Grammar Tools",
    blurb: "Rules applied, with their sūtras",
    tools: [
      { slug: "concordance", name: "Sūtra Concordance", blurb: "Every Bṛhat sūtra with Madhyama, Aṣṭādhyāyī and Siddhānta-kaumudī", icon: Network, ready: true },
      { slug: "sandhi", name: "Sandhi Joiner & Splitter", blurb: "Join or split words, every change with its sūtra", icon: Combine, feature: "tool-sandhi", ownPage: true },
      { slug: "declension", name: "Declensions — nāma & dhātu", blurb: "Every form of a noun or dhātu, with the sūtras applied", icon: TableProperties, feature: "tool-declensions", ownPage: true },
      { slug: "case-identifier", name: "Case Identifier", blurb: "Form → stem, case, number, gender", icon: ScanSearch },
      { slug: "krdanta-taddhita", name: "Kṛdanta / Taddhita", blurb: "Derived forms, step by step", icon: Workflow },
      { slug: "samasa", name: "Samāsa Solver", blurb: "Compound → type and vigraha", icon: Puzzle },
      { slug: "visarga-anusvara", name: "Visarga & Anusvāra Checker", blurb: "Every change verified with its rule", icon: SpellCheck2 },
      { slug: "chandas", name: "Chandas Analyzer", blurb: "Laghu/guru, gaṇas and metre", icon: AudioWaveform },
    ],
  },
  {
    slug: "text",
    name: "Text Utilities",
    blurb: "Everyday helpers",
    tools: [
      { slug: "converter", name: "Script & Font Converter", blurb: "Balarama, IAST, Devanagari, Bengali, Odia, HK, ITRANS, SLP1 — Sanskrit-aware", icon: Languages, ready: true },
      { slug: "keyboard", name: "IAST Keyboard", blurb: "Type ā, ṛ, ṣ … — Shift after a letter adds its diacritic", icon: Keyboard, ready: true },
      { slug: "citation", name: "Citation Generator", blurb: "Cite any sūtra, verse or page — MLA, APA, Chicago", icon: Quote, ready: true },
    ],
  },
];

export const toolHref = (g: ToolGroup, t: Tool) => (t.ready && t.href ? t.href : `/tools/${g.slug}/${t.slug}`);

/** The tools with the developer's switches applied. */
export function toolGroupsFor(f?: Partial<Features> | null): ToolGroup[] {
  return TOOL_GROUPS.map((g) => ({ ...g, tools: g.tools.map((t) => (t.feature ? { ...t, ready: !!f?.[t.feature] } : t)) }));
}

export function findTool(group: string, tool: string) {
  const g = TOOL_GROUPS.find((x) => x.slug === group);
  const t = g?.tools.find((x) => x.slug === tool);
  return g && t ? { group: g, tool: t } : null;
}
