import { athematic } from "@/lib/grammar/dhatu3";
import { asirForms, litForms, lunForms } from "@/lib/grammar/dhatu2";
// Dhātu forms by Madhyama Harināmāmṛta-vyākaraṇa, Ākhyāta (Sūtras 260–330),
// for the a-stem gaṇas (bhvādi 1, divādi 4, tudādi 6, curādi 10): acyuta (laṭ),
// bhūteśvara (laṅ), vidhātā (loṭ), vidhi (vidhi-liṅ), kalki (lṛṭ), bāla-kalki (luṭ).
// Roots come from Śrīla Jīva Gosvāmī's Dhātu-saṅgraha (lib/data/static/dhatus.json).

export type DhatuRow = { d: string; g: number; p: string; i: string; k: string; e: string };
export type FormCell = { forms: string[]; sutras: number[] };
export type TenseTable = { key: string; name: string; hnv: string; pada: "para" | "ātma"; cells: FormCell[][]; note?: string };
export type Conjugation = { root: string; entry: DhatuRow; stem: string; stemSteps: { sutra?: number; change: string }[]; tables: TenseTable[]; notes: string[] };

/** Dhātus missing from the list as separate rows (kṛ of tanādi is joined to svādi kṛñ in the source). */
export const EXTRA_DHATUS: DhatuRow[] = [{ d: "[ḍu]kṛ[ñ] karaṇe", g: 8, p: "U", i: "aniṭ", k: "sak", e: "to do, make" }];

export const PERSONS = ["Prathama (3rd)", "Madhyama (2nd)", "Uttama (1st)"];
export const NUMBERS = ["eka", "dvi", "bahu"];

/** "gam[ḷ] gatau" → gam; "[ḍu]kṛ[ñ] karaṇe" → kṛ; idit (ak[i]) noted. */
export function rootOf(d: string): { root: string; idit: boolean; markers: string[] } {
  const head = d.split(/\s+/)[0];
  const markers = [...head.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1]);
  // ṣ- and ṇ- of the Dhātu-pāṭha are s- and n- in use (ṣev → sev, ṇī → nī)
  const root = head.replace(/\[[^\]]*\]/g, "").replace(/-/g, "").replace(/^ṣṭh(?!iv)/, "sth").replace(/^ṣṭ(?!y)/, "st").replace(/^ṣ(?![ṭṭh]|vaṣk)/, "s").replace(/^ṇ/, "n");
  return { root, idit: markers.includes("i"), markers };
}

const V = "aāiīuūṛṝḷeo";
const isVowel = (c?: string) => !!c && V.includes(c);
const GUNA: Record<string, string> = { i: "e", ī: "e", u: "o", ū: "o", ṛ: "ar", ṝ: "ar" };
const VRDDHI: Record<string, string> = { i: "ai", ī: "ai", u: "au", ū: "au", ṛ: "ār", ṝ: "ār", a: "ā" };
const NASAL: Record<string, string> = { k: "ṅ", kh: "ṅ", g: "ṅ", gh: "ṅ", c: "ñ", ch: "ñ", j: "ñ", jh: "ñ", ṭ: "ṇ", ṭh: "ṇ", ḍ: "ṇ", ḍh: "ṇ", t: "n", th: "n", d: "n", dh: "n", p: "m", ph: "m", b: "m", bh: "m" };

// the stem substitutions of the gaṇas (Dhātu-pāṭha), not derived here
const SUBST1: Record<string, string> = { gam: "gaccha", yam: "yaccha", sthā: "tiṣṭha", pā: "piba", ghrā: "jighra", dhmā: "dhama", mnā: "mana", dṛś: "paśya", ṛ: "ṛccha", sad: "sīda", śad: "śīya", guh: "gūha", kram: "krāma", ā: "", dā: "yaccha" };
const SUBST4: Record<string, string> = { div: "dīvya", siv: "sīvya", śam: "śāmya", tam: "tāmya", dam: "dāmya", śram: "śrāmya", bhram: "bhrāmya", kṣam: "kṣāmya", klam: "klāmya", mad: "mādya", jan: "jāya", vyadh: "vidhya" };
const SUBST6: Record<string, string> = { iṣ: "iccha", prach: "pṛccha", muc: "muñca", lip: "limpa", sic: "siñca", vid: "vinda", lup: "lumpa", kṛt: "kṛnta", piś: "piṁśa", mṛ: "mriya", kṝ: "kira", gṝ: "gira", ji: "jaya" };

