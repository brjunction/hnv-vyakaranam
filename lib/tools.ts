import {
  Languages, Keyboard, Quote, Combine, TableProperties, ScanSearch, Workflow, Puzzle, SpellCheck2,
  AudioWaveform, BookA, Sprout, BookText, ArrowLeftRight, Network, type LucideIcon,
} from "lucide-react";

// Every tool from the platform spec (6.6), grouped. `ready: true` tools are
// live; the rest show a "coming soon" page at their URL.
// URLs: /tools/<group>/<tool>  (spec: /tools/text, /tools/grammar, /tools/dictionary)

export type Tool = { slug: string; name: string; blurb: string; icon: LucideIcon; ready?: boolean };
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
      { slug: "glossary", name: "HNV Glossary", blurb: "HNV technical terms with sūtra links", icon: BookText },
      { slug: "term-mapper", name: "Pāṇini ↔ HNV Terms", blurb: "Saṁjñās, tenses, compounds and kṛt suffixes side by side", icon: ArrowLeftRight, ready: true },
      { slug: "amarakosa", name: "Amarakośa", blurb: "Synonyms and antonyms by kāṇḍa and varga", icon: Network },
    ],
  },
  {
    slug: "grammar",
    name: "HNV Grammar Tools",
    blurb: "Rules applied, with their sūtras",
    tools: [
      { slug: "concordance", name: "Sūtra Concordance", blurb: "Every Bṛhat sūtra with Madhyama, Aṣṭādhyāyī and Siddhānta-kaumudī", icon: Network, ready: true },
      { slug: "sandhi", name: "Sandhi Splitter / Joiner", blurb: "Join two words or split a compound form", icon: Combine },
      { slug: "declension", name: "Declension Generator", blurb: "Śabda-rūpa: full 8 × 3 tables", icon: TableProperties },
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
      { slug: "keyboard", name: "IAST Keyboard", blurb: "Type ā, ṛ, ṣ … — Left Shift after a letter adds its diacritic", icon: Keyboard, ready: true },
      { slug: "citation", name: "Citation Generator", blurb: "Cite any sūtra, verse or page — MLA, APA, Chicago", icon: Quote, ready: true },
    ],
  },
];

export const toolHref = (g: ToolGroup, t: Tool) => `/tools/${g.slug}/${t.slug}`;

export function findTool(group: string, tool: string) {
  const g = TOOL_GROUPS.find((x) => x.slug === group);
  const t = g?.tools.find((x) => x.slug === tool);
  return g && t ? { group: g, tool: t } : null;
}
