// The three editions of Harināmāmṛta-vyākaraṇa. Order = order of the tabs.
// Madhyama keeps its original URL (/chapters) for parity; the others live
// at /<slug>/chapters. See docs/05-hnv-module.md §6.
export const EDITIONS = [
  { slug: "laghu", name: "Laghu", deva: "लघु", english: "Short edition", href: "/laghu/chapters" },
  { slug: "madhyama", name: "Madhyama", deva: "मध्यम", english: "Middle edition", href: "/chapters" },
  { slug: "brhat", name: "Bṛhat", deva: "बृहत्", english: "Large edition", href: "/brhat/chapters" },
] as const;

export type EditionSlug = (typeof EDITIONS)[number]["slug"];