function lastLetter(s: string): string {
  const two = s.slice(-2);
  return /^(kh|gh|ch|jh|ṭh|ḍh|th|dh|ph|bh)$/.test(two) ? two : s.slice(-1);
}

/** The present (sārvadhātuka) a-stem and how it is made. */
function presentStem(root: string, g: number, idit: boolean): { stem: string; steps: { sutra?: number; change: string }[] } | null {
  const steps: { sutra?: number; change: string }[] = [];
  let r = root;
  if (idit) {
    const l = lastLetter(r);
    if (NASAL[l]) {
      r = r.slice(0, -l.length) + NASAL[l] + l;
      steps.push({ change: `the i-marker adds a nasal: ${root} → ${r}` });
    }
  }
  const sub = g === 1 ? SUBST1[r] : g === 4 ? SUBST4[r] : g === 6 ? SUBST6[r] : undefined;
  if (sub) {
    steps.push({ change: `${r} takes the stem ${sub} before the vikaraṇa (Dhātu-pāṭha)` });
    return { stem: sub, steps };
  }
  const last = r.slice(-1);
  if (g === 1) {
    steps.push({ sutra: 288, change: "śap (a) after the dhātu" });
    if (isVowel(last) && GUNA[last]) {
      const gv = GUNA[last];
      const s = r.slice(0, -1) + gv;
      steps.push({ sutra: 289, change: `${last} → ${gv} (govinda)` });
      const st = gv === "e" ? s.slice(0, -1) + "aya" : gv === "o" ? s.slice(0, -1) + "ava" : s + "a";
      if (gv === "e") steps.push({ sutra: 54, change: "e + a → aya" });
      if (gv === "o") steps.push({ sutra: 55, change: "o + a → ava" });
      return { stem: st, steps };
    }
    const m = /^(.*?)([iuṛ])(kh|gh|ch|jh|ṭh|ḍh|th|dh|ph|bh|[^aāiīuūṛṝeo])$/.exec(r);
    if (m) {
      const s = m[1] + GUNA[m[2]] + m[3];
      steps.push({ change: `the short ${m[2]} before the final consonant → ${GUNA[m[2]]} (govinda)` });
      return { stem: s + "a", steps };
    }
    return { stem: r + "a", steps };
  }
  if (g === 4) {
    steps.push({ change: "śyan (ya) after the dhātu; no govinda (nirguṇa)" });
    return { stem: r + "ya", steps };
  }
  if (g === 6) {
    steps.push({ change: "śa (a) after the dhātu; no govinda (nirguṇa)" });
    if (/[iī]$/.test(r)) return { stem: r.slice(0, -1) + "iya", steps };
    if (/[uū]$/.test(r)) return { stem: r.slice(0, -1) + "uva", steps };
    if (/ṛ$/.test(r)) return { stem: r.slice(0, -1) + "riya", steps };
    return { stem: r + "a", steps };
  }
  if (g === 10) {
    let b = r;
    if (/[^aāiīuūṛṝeo]a$/.test(b) && b.length > 2) b = b.slice(0, -1); // katha → kath (kathādi)
    steps.push({ change: "ṇic (i) after the dhātu (curādi)" });
    if (isVowel(b.slice(-1)) && VRDDHI[b.slice(-1)]) {
      b = (b.slice(0, -1) + VRDDHI[b.slice(-1)]).replace(/ai$/, "āy").replace(/au$/, "āv");
      steps.push({ sutra: 314, change: `final vowel → vṛṣṇīndra before ṇic` });
    } else {
      const m = /^(.*?)([aiuṛ])(kh|gh|ch|jh|ṭh|ḍh|th|dh|ph|bh|[^aāiīuūṛṝeo])$/.exec(b);
      if (m && r === b) {
        // a in the upadhā: vṛṣṇīndra; i/u/ṛ: govinda (kathādi keep their a)
        if (m[2] === "a") {
          if (!/a$/.test(r)) {
            b = m[1] + "ā" + m[3];
            steps.push({ change: "the a before the final consonant → ā (vṛṣṇīndra) before ṇic" });
          }
        } else {
          b = m[1] + GUNA[m[2]] + m[3];
          steps.push({ change: `the short ${m[2]} before the final consonant → ${GUNA[m[2]]} (govinda)` });
        }
      }
    }
    steps.push({ sutra: 288, change: "śap (a): i → e (govinda, 289) → ay + a = aya" });
    return { stem: b + "aya", steps };
  }
  return null;
}

