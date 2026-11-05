// Adhokṣaja (liṭ), bhūteśa (luṅ) and kāmapāla (āśīr-liṅ) by Madhyama
// Harināmāmṛta-vyākaraṇa, Ākhyāta-prakaraṇa (Sūtras 260–480).
import type { FormCell } from "@/lib/grammar/dhatu";

type L = string[];
const ASP = ["kh", "gh", "ch", "jh", "ṭh", "ḍh", "th", "dh", "ph", "bh"];
const DIPH = ["ai", "au"];
/** "bhū" → [bh, ū]; letters with aspirates and ai/au as one. */
export function lt(s: string): L {
  const o: L = [];
  for (let i = 0; i < s.length; ) {
    const two = s.slice(i, i + 2);
    if (ASP.includes(two) || DIPH.includes(two)) (o.push(two), (i += 2));
    else (o.push(s[i]), (i += 1));
  }
  return o;
}
const VOW = ["a", "ā", "i", "ī", "u", "ū", "ṛ", "ṝ", "ḷ", "e", "ai", "o", "au"];
export const isV = (c?: string) => !!c && VOW.includes(c);
const SHORT_OF: Record<string, string> = { ā: "a", ī: "i", ū: "u", ṝ: "ṛ", e: "i", ai: "i", o: "u", au: "u" };
const GUNA: Record<string, string> = { i: "e", ī: "e", u: "o", ū: "o", ṛ: "ar", ṝ: "ar", ḷ: "al" };
const VRDDHI: Record<string, string> = { a: "ā", i: "ai", ī: "ai", u: "au", ū: "au", ṛ: "ār", ṝ: "ār", e: "ai", o: "au" };
const UNASP: Record<string, string> = { kh: "k", gh: "g", ch: "c", jh: "j", ṭh: "ṭ", ḍh: "ḍ", th: "t", dh: "d", ph: "p", bh: "b" };
const KU2CU: Record<string, string> = { k: "c", g: "j", ṅ: "ñ", h: "j" };

type Cell = FormCell;
const cell = (forms: string[], sutras: number[]): Cell => ({ forms: [...new Set(forms)], sutras });
const grid = (f: (p: number, n: number) => Cell): Cell[][] => [0, 1, 2].map((p) => [0, 1, 2].map((n) => f(p, n)));

/** Last vowel index. */
const lastV = (l: L) => {
  for (let i = l.length - 1; i >= 0; i--) if (isV(l[i])) return i;
  return -1;
};
/** Laghu-upadhā (a short i/u/ṛ before one final consonant) → govinda (Sūtra 333). */
function gunaStem(root: string): { s: string; sut: number[] } {
  const l = lt(root);
  const last = l[l.length - 1];
  if (isV(last) && GUNA[last]) return { s: l.slice(0, -1).join("") + GUNA[last], sut: [289] };
  const v = lastV(l);
  if (v === l.length - 2 && ["i", "u", "ṛ"].includes(l[v])) return { s: [...l.slice(0, v), GUNA[l[v]], l[l.length - 1]].join(""), sut: [333] };
  return { s: root, sut: [] };
}

// ---------------------------------------------------------------- adhokṣaja (liṭ)
/** The reduplicated syllable (nara) before the root (Sūtras 322–329, 341, 342, 345, 371, 375). */
function abhyasa(root: string): { nara: string; sut: number[] } {
  const l = lt(root);
  const sut = [322, 323, 326];
  const v = lastV(l) >= 0 ? l.findIndex((x) => isV(x)) : -1;
  if (v < 0) return { nara: root, sut };
  const cons = l.slice(0, v);
  let first = cons[0] ?? "";
  // ś/ṣ/s + hard stop: the stop stays (Sūtra 342)
  if (cons.length > 1 && ["ś", "ṣ", "s"].includes(cons[0]) && ["k", "kh", "c", "ch", "ṭ", "ṭh", "t", "th", "p", "ph"].includes(cons[1])) {
    first = cons[1];
    sut.push(342);
  } else if (cons.length > 1) sut.push(341);
  if (UNASP[first]) (first = UNASP[first]), sut.push(329);
  if (KU2CU[first]) (first = KU2CU[first]), sut.push(first === "j" && cons[0] === "h" ? 470 : 345);
  let vow = l[v];
  if (vow === "ṛ" || vow === "ṝ") (vow = "a"), sut.push(371);
  else if (SHORT_OF[vow]) (vow = SHORT_OF[vow]), sut.push(375);
  return { nara: first + vow, sut };
}

