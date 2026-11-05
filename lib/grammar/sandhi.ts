// Sandhi joiner and splitter on the sūtras of Madhyama Harināmāmṛta-vyākaraṇa
// (Saṁjñā–Sandhi-prakaraṇa 41–86: Sarveśvara 42–60, Viṣṇujana 61–78,
// Viṣṇusarga 79–86). Every change records the sūtra that makes it.
// Works in IAST; the UI converts other scripts.

export type Step = { sutra: number; change: string; optional?: boolean };
export type Variant = { text: string; steps: Step[] };

/** Madhyama sūtra → text and the Pāṇinian equivalent (from the HNV concordance). */
export const SUTRAS: Record<number, { t: string; p?: string }> = {
  41: { t: "sarva-prakaraṇa-vyāpī varṇa-mātra-nimittakaḥ vārṇo vikāraḥ sandhiḥ syād viṣayāpekṣakaḥ kvacit" },
  42: { t: "daśāvatāra ekātmake militvā trivikramaḥ", p: "6.1.101 akaḥ savarṇe dīrghaḥ" },
  43: { t: "a-dvayam i-dvaye e", p: "6.1.87 ād guṇaḥ" },
  44: { t: "u-dvaye o", p: "6.1.87 ād guṇaḥ" },
  45: { t: "ṛ-dvaye ar", p: "1.1.51 ur aṇ ra-paraḥ" },
  47: { t: "ḷ-dvaye al", p: "1.1.51 ur aṇ ra-paraḥ" },
  48: { t: "e-dvaye ai", p: "6.1.88 vṛddhir eci" },
  49: { t: "o-dvaye au", p: "6.1.88 vṛddhir eci" },
  50: { t: "i-dvayam eva yaḥ sarveśvare", p: "6.1.77 iko yaṇ aci" },
  51: { t: "u-dvayaṁ vaḥ", p: "6.1.77 iko yaṇ aci" },
  52: { t: "ṛ-dvayaṁ raḥ", p: "6.1.77 iko yaṇ aci" },
  53: { t: "ḷ-dvayaṁ laḥ", p: "6.1.77 iko yaṇ aci" },
  54: { t: "e ay · ai āy", p: "6.1.78 eco ’y-av-āy-āvaḥ" },
  55: { t: "o av · au āv", p: "6.1.78 eco ’y-av-āy-āvaḥ" },
  56: { t: "e-obhyām asya haro viṣṇupadānte", p: "6.1.109 eṅaḥ padāntād ati" },
  57: { t: "ay-ādīnāṁ ya-vayor vā", p: "8.3.19 lopaḥ śākalyasya" },
  58: { t: "teṣāṁ na sandhir nityam", p: "8.2.1 pūrvatrāsiddham" },
  59: { t: "o-rāmāntānām anantānāṁ cāvyayānāṁ sarveśvare", p: "1.1.14 nipāta ekāj anāṅ · 1.1.15 ot" },
  60: { t: "īd-ūd-etāṁ dvi-vacanasya maṇīvādi-varjam", p: "1.1.11 īd-ūd-ed dvi-vacanaṁ pragṛhyam" },
  61: { t: "viṣṇudāso viṣṇupadānte harighoṣe ca harigadā", p: "8.2.39 jhalāṁ jaśo ’nte · 8.4.53 jhalāṁ jaś jhaśi" },
  62: { t: "hariveṇau hariveṇur vā", p: "8.4.45 yaro ’nunāsike ’nunāsiko vā" },
  63: { t: "yādava-mātre harikamalam", p: "8.4.55 khari ca" },
  64: { t: "tataḥ śaś cho vā", p: "8.4.63 śaś cho ’ṭi" },
  65: { t: "ho harighoṣaḥ", p: "8.4.62 jhayo ho ’nyatarasyām" },
  66: { t: "da-tau para-varṇau la-ca-ṭa-vargeṣu nityam", p: "8.4.40 s-toḥ ś-cunā ś-cuḥ · 8.4.41 ṣ-ṭunā ṣ-ṭuḥ · 8.4.60 tor li" },
  67: { t: "taś ca śe", p: "8.4.40 s-toḥ ś-cunā ś-cuḥ" },
  68: { t: "no ’ntaś ca-chayoḥ śa-rāmo, viṣṇucakra-pūrvo viṣṇucāpa-pūrvo vā", p: "8.3.7 naś chavy apraśān" },
  69: { t: "le la-rāma eva", p: "8.4.60 tor li" },
  70: { t: "ja-jha-ña-śa-rāmeṣu ña-rāmaḥ", p: "8.4.40 s-toḥ ś-cunā ś-cuḥ" },
  71: { t: "śe cānto vā", p: "8.3.31 śi tuk" },
  72: { t: "mo viṣṇucakraṁ viṣṇujane", p: "8.3.23 mo ’nusvāraḥ" },
  73: { t: "viṣṇucakrasya hariveṇur viṣṇuvarge, viṣṇupadāntasya tu vā", p: "8.4.58 anusvārasya yayi para-savarṇaḥ · 8.4.59 vā padāntasya" },
  74: { t: "dviḥ sarveśvara-mātrāc chaḥ", p: "6.1.73 che ca" },
  75: { t: "viṣṇupadāntāt trivikramād vā", p: "6.1.76 padāntād vā" },
  76: { t: "vāmanāt ṅa-ṇa-nā dviḥ sarveśvare", p: "8.3.32 ṅamo hrasvād aci ṅamuṇ nityam" },
  79: { t: "ca-chayoḥ śa-rāmaḥ · ṭa-ṭhayoḥ ṣa-rāmaḥ · ta-thayoḥ sa-rāmaḥ", p: "8.3.34 visarjanīyasya saḥ" },
  80: { t: "ād a-rāma-gopālayor ur nityam", p: "6.1.113 ato ror aplutād aplute · 6.1.114 haśi ca" },
  81: { t: "a-dvaya-bho-bhago-aghobhyo lopyaḥ, sarveśvare tu yaś ca, na ca lope sandhiḥ", p: "8.3.17 bho-bhago-agho-apūrvasya yo ’śi · 8.3.22 hali sarveṣām" },
  82: { t: "eṣa-sa-paro viṣṇujane", p: "6.1.132 etat-tadoḥ su-lopo ’kor anañ-samāse hali" },
  83: { t: "ra īśvarāt sarveśvara-gopālayoḥ", p: "8.2.66 sa-sajuṣo ruḥ" },
  84: { t: "anīśvarād api ra-rāma-jaḥ", p: "8.2.66 sa-sajuṣo ruḥ" },
  85: { t: "ahno viṣṇusargasya ro rātri-rūpa-rathantarād anyeṣu", p: "8.2.69 ro ’supi" },
  86: { t: "ro re lopyaḥ, pūrvaś ca trivikramaḥ", p: "8.3.14 ro ri · 6.3.111 ḍh-ra-lope pūrvasya dīrgho ’ṇaḥ" },
};