// ---------------------------------------------------------------- endings
type E = [string, number[]];
const A = (s: string) => s.slice(0, -1); // the stem without its a
/** Builds a 3×3 table from a stem and nine templates ("S" = stem, "s" = stem without a, "Ā" = stem with ā). */
function table(S: string, rows: E[][], add: number[]): FormCell[][] {
  return rows.map((r) =>
    r.map(([t, sut]) => ({
      forms: t.split("/").map((x) => x.replace(/Ā/g, "\u0001").replace(/@/g, "\u0002").replace(/S/g, "\u0003").replace(/\u0001/g, A(S) + "ā").replace(/\u0002/g, A(S)).replace(/\u0003/g, S)),
      sutras: [...add, ...sut],
    }))
  );
}
const LAT_P: E[][] = [[["Sti", []], ["Staḥ", [93]], ["@anti", [291]]], [["Ssi", []], ["Sthaḥ", [93]], ["Stha", []]], [["Āmi", [292]], ["Āvaḥ", [292, 93]], ["Āmaḥ", [292, 93]]]];
const LAT_A: E[][] = [[["Ste", []], ["@ete", [295]], ["@ante", [291]]], [["Sse", []], ["@ethe", [295]], ["Sdhve", []]], [["@e", [291]], ["Āvahe", [292]], ["Āmahe", [292]]]];
const LAN_P: E[][] = [[["St", []], ["Stām", []], ["@an", [291]]], [["Sḥ", [93]], ["Stam", []], ["Sta", []]], [["@am", [291]], ["Āva", [292]], ["Āma", [292]]]];
const LAN_A: E[][] = [[["Sta", []], ["@etām", [295]], ["@anta", [291]]], [["Sthāḥ", [93]], ["@ethām", [295]], ["Sdhvam", []]], [["@e", [291]], ["Āvahi", [292]], ["Āmahi", [292]]]];
const LOT_P: E[][] = [[["Stu/Stāt", [299]], ["Stām", []], ["@antu", [291]]], [["S/Stāt", [300, 299]], ["Stam", []], ["Sta", []]], [["Āni", [292]], ["Āva", [292]], ["Āma", [292]]]];
const LOT_A: E[][] = [[["Stām", []], ["@etām", [295]], ["@antām", [291]]], [["Ssva", []], ["@ethām", [295]], ["Sdhvam", []]], [["@ai", [291]], ["Āvahai", [292]], ["Āmahai", [292]]]];
const LIN_P: E[][] = [[["@et", [296]], ["@etām", [296]], ["@eyuḥ", [297]]], [["@eḥ", [296]], ["@etam", [296]], ["@eta", [296]]], [["@eyam", [298]], ["@eva", [296]], ["@ema", [296]]]];
const LIN_A: E[][] = [[["@eta", [296]], ["@eyātām", [296]], ["@eran", [296]]], [["@ethāḥ", [296]], ["@eyāthām", [296]], ["@edhvam", [296]]], [["@eya", [296]], ["@evahi", [296]], ["@emahi", [296]]]];
const LUT_P = (T: string): FormCell[][] => [[`${T}ā`, `${T}ārau`, `${T}āraḥ`], [`${T}āsi`, `${T}āsthaḥ`, `${T}āstha`], [`${T}āsmi`, `${T}āsvaḥ`, `${T}āsmaḥ`]].map((r) => r.map((f) => ({ forms: [f], sutras: [269] })));
const LUT_A = (T: string): FormCell[][] => [[`${T}ā`, `${T}ārau`, `${T}āraḥ`], [`${T}āse`, `${T}āsāthe`, `${T}ādhve`], [`${T}āhe`, `${T}āsvahe`, `${T}āsmahe`]].map((r) => r.map((f) => ({ forms: [f], sutras: [269] })));