const LIT_P_END = [["a", "atuḥ", "uḥ"], ["tha", "athuḥ", "a"], ["a", "va", "ma"]];
const LIT_A_END = [["e", "āte", "ire"], ["se", "āthe", "dhve"], ["e", "vahe", "mahe"]];
const NO_IT_LIT = new Set(["kṛ", "sṛ", "bhṛ", "vṛ", "stu", "dru", "sru", "śru"]);
// samprasāraṇa roots: weak stem, strong stem (Sūtras 471, 472)
const SAMPR: Record<string, [string, string, string, string[]]> = {
  vac: ["uvāc", "ūc", "uvac", ["uvaktha", "uvacitha"]], vad: ["uvād", "ūd", "uvad", ["uvaditha"]], vas: ["uvās", "ūṣ", "uvas", ["uvastha", "uvasitha"]],
  vah: ["uvāh", "ūh", "uvah", ["uvoḍha", "uvahitha"]], yaj: ["iyāj", "īj", "iyaj", ["iyaṣṭha", "iyajitha"]], svap: ["suṣvāp", "suṣup", "suṣvap", ["suṣvaptha", "suṣvapitha"]],
};
const GURUMAT = /^[iīuūṛeo]|^[aā].*[^aāiīuūṛṝeo]{2}$/; // vowel-initial and heavy (Sūtra 368)

/** Periphrastic liṭ: stem + ām + kṛ / bhū / as (Sūtras 368/395, 369, 370, 372). */
function periphrastic(base: string, pada: "para" | "ātma", why: number): Cell[][] {
  const kP = [["cakāra", "cakratuḥ", "cakruḥ"], ["cakartha", "cakrathuḥ", "cakra"], ["cakāra/cakara", "cakṛva", "cakṛma"]];
  const kA = [["cakre", "cakrāte", "cakrire"], ["cakṛṣe", "cakrāthe", "cakṛḍhve"], ["cakre", "cakṛvahe", "cakṛmahe"]];
  const bh = [["babhūva", "babhūvatuḥ", "babhūvuḥ"], ["babhūvitha", "babhūvathuḥ", "babhūva"], ["babhūva", "babhūviva", "babhūvima"]];
  const as = [["āsa", "āsatuḥ", "āsuḥ"], ["āsitha", "āsathuḥ", "āsa"], ["āsa", "āsiva", "āsima"]];
  return grid((p, n) => {
    const forms = [...(pada === "para" ? kP : kA)[p][n].split("/").map((x) => `${base}āñ${x}`), `${base}āmbabhūva`.replace("babhūva", bh[p][n]), `${base}ām${as[p][n]}`];
    return cell(forms, [267, why, 369, 370, 372]);
  });
}