// ---------------------------------------------------------------- letters
const MULTI = ["kh", "gh", "ch", "jh", "ṭh", "ḍh", "th", "dh", "ph", "bh", "ai", "au", "m̐", "l̐"];
export const VOWELS = ["a", "ā", "i", "ī", "u", "ū", "ṛ", "ṝ", "ḷ", "e", "ai", "o", "au"];
const SHORT = new Set(["a", "i", "u", "ṛ", "ḷ"]);
const LONG: Record<string, string> = { a: "ā", ā: "ā", i: "ī", ī: "ī", u: "ū", ū: "ū", ṛ: "ṝ", ṝ: "ṝ", ḷ: "ṝ" };
const FAMILY: Record<string, string> = { a: "a", ā: "a", i: "i", ī: "i", u: "u", ū: "u", ṛ: "ṛ", ṝ: "ṛ", ḷ: "ṛ" };
const VARGA = [
  ["k", "kh", "g", "gh", "ṅ"],
  ["c", "ch", "j", "jh", "ñ"],
  ["ṭ", "ṭh", "ḍ", "ḍh", "ṇ"],
  ["t", "th", "d", "dh", "n"],
  ["p", "ph", "b", "bh", "m"],
];
const vargaOf = (c: string) => VARGA.findIndex((v) => v.includes(c));
const isV = (c?: string) => !!c && VOWELS.includes(c);
const isStop = (c?: string) => !!c && vargaOf(c) >= 0 && !VARGA.some((v) => v[4] === c);
const isNasal = (c?: string) => !!c && VARGA.some((v) => v[4] === c);
const KHAR = new Set(["k", "kh", "c", "ch", "ṭ", "ṭh", "t", "th", "p", "ph", "ś", "ṣ", "s"]);
const voiced = (c?: string) => !!c && !KHAR.has(c) && c !== "ḥ" && c !== "ṁ";
export const CONSONANTS = [...VARGA.flat(), "y", "r", "l", "v", "ś", "ṣ", "s", "h"];