/** The augment a before the dhātu (Sūtra 306); before a vowel it is ā + vṛṣṇīndra. */
function augment(S: string): string {
  const f = S[0];
  if (!isVowel(f)) return "a" + S;
  const map: Record<string, string> = { a: "ā", ā: "ā", i: "ai", ī: "ai", u: "au", ū: "au", ṛ: "ār", e: "ai", o: "au" };
  return (map[f] ?? "a" + f) + S.slice(1);
}

// ---------------------------------------------------------------- future stems
// whole future stems taken from the Dhātu-pāṭha usage (not derived here)
const FUT: Record<string, [string, string]> = {
  dṛś: ["drakṣya", "draṣṭ"], sṛj: ["srakṣya", "sraṣṭ"], gam: ["gamiṣya", "gant"], han: ["haniṣya", "hant"], labh: ["lapsya", "labdh"],
  vac: ["vakṣya", "vakt"], yaj: ["yakṣya", "yaṣṭ"], dah: ["dhakṣya", "dagdh"], vas: ["vatsya", "vast"], sthā: ["sthāsya", "sthāt"],
  pā: ["pāsya", "pāt"], dā: ["dāsya", "dāt"], ji: ["jeṣya", "jet"], kṛ: ["kariṣya", "kart"], hṛ: ["hariṣya", "hart"], smṛ: ["smariṣya", "smart"],
  nī: ["neṣya", "net"], śru: ["śroṣya", "śrot"], muc: ["mokṣya", "mokt"], tyaj: ["tyakṣya", "tyakt"], pac: ["pakṣya", "pakt"], śak: ["śakṣya", "śakt"],
  prach: ["prakṣya", "praṣṭ"], viś: ["vekṣya", "veṣṭ"], diś: ["dekṣya", "deṣṭ"], budh: ["bhotsya", "boddh"], yudh: ["yotsya", "yoddh"], rudh: ["rotsya", "roddh"],
  krudh: ["krotsya", "kroddh"], sidh: ["setsya", "seddh"], āp: ["āpsya", "āpt"], tap: ["tapsya", "tapt"], kṣip: ["kṣepsya", "kṣept"], man: ["maṁsya", "mant"],
};