/** s → ṣ after i, u, ṛ, e, o, k, r inside the word (Sūtra 108). */
const satva = (c: Cell[][]) => c.map((r) => r.map((x) => ({ ...x, forms: x.forms.map((f) => f.replace(/([iīuūṛṝeoykr])s(?=[aāiīuūeo])/g, "$1ṣ").replace(/([iīuūṛṝeo])ṣ(?=e$)/, "$1ṣ")) })));
export function litForms(root: string, gana: number, pada: "para" | "ātma", it: string, stem10?: string): { cells: Cell[][]; note?: string } {
  const r = litForms0(root, gana, pada, it, stem10);
  return { ...r, cells: r.note ? r.cells : satva(r.cells) };
}
function litForms0(root: string, gana: number, pada: "para" | "ātma", it: string, stem10?: string): { cells: Cell[][]; note?: string } {
  if (gana === 10 && stem10) return { cells: periphrastic(stem10.replace(/a$/, ""), pada, 395), note: "Curādi: the adhokṣaja is made with ām (Sūtra 395) and kṛ, bhū or as." };
  if (GURUMAT.test(root) && !/^[aā]/.test(root)) return { cells: periphrastic(root, pada, 368), note: "A heavy dhātu beginning with i, u, ṛ, e or o takes ām (Sūtra 368)." };
  if (root === "bhū")
    return {
      cells: grid((p, n) => cell([(pada === "para" ? [["babhūva", "babhūvatuḥ", "babhūvuḥ"], ["babhūvitha", "babhūvathuḥ", "babhūva"], ["babhūva", "babhūviva", "babhūvima"]] : [["babhūve", "babhūvāte", "babhūvire"], ["babhūviṣe", "babhūvāthe", "babhūvidhve/babhūviḍhve"], ["babhūve", "babhūvivahe", "babhūvimahe"]])[p][n]].flatMap((x) => x.split("/")), [267, 311, 322, 328, 316])),
    };
  const sp = SAMPR[root];
  const { nara, sut: aSut } = abhyasa(root);
  const l = lt(root);
  const last = l[l.length - 1];
  const v = lastV(l);
  const finalV = isV(last);
  const singleBetween = l.length === 3 && !isV(l[0]) && l[1] === "a" && !isV(l[2]) && nara[0] === l[0]; // C a C, unchanged abhyāsa (Sūtra 363)
  const lopa = /^(gam|han|jan|khan|ghas)$/.test(root); // Sūtra 437
  const noIt = NO_IT_LIT.has(root);
  const itCons = !noIt; // iṭ before consonant endings (Sūtras 316, 356)
  // thal: seṭ — iṭ; vowel-final aniṭ — optional (385); ṛ-final — none (389); aniṭ with a — optional (386); sṛj, dṛś — optional (387); other aniṭ — iṭ
  const thalIt: "y" | "n" | "v" = it === "seṭ" ? "y" : /ṛ$/.test(root) ? "n" : finalV ? "v" : l[v] === "a" || /^(sṛj|dṛś)$/.test(root) ? "v" : "y";
  return {
    cells: grid((p, n) => {
      const end = (pada === "para" ? LIT_P_END : LIT_A_END)[p][n];
      const strong = pada === "para" && n === 0; // ṇal, thal, ṇal (pit)
      const sut = [267, pada === "para" ? 278 : 279, ...aSut];
      const forms: string[] = [];
      if (sp) {
        const f = strong ? (p === 1 ? sp[3] : [sp[0] + end, ...(p === 2 ? [sp[2] + "a"] : [])]) : [sp[1] + (/^[vm]/.test(end) || /^(se|dhve)$/.test(end) ? "i" : "") + end];
        return cell(f, [...sut, 471, 472]);
      }
      let base: string;
      if (finalV) {
        if (strong) {
          // ṇal: vṛṣṇīndra (Sūtra 314); 1st person optional govinda (Sūtra 359); thal: govinda
          const vr = VRDDHI[last] ?? last;
          const gu = GUNA[last] ?? last;
          if (/[āe]$|ai$|o$/.test(root) && last === "ā") {
            base = root.slice(0, -1);
            forms.push(nara + base + (p === 0 || p === 2 ? "au" : "itha"), ...(p === 1 ? [nara + root + "tha"] : []));
            return cell(forms, [...sut, 414, 415]);
          }
          const pre = nara + l.slice(0, -1).join("");
          if (p === 1) forms.push(pre + gu + (thalIt !== "n" ? "itha" : "tha").replace(/^/, ""), ...(thalIt === "v" ? [pre + gu + "tha"] : []));
          else forms.push(pre + vr + "a", ...(p === 2 ? [pre + gu + "a"] : []));
          return cell(forms.map((x) => x.replace(/eitha$/, "ayitha").replace(/oitha$/, "avitha").replace(/ea$/, "aya").replace(/oa$/, "ava").replace(/aia$/, "āya").replace(/aua$/, "āva").replace(/āra$/, "āra")), [...sut, p === 1 ? 289 : 314, ...(p === 2 ? [359] : []), ...(p === 1 ? [385] : [])]);
        }
        // weak: i/ī → y/iy, u/ū → uv, ṛ → r (Sūtras 381, 383, 52)
        const body = nara + l.slice(0, -1).join("");
        const vowelEnd = isV(end[0]);
        if (last === "ā") base = body;
        else if (vowelEnd) base = body + (["i", "ī"].includes(last) ? (l.length > 1 ? "iy" : "y") : ["u", "ū"].includes(last) ? "uv" : ["ṛ", "ṝ"].includes(last) ? (l.length > 2 ? "ar" : "r") : last);
        else base = body + last;
        const iT = !vowelEnd && itCons ? (last === "ā" ? "" : ["i", "ī"].includes(last) ? (l.length > 1 ? "y" : "y") : ["u", "ū"].includes(last) ? "uv" : l.length > 2 ? "ar" : "r") + "i" : "";
        const f = vowelEnd ? base + end : iT ? body + iT + end : base + end;
        return cell([f.replace(/ārdhve$/, "āṛḍhve")], [...sut, ...(vowelEnd ? [381] : itCons ? [316] : [356])]);
      }
      // consonant-final
      const gs = gunaStem(root);
      if (strong) {
        // a in the upadhā: vṛṣṇīndra in ṇal (Sūtra 358), optional in the 1st person (359); laghu i/u/ṛ: govinda (333)
        const up = l[v];
        const isA = up === "a" && v === l.length - 2;
        const rv = isA ? [...l.slice(0, v), "ā", last].join("") : gs.s;
        const rg = isA ? root : gs.s;
        if (p === 1) {
          const withIt = thalIt !== "n";
          const thIt = singleBetween ? [...l.slice(0, 1), "e", ...l.slice(2)].join("") + "itha" : nara + rg + "itha";
          const bare = root === "dṛś" ? nara + "draṣṭha" : (nara + rg + "tha").replace(/[cj]tha$/, "ktha").replace(/[śṣ]tha$/, "ṣṭha").replace(/(d|dh)tha$/, "ttha").replace(/mtha$/, "ntha").replace(/(bh|b)tha$/, "ptha").replace(/htha$/, "ḍha");
          forms.push(...(withIt ? [thIt] : []), ...(thalIt !== "y" ? [bare] : []));
          return cell(forms, [...sut, ...(isA ? [] : gs.sut), 385, ...(singleBetween ? [363] : [])]);
        }
        forms.push(nara + rv + "a", ...(p === 2 && isA ? [nara + root + "a"] : []));
        return cell(forms, [...sut, ...(isA ? [358] : gs.sut), ...(p === 2 && isA ? [359] : [])]);
      }
      // weak (kapila, Sūtra 337): no govinda; C a C with plain abhyāsa: e and no abhyāsa (363); gam-ādi: a dropped (437)
      let w = nara + root;
      const s2 = [...sut, 337];
      if (singleBetween && !lopa) (w = [l[0], "e", l[2]].join("")), s2.push(363);
      if (lopa) (w = nara + l.filter((_, i) => i !== v).join("")), s2.push(437);
      const iT = !isV(end[0]) && itCons ? "i" : "";
      if (iT) s2.push(316);
      return cell([w + iT + end], s2);
    }),
  };
}

