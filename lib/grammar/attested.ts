// Reads the declension / conjugation tables of the Heritage grammar
// dictionaries (already in our dictionary store) into plain data, so the
// Declensions tool can check its sūtra-derived forms and add what it lacks.

export type NamaAttested = { gender: "m" | "f" | "n"; stem: string; cells: string[][][] }; // [case 0–7 in HNV order][number][forms]
export type Voice = "active" | "middle" | "passive";
export type TenseAttested = { tense: string; voice: Voice; cells: string[][][] }; // [person 0=3rd..2=1st][number][forms]
export type ConjAttested = { gana?: number; kind: string; tenses: TenseAttested[]; participles: { name: string; forms: string[] }[]; indeclinables: { name: string; forms: string[] }[] };

const text = (h: string) =>
  h
    .replace(/<br\s*\/?>/gi, "/")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const forms = (cell: string) =>
  text(cell)
    .split("/")
    .map((x) => x.trim())
    .filter((x) => x && /[a-zāīūṛṝḷṅñṭḍṇśṣḥṁṃ]/i.test(x) && !/^(Singular|Dual|Plural)$/.test(x));
const rows = (h: string) => [...h.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => c[1]));

// Heritage order: Nominative, Vocative, Accusative, Instrumental, Dative, Ablative, Genitive, Locative → HNV order (voc. last)
const CASE_ORDER: Record<string, number> = { Nominative: 0, Accusative: 1, Instrumental: 2, Dative: 3, Ablative: 4, Genitive: 5, Locative: 6, Vocative: 7 };

export function parseDeclension(html: string): NamaAttested | null {
  const g = /\[?\s*(Mas|Fem|Neu)\./.exec(text(html.slice(0, 400)))?.[1];
  const stem = /Declension table of[^<]*<\/span>\]?\s*<a[^>]*>(?:<[^>]+>)*([^<]+)/.exec(html)?.[1]?.trim() ?? "";
  if (!g) return null;
  const cells: string[][][] = Array.from({ length: 8 }, () => [[], [], []]);
  for (const r of rows(html)) {
    const label = text(r[0] ?? "");
    const ci = CASE_ORDER[label];
    if (ci === undefined) continue;
    for (let n = 0; n < 3; n++) cells[ci][n] = forms(r[n + 1] ?? "");
  }
  if (!cells.some((r) => r.some((c) => c.length))) return null;
  return { gender: g === "Mas" ? "m" : g === "Fem" ? "f" : "n", stem, cells };
}

const TENSE: Record<string, string> = { Present: "lat", Imperfect: "lan", Optative: "lin", Imperative: "lot", Future: "lrt", Conditional: "lrn", "Periphrastic Future": "lut", Perfect: "lit", Aorist: "lun", Benedictive: "asir", Injunctive: "inj" };

/** One "Word grammar" entry → its conjugations (primary, causative, desiderative, intensive). */
export function parseConjugation(html: string): ConjAttested[] {
  const out: ConjAttested[] = [];
  const gana = Number(/class\s*(?:<[^>]+>|\[)*\s*(\d+)/.exec(html)?.[1] ?? 0) || undefined;
  // split at the section headings
  const parts = html.split(/(PRIMARY CONJUGATION|CAUSATIVE CONJUGATION|DESIDERATIVE CONJUGATION|INTENSIVE CONJUGATION|PASSIVE CONJUGATION)/);
  for (let i = 1; i < parts.length; i += 2) {
    const kind = parts[i].split(" ")[0].toLowerCase();
    const body = parts[i + 1] ?? "";
    const c: ConjAttested = { gana: kind === "primary" ? gana : undefined, kind, tenses: [], participles: [], indeclinables: [] };
    let tense = "";
    let voice: Voice = "active";
    let cur: TenseAttested | null = null;
    for (const r of rows(body)) {
      const t0 = text(r.join(" | "));
      const tm = /-\s*([A-Za-z ]+?)\s*-/.exec(t0);
      if (tm && TENSE[tm[1].trim()]) tense = TENSE[tm[1].trim()];
      const vm = /\b(Active|Middle|Passive)\b/.exec(t0);
      if (vm && /Singular/.test(t0)) {
        voice = vm[1].toLowerCase() as Voice;
        cur = { tense, voice, cells: [[[], [], []], [[], [], []], [[], [], []]] };
        if (tense) c.tenses.push(cur);
        continue;
      }
      const label = text(r[0] ?? "");
      const pi = label === "Third" ? 0 : label === "Second" ? 1 : label === "First" ? 2 : -1;
      if (pi >= 0 && cur) for (let n = 0; n < 3; n++) cur.cells[pi][n] = forms(r[n + 1] ?? "");
    }
    c.tenses = c.tenses.filter((t) => t.cells.some((r) => r.some((x) => x.length)));
    // participles and indeclinables: "<blue>Name</blue> <red>form m. n.</red> <red>form f.</red>"
    const list = (re: RegExp) => {
      const m = re.exec(body);
      if (!m) return [];
      const seg = m[1];
      return [...seg.matchAll(/<span class="dc-blue"><b>([^<]+)<\/b><\/span>([\s\S]*?)(?=<span class="dc-blue">|$)/g)]
        .map((x) => ({
          name: x[1].trim(),
          forms: [...x[2].matchAll(/<span class="dc-red">([^<]+)<\/span>((?:\s*<a[^>]*>[mfn]\.<\/a>)*)/g)].map((y) => (y[1].trim() + " " + [...y[2].matchAll(/>([mfn]\.)</g)].map((z) => z[1]).join(" ")).trim()),
        }))
        .filter((x) => x.forms.length);
    };
    c.participles = list(/PARTICIPLES([\s\S]*?)(?:INDECLINABLE|$)/);
    c.indeclinables = list(/INDECLINABLE FORMS([\s\S]*?)(?:CONJUGATION|$)/);
    if (c.tenses.length || c.participles.length) out.push(c);
  }
  return out;
}