function futureStems(root: string, g: number, it: string, presStem: string): { sya: string[]; ta: string[]; sutras: number[]; derived: boolean } {
  if (g === 10) {
    const b = presStem.slice(0, -1); // coraya → coray
    return { sya: [`${b}iṣya`], ta: [`${b}it`], sutras: [316, 108], derived: true };
  }
  if (FUT[root]) return { sya: [FUT[root][0]], ta: [FUT[root][1]], sutras: [], derived: false };
  // govinda of the final vowel, or of a short vowel before one final consonant
  let gstem = root;
  const last = root.slice(-1);
  if (isVowel(last) && GUNA[last]) gstem = root.slice(0, -1) + GUNA[last];
  else {
    const m = /^(.*?)([iuṛ])(kh|gh|ch|jh|ṭh|ḍh|th|dh|ph|bh|[^aāiīuūṛṝeo])$/.exec(root);
    if (m) gstem = m[1] + GUNA[m[2]] + m[3];
  }
  const set = (s: string) => {
    const b = s.endsWith("e") ? s.slice(0, -1) + "ay" : s.endsWith("o") ? s.slice(0, -1) + "av" : s;
    return { sya: `${b}iṣya`, ta: `${b}it` };
  };
  const anit = (s: string) => {
    if (isVowel(s.slice(-1)) || /ar$/.test(s)) return { sya: s + (/[aā]$/.test(s) ? "sya" : "ṣya"), ta: s + "t" };
    const l = lastLetter(s);
    const b = s.slice(0, -l.length);
    if ("k kh g gh c j ś ṣ h".split(" ").includes(l)) return { sya: `${b}kṣya`, ta: `${b}${["ś", "ṣ", "j"].includes(l) ? "ṣṭ" : "kt"}` };
    if ("t th d dh".split(" ").includes(l)) return { sya: `${b}tsya`, ta: `${b}${l === "dh" ? "ddh" : "tt"}` };
    if ("p ph b bh".split(" ").includes(l)) return { sya: `${b}psya`, ta: `${b}${l === "bh" ? "bdh" : "pt"}` };
    if (l === "m" || l === "n") return { sya: `${b}ṁsya`, ta: `${b}nt` };
    if (l === "s") return { sya: `${b}tsya`, ta: `${b}st` };
    return { sya: `${s}sya`, ta: `${s}t` };
  };
  const out = { sya: [] as string[], ta: [] as string[], sutras: [289] as number[], derived: true };
  if (it === "seṭ" || it === "veṭ" || /ṛ$/.test(root)) {
    const x = set(gstem);
    out.sya.push(x.sya);
    out.ta.push(x.ta);
    out.sutras.push(316, 108);
  }
  if (it === "aniṭ" || it === "veṭ") {
    const x = anit(gstem);
    if (!out.sya.includes(x.sya)) out.sya.push(x.sya);
    if (!out.ta.includes(x.ta)) out.ta.push(x.ta);
    if (/kṣya$/.test(x.sya)) out.sutras.push(108);
  }
  return out;
}

const THEMATIC = new Set([1, 4, 6, 10]);
export const GANA_NAMES: Record<number, string> = { 1: "bhvādi", 2: "adādi", 3: "juhotyādi", 4: "divādi", 5: "svādi", 6: "tudādi", 7: "rudhādi", 8: "tanādi", 9: "kryādi", 10: "curādi" };