/** IAST → letters ("kṛṣṇaḥ" → k ṛ ṣ ṇ a ḥ). */
export function letters(s: string): string[] {
  const t = s.normalize("NFC").toLowerCase().replace(/ṃ/g, "ṁ").replace(/[’‘]/g, "'");
  const out: string[] = [];
  for (let i = 0; i < t.length; ) {
    const two = t.slice(i, i + 2);
    if (MULTI.includes(two)) {
      out.push(two);
      i += 2;
    } else {
      out.push(t[i]);
      i += 1;
    }
  }
  return out;
}

// words whose visarga stands for r (Sūtra 84)
const R_VISARGA = new Set(["punaḥ", "antaḥ", "prātaḥ", "svaḥ", "ahaḥ", "dvāḥ", "catuḥ", "bhrātaḥ", "pitaḥ", "mātaḥ", "kartaḥ", "dātaḥ"]);
// avyayas that never join before a vowel (Sūtra 59)
const AVYAYA_59 = new Set(["a", "ā", "i", "u", "aho", "atho", "utāho", "ho", "he"]);

type Opts = { dual?: boolean };

/** Join two words (IAST). Returns every correct result, with the sūtras. */
export function joinTwo(left: string, right: string, opts: Opts = {}): Variant[] {
  const L = letters(left.trim());
  const R = letters(right.trim());
  if (!L.length) return [{ text: right, steps: [] }];
  if (!R.length) return [{ text: left, steps: [] }];
  const x = L[L.length - 1];
  const y = R[0];
  const lw = L.join("");
  const pre = L.slice(0, -1).join("");
  const rest = R.slice(1).join("");
  const out: Variant[] = [];
  const add = (text: string, ...steps: Step[]) => out.push({ text, steps });
  const S = (sutra: number, change: string, optional?: boolean): Step => ({ sutra, change, optional });

  // ------------------------------------------------ vowel + vowel (Sarveśvara-sandhi)
  if (isV(x) && isV(y)) {
    if (opts.dual && ["ī", "ū", "e"].includes(x)) return [{ text: `${lw} ${R.join("")}`, steps: [S(60, `dual in ${x}: no sandhi`)] }];
    if (AVYAYA_59.has(lw)) return [{ text: `${lw} ${R.join("")}`, steps: [S(59, `the avyaya “${lw}” does not join before a vowel`)] }];
    if (FAMILY[x] && FAMILY[x] === FAMILY[y]) return [{ text: pre + LONG[x] + rest, steps: [S(42, `${x} + ${y} → ${LONG[x]}`)] }];
    if (x === "a" || x === "ā") {
      const m: Record<string, [string, number]> = { i: ["e", 43], ī: ["e", 43], u: ["o", 44], ū: ["o", 44], ṛ: ["ar", 45], ṝ: ["ar", 45], ḷ: ["al", 47], e: ["ai", 48], ai: ["ai", 48], o: ["au", 49], au: ["au", 49] };
      const r = m[y];
      if (r) return [{ text: pre + r[0] + rest, steps: [S(r[1], `${x} + ${y} → ${r[0]}`)] }];
    }
    const yan: Record<string, [string, number]> = { i: ["y", 50], ī: ["y", 50], u: ["v", 51], ū: ["v", 51], ṛ: ["r", 52], ṝ: ["r", 52], ḷ: ["l", 53] };
    if (yan[x]) return [{ text: pre + yan[x][0] + R.join(""), steps: [S(yan[x][1], `${x} → ${yan[x][0]} before ${y}`)] }];
    if ((x === "e" || x === "o") && y === "a") return [{ text: `${lw} '${rest}`, steps: [S(56, `${x} + a: the a is dropped (’)`)] }];
    const ayadi: Record<string, [string, number, string]> = { e: ["ay", 54, "a"], ai: ["āy", 54, "ā"], o: ["av", 55, "a"], au: ["āv", 55, "ā"] };
    const r = ayadi[x];
    if (r) {
      add(pre + r[0] + R.join(""), S(r[1], `${x} → ${r[0]}`));
      add(`${pre}${r[2]} ${R.join("")}`, S(r[1], `${x} → ${r[0]}`), S(57, `the ${r[0].slice(-1)} is dropped`, true), S(58, "no further sandhi"));
      return out;
    }
  }

  // ------------------------------------------------ visarga (Viṣṇusarga-sandhi)
  if (x === "ḥ" && isV(L[L.length - 2])) {
    const pv = L[L.length - 2];
    const fromR = R_VISARGA.has(lw) && !(lw === "ahaḥ" && /^(rātri|rūpa|rathantara)/.test(right));
    if (lw === "ahaḥ" && !fromR) return [{ text: `aho ${R.join("")}`, steps: [S(85, "before rātri, rūpa, rathantara: aḥ → o")] }];
    const rToR = (base: string, steps: Step[]) => {
      // r before r: dropped, the vowel before it long
      const v = letters(base).pop()!;
      return { text: base.slice(0, -v.length) + (LONG[v] ?? v) + " " + R.join(""), steps: [...steps, S(86, `r before r is dropped; ${v} → ${LONG[v] ?? v}`)] };
    };
    if (["c", "ch"].includes(y)) return [{ text: `${pre}ś ${R.join("")}`, steps: [S(79, `ḥ → ś before ${y}`)] }];
    if (["ṭ", "ṭh"].includes(y)) return [{ text: `${pre}ṣ ${R.join("")}`, steps: [S(79, `ḥ → ṣ before ${y}`)] }];
    if (["t", "th"].includes(y)) return [{ text: `${pre}s ${R.join("")}`, steps: [S(79, `ḥ → s before ${y}`)] }];
    if (KHAR.has(y)) return [{ text: `${lw} ${R.join("")}`, steps: [] }];
    if ((lw === "saḥ" || lw === "eṣaḥ") && !isV(y)) return [{ text: `${pre} ${R.join("")}`, steps: [S(82, `${lw}: ḥ dropped before a consonant`)] }];
    if (fromR || (pv && isV(pv) && pv !== "a" && pv !== "ā" && !["bhoḥ", "bhagoḥ", "aghoḥ"].includes(lw))) {
      const st = fromR ? S(84, "this ḥ comes from r: ḥ → r") : S(83, `after ${pv}: ḥ → r`);
      if (y === "r") return [rToR(pre, [st])];
      return [{ text: `${pre}r ${R.join("")}`, steps: [st] }];
    }
    if (pv === "a") {
      if (y === "a") return [{ text: `${L.slice(0, -2).join("")}o '${rest}`, steps: [S(80, "aḥ → o before a"), S(56, "o + a: the a is dropped (’)")] }];
      if (!isV(y)) return [{ text: `${L.slice(0, -2).join("")}o ${R.join("")}`, steps: [S(80, `aḥ → o before ${y}`)] }];
      add(`${pre} ${R.join("")}`, S(81, "ḥ dropped before a vowel"), S(81, "no further sandhi"));
      add(`${pre}y ${R.join("")}`, S(81, "ḥ → y before a vowel", true));
      return out;
    }
    // ā, bhoḥ, bhagoḥ, aghoḥ
    if (isV(y)) {
      add(`${pre} ${R.join("")}`, S(81, "ḥ dropped before a vowel"), S(81, "no further sandhi"));
      add(`${pre}y ${R.join("")}`, S(81, "ḥ → y before a vowel", true));
      return out;
    }
    return [{ text: `${pre} ${R.join("")}`, steps: [S(81, `ḥ dropped before ${y}`)] }];
  }

  // ------------------------------------------------ consonants (Viṣṇujana-sandhi)
  if (x === "m" && !isV(y)) {
    add(`${pre}ṁ ${R.join("")}`, S(72, "m → ṁ before a consonant"));
    if (isStop(y) || isNasal(y)) {
      const n = VARGA[vargaOf(y)][4];
      if (n !== "m") add(`${pre}${n} ${R.join("")}`, S(72, "m → ṁ"), S(73, `ṁ → ${n} before ${y}`, true));
      else add(`${pre}m ${R.join("")}`, S(72, "m → ṁ"), S(73, `ṁ → m before ${y}`, true));
    }
    return out;
  }
  if (["ṅ", "ṇ", "n"].includes(x) && isV(y) && SHORT.has(L[L.length - 2] ?? "")) return [{ text: `${lw}${x}${R.join("")}`, steps: [S(76, `after a short vowel, ${x} is doubled before a vowel`)] }];
  if (x === "n") {
    if (y === "c" || y === "ch") {
      add(`${pre}ṁś ${R.join("")}`, S(68, `n → ṁś before ${y}`));
      add(`${pre}m̐ś ${R.join("")}`, S(68, `n → m̐ś before ${y}`, true));
      return out;
    }
    if (["j", "jh", "ñ"].includes(y)) return [{ text: `${pre}ñ ${R.join("")}`, steps: [S(70, `n → ñ before ${y}`)] }];
    if (y === "ś") {
      add(`${pre}ñ ${R.join("")}`, S(70, "n → ñ before ś"));
      add(`${pre}ñc ${R.join("")}`, S(70, "n → ñ"), S(71, "c is added before ś", true));
      add(`${pre}ñc ch${rest}`, S(70, "n → ñ"), S(71, "c is added", true), S(64, "ś → ch", true));
      return out;
    }
    if (y === "l") return [{ text: `${pre}l̐ ${R.join("")}`, steps: [S(69, "n → nasal l̐ before l")] }];
  }
  if (isStop(x)) {
    const v = vargaOf(x);
    const jas = VARGA[v][2];
    const car = VARGA[v][0];
    const steps: Step[] = [];
    // t-class before l, c- and ṭ-class, ś
    if (v === 3) {
      const yv = vargaOf(y);
      if (y === "l") return [{ text: `${pre}l ${R.join("")}`, steps: [S(66, "t/d → l before l")] }];
      if (y === "ś") {
        add(`${pre}c ${R.join("")}`, S(67, "t → c before ś"));
        add(`${pre}c ch${rest}`, S(67, "t → c"), S(64, "ś → ch", true));
        return out;
      }
      if (yv === 1 || yv === 2) {
        const to = voiced(y) ? VARGA[yv][2] : VARGA[yv][0];
        if (isNasal(y)) {
          add(`${pre}${VARGA[yv][2]} ${R.join("")}`, S(66, `t/d → ${VARGA[yv][2]} before ${y}`));
          add(`${pre}${y} ${R.join("")}`, S(66, `t/d → ${VARGA[yv][2]}`), S(62, `→ ${y} before the nasal`, true));
          return out;
        }
        return [{ text: `${pre}${to} ${R.join("")}`, steps: [S(66, `t/d → ${to} before ${y}`)] }];
      }
    }
    if (KHAR.has(y)) {
      if (x !== car) steps.push(S(63, `${x} → ${car} before ${y}`));
      if (y === "ś") {
        add(`${pre}${car} ${R.join("")}`, ...steps);
        add(`${pre}${car} ch${rest}`, ...steps, S(64, "ś → ch", true));
        return out;
      }
      return [{ text: `${pre}${car} ${R.join("")}`, steps }];
    }
    if (x !== jas) steps.push(S(61, `${x} → ${jas} (voiced) before ${y}`));
    if (isNasal(y)) {
      add(`${pre}${jas} ${R.join("")}`, ...steps);
      add(`${pre}${VARGA[v][4]} ${R.join("")}`, ...steps, S(62, `${jas} → ${VARGA[v][4]} before the nasal ${y}`, true));
      return out;
    }
    if (y === "h") {
      add(`${pre}${jas} ${R.join("")}`, ...steps);
      add(`${pre}${jas} ${VARGA[v][3]}${rest}`, ...steps, S(65, `h → ${VARGA[v][3]} after ${jas}`, true));
      return out;
    }
    return [{ text: `${pre}${jas}${isV(y) ? "" : " "}${R.join("")}`, steps }];
  }

  // ------------------------------------------------ vowel + ch (Sūtras 74–75)
  if (isV(x) && y === "ch") {
    if (SHORT.has(x)) return [{ text: `${lw}c${R.join("")}`, steps: [S(74, "c is added before ch after a short vowel")] }];
    add(`${lw} ${R.join("")}`);
    add(`${lw}c${R.join("")}`, S(75, "after a long vowel at the end of a word, c may be added before ch", true));
    return out;
  }

  // no sandhi
  return [{ text: isV(y) && !isV(x) ? lw + R.join("") : `${lw} ${R.join("")}`, steps: [] }];
}

