// The developer's switches (/admin/developer). Safe to import anywhere.
export const FEATURES = [
  { key: "dict-hnv-terms", name: "Dictionary: HNV terms button", blurb: "Pāṇini's terms in all dictionary entries shown as Śrīla Jīva Gosvāmī's." },
  { key: "tool-amarakosa", name: "Tools: Amarakośa", blurb: "Opens the dictionary with only Amarakośa selected." },
  { key: "tool-sandhi", name: "Tools: Sandhi Joiner & Splitter", blurb: "Join or split words, every change with its Madhyama sūtra (41–86)." },
  { key: "tool-nama", name: "Tools: Nāma declensions (śabda-rūpa)", blurb: "Every form of a nāma in all genders, with the Madhyama sūtras applied." },
  { key: "tool-dhatu", name: "Tools: Dhātu forms (dhātu-rūpa)", blurb: "All ten gaṇas and all ten tenses, with the Madhyama sūtras applied." },
  { key: "notes-editor", name: "Notes: full rich-text editor", blurb: "Font size, alignment, line and paragraph spacing, and more in the notebook." },
] as const;
export type FeatureKey = (typeof FEATURES)[number]["key"];
export type Features = Record<FeatureKey, boolean>;
export const NO_FEATURES = Object.fromEntries(FEATURES.map((f) => [f.key, false])) as Features;