export function conjugate(entry: DhatuRow): Conjugation | { error: string; entry: DhatuRow } {
  const { root, idit, markers } = rootOf(entry.d);
  const thematic = THEMATIC.has(entry.g);
  const ps = thematic ? presentStem(root, entry.g, idit) : { stem: root, steps: [{ sutra: { 2: 477, 3: 519, 5: 544, 7: 551, 8: 553, 9: 561 }[entry.g], change: { 2: "no vikaraṇa (śap dropped)", 3: "śap dropped and the dhātu doubled", 5: "śnu (nu) after the dhātu", 7: "śnam (na) inside the dhātu", 8: "u after the dhātu", 9: "śnā (nā) after the dhātu" }[entry.g] ?? "" }] };
  if (!ps) return { error: "This dhātu is not handled yet.", entry };
  const S = ps.stem;
  // in the other tenses as → bhū, brū → vac (Sūtra 499)
  const rootA = ({ as: "bhū", brū: "vac" } as Record<string, string>)[root] ?? root;
  const notes: string[] = [];
  const padas: ("para" | "ātma")[] = entry.p === "P" ? ["para"] : entry.p === "A" ? ["ātma"] : ["para", "ātma"];
  if (entry.p === "U") notes.push("Ubhayapadī: parapada when the fruit of the action goes to another, ātmapada when to the doer (Sūtra 285).");
  const fut = futureStems(rootA, entry.g, rootA === root ? entry.i : rootA === "bhū" ? "seṭ" : "aniṭ", S);
  if (!fut.derived) notes.push("The kalki and bāla-kalki stems of this dhātu are given as they are used; their special sūtras come later in the Ākhyāta-prakaraṇa.");
  if (entry.i === "veṭ") notes.push("Veṭ: the future is formed both with and without iṭ.");
  const tables: TenseTable[] = [];
  const AUG = augment(S);
  for (const pada of padas) {
    const pd = pada === "para" ? 278 : 279;
    const P = pada === "para";
    const ath = thematic ? null : athematic(root, entry.g, pada);
    const pres = (k: string) => ath?.find((x) => x.key === k)?.cells;
    tables.push({ key: "lat", name: "Present", hnv: "acyuta (laṭ)", pada, cells: pres("lat") ?? table(S, P ? LAT_P : LAT_A, [262, pd]) });
    tables.push({ key: "lan", name: "Imperfect", hnv: "bhūteśvara (laṅ)", pada, cells: pres("lan") ?? table(AUG, P ? LAN_P : LAN_A, [265, 306, pd]) });
    tables.push({ key: "lot", name: "Imperative", hnv: "vidhātā (loṭ)", pada, cells: pres("lot") ?? table(S, P ? LOT_P : LOT_A, [264, pd]) });
    tables.push({ key: "lin", name: "Optative", hnv: "vidhi (vidhi-liṅ)", pada, cells: pres("lin") ?? table(S, P ? LIN_P : LIN_A, [263, pd]) });
    // kalki (lṛṭ): the sya-stem conjugated like the present
    const fc = fut.sya.map((F) => table(F, P ? LAT_P : LAT_A, [270, pd, ...fut.sutras]));
    tables.push({ key: "lrt", name: "Future", hnv: "kalki (lṛṭ)", pada, cells: fc[0].map((r, i) => r.map((c, j) => ({ forms: [...new Set(fc.flatMap((t) => t[i][j].forms))], sutras: c.sutras }))) });
    const ac = fut.sya.map((F) => table(augment(F), P ? LAN_P : LAN_A, [271, 306, pd, ...fut.sutras]));
    tables.push({ key: "lrn", name: "Conditional", hnv: "ajita (lṛṅ)", pada, cells: ac[0].map((r, i) => r.map((c, j) => ({ forms: [...new Set(ac.flatMap((t) => t[i][j].forms))], sutras: c.sutras }))) });
    const lit = litForms(rootA, entry.g, pada, entry.i, entry.g === 10 ? S : undefined);
    tables.push({ key: "lit", name: "Perfect", hnv: "adhokṣaja (liṭ)", pada, cells: lit.cells, note: lit.note });
    const lun = lunForms(rootA, entry.g, pada, entry.i, entry.k, markers, entry.g === 10 ? S : undefined);
    tables.push({ key: "lun", name: "Aorist", hnv: "bhūteśa (luṅ)", pada, cells: lun.cells, note: `Type: ${lun.type}` });
    tables.push({ key: "asir", name: "Benedictive", hnv: "kāmapāla (āśīr-liṅ)", pada, cells: asirForms(rootA, entry.g, pada, entry.i, entry.g === 10 ? S : undefined) });
    const tc = fut.ta.map((T) => (P ? LUT_P(T) : LUT_A(T)));
    tables.push({ key: "lut", name: "Periphrastic future", hnv: "bāla-kalki (luṭ)", pada, cells: tc[0].map((r, i) => r.map((c, j) => ({ forms: [...new Set(tc.flatMap((t) => t[i][j].forms))], sutras: [...c.sutras, pd, ...fut.sutras.filter((x) => x !== 108)] }))) });
  }
  if (rootA !== root) notes.push(`Outside the present system ${root} is replaced by ${rootA} (Sūtra 499).`);
  return { root, entry, stem: S, stemSteps: ps.steps, tables, notes };
}