// ---------------------------------------------------------------- bhūteśa (luṅ)
const LUN_P = [["t", "tām", "an"], ["ḥ", "tam", "ta"], ["am", "āva", "āma"]];
const LUN_A = [["ta", "etām", "anta"], ["thāḥ", "ethām", "dhvam"], ["e", "āvahi", "āmahi"]];
const SI_LUK = new Set(["bhū", "sthā", "pā", "dā", "dhā", "i", "gā"]); // Sūtra 308
const augment = (s: string) => (isV(lt(s)[0]) ? (VRDDHI[lt(s)[0]] ?? "ā") + lt(s).slice(1).join("") : "a" + s);

/** Thematic aorist (aṅ / caṅ / sak): a-stem + bhūteśvara endings. */
function thematic(stem: string, pada: "para" | "ātma", sut: number[]): Cell[][] {
  const P = [["t", "tām", "n"], ["ḥ", "tam", "ta"], ["m", "āva", "āma"]];
  const A = [["ta", "etām", "nta"], ["thāḥ", "ethām", "dhvam"], ["e", "āvahi", "āmahi"]];
  const b = stem.slice(0, -1);
  return grid((p, n) => {
    const e = (pada === "para" ? P : A)[p][n];
    const f = /^ā/.test(e) ? b + e : /^e/.test(e) || (pada === "ātma" && p === 2 && n === 0) ? b + e : e === "n" || e === "nta" ? stem + e : stem + e;
    return cell([augment(f)], [266, 306, ...sut]);
  });
}