/** Join any number of words, left to right. */
export function joinWords(words: string[], opts: Opts = {}): Variant[] {
  let cur: Variant[] = [{ text: words[0] ?? "", steps: [] }];
  for (const w of words.slice(1)) {
    const next: Variant[] = [];
    for (const c of cur) {
      // join the last word of what we have with the next one
      const parts = c.text.split(" ");
      const last = parts.pop()!;
      for (const v of joinTwo(last, w, opts)) next.push({ text: [...parts, v.text].join(" ").replace(/\s+/g, " "), steps: [...c.steps, ...v.steps] });
    }
    cur = dedupe(next).slice(0, 24);
  }
  return cur;
}

const dedupe = (vs: Variant[]) => {
  const seen = new Set<string>();
  return vs.filter((v) => (seen.has(v.text) ? false : (seen.add(v.text), true)));
};

// ---------------------------------------------------------------- splitting
const ENDS = ["", ...VOWELS, "aḥ", "āḥ", "iḥ", "īḥ", "uḥ", "ūḥ", "eḥ", "oḥ", "am", "an", "ān", "at", "ḥ", "m", "n", "ṅ", "ṇ", "k", "ṭ", "t", "p", "d"];
const STARTS = ["", ...VOWELS, ...CONSONANTS];
const squash = (s: string) => s.replace(/[\s'’]/g, "");

export type Split = { left: string; right: string; steps: Step[]; score: number };

/** Every way of reading a joined form as two words, each checked by joining it back. */
export function splitWord(form: string): Split[] {
  const P = letters(form.replace(/\s+/g, ""));
  const target = squash(P.join(""));
  const found = new Map<string, Split>();
  for (let i = 1; i < P.length; i++)
    for (let k = 0; k <= 3 && i + k <= P.length; k++) {
      const head = P.slice(0, i);
      const tail = P.slice(i + k);
      for (const x of ENDS)
        for (const y of STARTS) {
          if (!x && !y && k > 0) continue;
          const L = [...head, ...letters(x)];
          const R = [...letters(y), ...tail];
          if (L.length < 2 || R.length < 2) continue;
          if (L[L.length - 1] === "ḥ" && !isV(L[L.length - 2])) continue;
          if (!isV(L[0]) && !isV(L[1]) && L.length < 3) continue;
          const l = L.join("");
          const r = R.join("");
          const key = `${l}+${r}`;
          if (found.has(key)) continue;
          for (const v of joinTwo(l, r)) {
            if (squash(v.text) !== target) continue;
            // plain concatenation is the weakest reading; real sandhi steps rank first
            const score = (y === "" ? 3 : 0) + (x === "" && v.steps.length === 0 ? -5 : 0) + v.steps.length * 10 - Math.abs(L.length - R.length) * 0.1 - (v.steps.some((s) => s.optional) ? 1 : 0) + (isV(L[L.length - 1]) || ["ḥ", "m", "n", "t"].includes(L[L.length - 1]) ? 2 : 0);
            found.set(key, { left: l, right: r, steps: v.steps, score });
            break;
          }
        }
    }
  return [...found.values()].sort((a, b) => b.score - a.score).slice(0, 30);
}
