/** ASCII slug from a diacritic title: "Sarveśvara-sandhi" → "sarvesvara-sandhi". */
export function slugifyTitle(title: string): string {
  const s = title
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "section";
}