export function lunForms(root: string, gana: number, pada: "para" | "ātma", it: string, k: string, markers: string[], stem10?: string): { cells: Cell[][]; type: string } {
  const a = (s: string) => augment(s);
  if (pada === "para" && SI_LUK.has(root)) {
    const r = root === "bhū" ? "bhū" : root === "i" ? "gā" : root;
    return {
      type: "si dropped (Sūtra 308)",
      cells: grid((p, n) => {
        const e = [["t", "tām", r === "bhū" ? "an" : "uḥ"], ["ḥ", "tam", "ta"], [r === "bhū" ? "am" : "m", "va", "ma"]][p][n];
        const s = a(r) + (r === "bhū" && /^a/.test(e) ? "v" : "") + e;
        return cell([s.replace(/āuḥ$/, "uḥ")], [266, 306, 307, 308, ...(r === "bhū" ? [310, 311] : [])]);
      }),
    };
  }
  // caṅ: curādi and ṇic (Sūtras 434, 449–454)
  if (gana === 10 && stem10) {
    const base = stem10.replace(/aya$/, "");
    const l = lt(base);
    const v = lastV(l);
    let s = base;
    if (v >= 0 && SHORT_OF[l[v]]) s = [...l.slice(0, v), SHORT_OF[l[v]], ...l.slice(v + 1)].join(""); // upadhā short (450)
    if (/ā/.test(l[v] ?? "") && !/^kath/.test(base)) s = [...l.slice(0, v), "a", ...l.slice(v + 1)].join("");
    const ab = abhyasa(s);
    let nara = ab.nara;
    const light = l.slice(v + 1).length <= 1;
    if (nara.endsWith("a")) nara = nara.slice(0, -1) + (base === s && /a$/.test(stem10.replace(/aya$/, "a")) && /^kath/.test(base) ? "a" : "i"); // 452
    if (light && /[iu]$/.test(nara)) nara = nara.slice(0, -1) + (nara.endsWith("i") ? "ī" : "ū"); // 453
    return { type: "caṅ (Sūtras 434, 450–454)", cells: thematic(nara + s + "a", pada, [434, 449, 450, ...ab.sut, 451, 452, 453]) };
  }
  // aṅ: ḷ-it, puṣ-ādi, dyut-ādi in parapada (Sūtras 435, 340)
  if (pada === "para" && (markers.includes("ḷ") || /puṣ-ādi|dyut-ādi/.test(k))) {
    const s = root === "pat" ? "papt" : root;
    return { type: "aṅ (Sūtra 435)", cells: thematic(s + "a", pada, [435]) };
  }
  if (pada === "para" && root === "dṛś") {
    const an = thematic("darśa", pada, [340, 428]);
    const si = lunForms("drāś", 1, pada, "aniṭ", "", [], undefined).cells;
    return { type: "aṅ (Sūtras 340, 428) or si with am (Sūtra 441)", cells: an.map((r, i) => r.map((c, j) => ({ forms: [...c.forms, ...si[i][j].forms], sutras: [...c.sutras, 441] }))) };
  }
  // sak: i/u/ṛ before ś, ṣ, s, h, aniṭ (Sūtra 407)
  if (it === "aniṭ" && /[iuṛ][śṣsh]$/.test(root) && root !== "dṛś") {
    const b = root.replace(/[śṣ]$/, "k").replace(/h$/, "k");
    const t = thematic(b + "ṣa", pada, [407, 108]);
    // ātmapada: the a of sak is dropped before a vowel (Sūtra 408)
    if (pada === "ātma") t.forEach((r) => r.forEach((c) => (c.forms = c.forms.map((f) => f.replace(/kṣetām$/, "kṣātām").replace(/kṣethām$/, "kṣāthām").replace(/kṣe$/, "kṣi")))));
    return { type: "sak (Sūtras 407, 408)", cells: t };
  }
  const l = lt(root);
  const last = l[l.length - 1];
  if (it === "seṭ" || it === "veṭ") {
    // iṭ + si (Sūtras 307, 316, 334, 335)
    const v = lastV(l);
    let st = gunaStem(root).s;
    const sut = [266, 306, 307, 316, 108];
    if (isV(last) && pada === "para") (st = l.slice(0, -1).join("") + (VRDDHI[last] ?? last)), sut.push(380);
    const forms = [st];
    if (pada === "para" && l[v] === "a" && v === l.length - 2 && !/[hmy]$/.test(root)) forms.push([...l.slice(0, v), "ā", last].join("")), sut.push(357);
    if (root === "vad" || root === "vraj") forms.splice(0, forms.length, [...l.slice(0, v), "ā", last].join("")), sut.push(378);
    const fix = (x: string) => x.replace(/ai$/, "āy").replace(/au$/, "āv").replace(/e$/, "ay").replace(/o$/, "av");
    const P = [["īt", "iṣṭām", "iṣuḥ"], ["īḥ", "iṣṭam", "iṣṭa"], ["iṣam", "iṣva", "iṣma"]];
    const A = [["iṣṭa", "iṣātām", "iṣata"], ["iṣṭhāḥ", "iṣāthām", "idhvam/iḍhvam"], ["iṣi", "iṣvahi", "iṣmahi"]];
    return { type: "iṭ + si (Sūtras 307, 316, 334, 335)", cells: grid((p, n) => cell((pada === "para" ? P : A)[p][n].split("/").flatMap((e) => forms.map((f) => a(fix(f)) + e)), [...sut, ...(p === 0 && n === 0 && pada === "para" ? [334, 335] : [])])) };
  }
  // aniṭ si (Sūtras 307, 352, 353, 380)
  const vr = isV(last) ? l.slice(0, -1).join("") + (VRDDHI[last] ?? last) : (() => {
    const v = lastV(l);
    return [...l.slice(0, v), VRDDHI[l[v]] ?? l[v], ...l.slice(v + 1)].join("");
  })();
  // ātmapada: ṛ-final and consonant-final with i/u/ṛ before it are kapila, no govinda (Sūtra 355)
  const st = pada === "para" ? vr : isV(last) && !/ṛ$/.test(root) ? gunaStem(root).s : root;
  const shortEnd = pada === "ātma" && /ṛ$/.test(root);
  const join = (s: string, e: string) => {
    if (isV(lt(s).slice(-1)[0]) || /r$/.test(s)) return /[aā]$/.test(s) ? s + "s" + e : s + "ṣ" + e.replace(/^th/, "ṭh").replace(/^t/, "ṭ");
    const c = lt(s).slice(-1)[0];
    const b = s.slice(0, -c.length);
    const kṣ = ["k", "kh", "g", "gh", "c", "j", "ś", "ṣ", "h"].includes(c);
    const ts = ["t", "th", "d", "dh"].includes(c);
    const ps = ["p", "ph", "b", "bh"].includes(c);
    const sx = kṣ ? "kṣ" : ts ? "ts" : ps ? "ps" : c === "m" || c === "n" ? "ṁs" : "s";
    if (/^t/.test(e)) {
      // s dropped between consonants (Sūtra 353); ś/ṣ + t → ṣṭ
      const st0 = ["ś", "ṣ"].includes(c) ? "ṣ" : kṣ ? "k" : ts ? "t" : ps ? "p" : c;
      return b + st0 + (st0 === "ṣ" ? e.replace(/^th/, "ṭh").replace(/^t/, "ṭ") : e);
    }
    return b + sx + e;
  };
  const P = [["īt", "tām", "uḥ"], ["īḥ", "tam", "ta"], ["am", "va", "ma"]];
  const A = [["ta", "ātām", "ata"], ["thāḥ", "āthām", "dhvam"], ["i", "vahi", "mahi"]];
  return {
    type: "si (Sūtras 307, 352, 380)",
    cells: grid((p, n) => {
      const e = (pada === "para" ? P : A)[p][n];
      const vowelEnd = isV(lt(st).slice(-1)[0]);
      const sut0: number[] = [];
      let f: string;
      const c0 = lt(st).slice(-1)[0];
      if (e === "dhvam" && !vowelEnd) {
        const v0: Record<string, string> = { k: "g", c: "g", j: "g", g: "g", gh: "g", t: "d", d: "d", dh: "d", th: "d", p: "b", b: "b", bh: "b", ś: "ḍ", ṣ: "ḍ", h: "g" };
        return cell([a(st.slice(0, -c0.length) + (v0[c0] ?? c0) + (["ś", "ṣ"].includes(c0) ? "ḍhvam" : "dhvam"))], [266, 306, 307, 353, 61]);
      }
      if (/^(t|th)/.test(e) && ["gh", "dh", "bh"].includes(c0)) return cell([a(st.slice(0, -2) + ({ gh: "g", dh: "d", bh: "b" } as Record<string, string>)[c0] + "dh" + e.replace(/^th?/, ""))], [266, 306, 307, 353, 354]);
      if (/^[īu]/.test(e) || /^(am|ātām|ata|āthām|i)$/.test(e) || /^[vm]/.test(e)) f = join(st, e.replace(/^ī/, "ī"));
      else if (shortEnd && /^(t|th)/.test(e)) (f = st + e), sut0.push(353);
      else if (vowelEnd && e === "dhvam") f = st + (/[aā]$/.test(st) ? "dhvam" : "ḍhvam");
      else if (vowelEnd) f = st + (/[aā]$/.test(st) ? "s" : "ṣ") + e.replace(/^t/, /[aā]$/.test(st) ? "t" : "ṭ");
      else f = join(st, e);
      return cell([a(f)], [266, 306, 307, pada === "para" ? (isV(last) ? 380 : 352) : 355, ...sut0, ...(/^(t|th)/.test(e) && !vowelEnd ? [353] : []), 108]);
    }),
  };
}

