// Shift (left or right) pressed on its own after a letter gives its IAST
// diacritic at once: a → ā, s → ṣ → ś → ṣ, n → ṇ → ṅ → ñ → ṇ … Pressing again
// goes on among the marked letters (the plain letter does not come back,
// except for pairs like a ↔ ā, where it undoes).
export const IAST_CYCLE: Record<string, string> = {};
const RINGS = ["aā", "iī", "uū", "rṛṝ", "lḷḹ", "nṇṅñ", "tṭ", "dḍ", "sṣś", "mṁṃ", "hḥ"];
for (const ring of [...RINGS, ...RINGS.map((r) => r.toUpperCase())]) {
  const c = [...ring];
  if (c.length === 2) {
    IAST_CYCLE[c[0]] = c[1];
    IAST_CYCLE[c[1]] = c[0];
    continue;
  }
  IAST_CYCLE[c[0]] = c[1];
  const marked = c.slice(1);
  marked.forEach((ch, i) => (IAST_CYCLE[ch] = marked[(i + 1) % marked.length]));
}