// ---------------------------------------------------------------- kāmapāla (āśīr-liṅ)
const ASIR_P = [["yāt", "yāstām", "yāsuḥ"], ["yāḥ", "yāstam", "yāsta"], ["yāsam", "yāsva", "yāsma"]];
const ASIR_A = [["sīṣṭa", "sīyāstām", "sīran"], ["sīṣṭhāḥ", "sīyāsthām", "sīdhvam"], ["sīya", "sīvahi", "sīmahi"]];
const DAMODARA_ETC = new Set(["dā", "dhā", "mā", "sthā", "gā", "pā", "hā", "so"]); // Sūtras 309, 417, 418

export function asirForms(root: string, gana: number, pada: "para" | "ātma", it: string, stem10?: string): Cell[][] {
  const l = lt(root);
  const last = l[l.length - 1];
  if (pada === "para") {
    let s = gana === 10 && stem10 ? stem10.replace(/aya$/, "") : root;
    const sut = [268, 331];
    if (gana === 10) sut.push(449);
    else if (DAMODARA_ETC.has(root)) (s = root.slice(0, -1) + "e"), sut.push(418);
    else if (/[iu]$/.test(root)) (s = root.slice(0, -1) + (root.endsWith("i") ? "ī" : "ū")), sut.push(390);
    else if (/ṛ$/.test(root)) {
      if (l.length > 2 && !isV(l[l.length - 3])) (s = root.slice(0, -1) + "ar"), sut.push(422);
      else (s = root.slice(0, -1) + "ri"), sut.push(426);
    }
    return grid((p, n) => cell([s + ASIR_P[p][n]], sut));
  }
  // ātmapada: govinda (except kapila, Sūtra 355), iṭ for seṭ (316)
  const g = gunaStem(root);
  const seT = it === "seṭ" || it === "veṭ" || gana === 10;
  const base = gana === 10 && stem10 ? stem10.replace(/a$/, "") : g.s.replace(/e$/, "ay").replace(/o$/, "av");
  return grid((p, n) => {
    const e = ASIR_A[p][n];
    if (seT) return cell([`${base}i${e.replace(/^s/, "ṣ")}`], [268, ...g.sut, 316, 108]);
    const st = isV(last) ? g.s : root;
    const c = lt(st).slice(-1)[0];
    const b = st.slice(0, -c.length);
    const cl = isV(c) ? st + (/[aā]$/.test(st) ? "s" : "ṣ") : ["k", "kh", "g", "gh", "c", "j", "ś", "ṣ", "h"].includes(c) ? b + "kṣ" : ["t", "th", "d", "dh"].includes(c) ? b + "ts" : ["p", "ph", "b", "bh"].includes(c) ? b + "ps" : b + c + "s";
    return cell([cl + e.slice(1)], [268, 355, 108]);
  });
}
