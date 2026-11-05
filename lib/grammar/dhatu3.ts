// Present-system forms (acyuta, bhūteśvara, vidhātā, vidhi) of the gaṇas without
// the a-stem: adādi 2, juhotyādi 3, svādi 5, rudhādi 7, tanādi 8, kryādi 9.
// Madhyama Harināmāmṛta-vyākaraṇa, Ākhyāta (Sūtras 477–564).
import type { FormCell } from "@/lib/grammar/dhatu";
import { lt, isV } from "@/lib/grammar/dhatu2";

type Cell = FormCell;
type Pada = "para" | "ātma";
const GUNA: Record<string, string> = { i: "e", ī: "e", u: "o", ū: "o", ṛ: "ar", ṝ: "ar" };
const VRD: Record<string, string> = { u: "au", ū: "au" };

// endings: [ending, strong (pit)?]
type End = [string, boolean];
const P: Record<string, End[][]> = {
  lat: [[["ti", true], ["taḥ", false], ["anti", false]], [["si", true], ["thaḥ", false], ["tha", false]], [["mi", true], ["vaḥ", false], ["maḥ", false]]],
  lan: [[["t", true], ["tām", false], ["an", false]], [["s", true], ["tam", false], ["ta", false]], [["am", true], ["va", false], ["ma", false]]],
  lot: [[["tu", true], ["tām", false], ["antu", false]], [["hi", false], ["tam", false], ["ta", false]], [["āni", true], ["āva", true], ["āma", true]]],
  lin: [[["yāt", false], ["yātām", false], ["yuḥ", false]], [["yāḥ", false], ["yātam", false], ["yāta", false]], [["yām", false], ["yāva", false], ["yāma", false]]],
};
const A: Record<string, End[][]> = {
  lat: [[["te", false], ["āte", false], ["ate", false]], [["se", false], ["āthe", false], ["dhve", false]], [["e", false], ["vahe", false], ["mahe", false]]],
  lan: [[["ta", false], ["ātām", false], ["ata", false]], [["thāḥ", false], ["āthām", false], ["dhvam", false]], [["i", false], ["vahi", false], ["mahi", false]]],
  lot: [[["tām", false], ["ātām", false], ["atām", false]], [["sva", false], ["āthām", false], ["dhvam", false]], [["ai", true], ["āvahai", true], ["āmahai", true]]],
  lin: [[["īta", false], ["īyātām", false], ["īran", false]], [["īthāḥ", false], ["īyāthām", false], ["īdhvam", false]], [["īya", false], ["īvahi", false], ["īmahi", false]]],
};
const TENSE_SUTRA: Record<string, number> = { lat: 262, lan: 265, lot: 264, lin: 263 };

const VOICED: Record<string, string> = { k: "g", c: "g", j: "g", ś: "ḍ", ṣ: "ḍ", h: "g", t: "d", d: "d", dh: "d", th: "d", p: "b", b: "b", bh: "b", gh: "g" };

/** Joins a stem ending in a consonant to an ending (Sūtras 61, 63, 108, 189, 353, 354, 411). */
function join(stem: string, end: string, root: string): { f: string; s: number[] } {
  const l = lt(stem);
  const c = l[l.length - 1];
  const first = end[0];
  if (!c || isV(c) || isV(first) || /^[yvmn]/.test(end) || !end) return { f: stem + end, s: [] };
  const b = l.slice(0, -1).join("");
  const sut: number[] = [];
  const harighosaH = ["gh", "dh", "bh", "h"].includes(c);
  // bhaṣ: duh → dhokṣi, budh → bhot- (Sūtra 189) before s and dh
  const bhas = (x: string) => (/^[gdb]/.test(x) && harighosaH && /^(s|dhv)/.test(end) ? (sut.push(189), ({ g: "gh", d: "dh", b: "bh" } as Record<string, string>)[x[0]] + x.slice(1)) : x);
  if (/^(t|th)/.test(end)) {
    if (["ś", "ṣ"].includes(c) || (c === "j" && /^(yaj|sṛj|mṛj|rāj|bhrāj|bhrasj|vraśc)/.test(root))) return { f: b + "ṣ" + end.replace(/^th/, "ṭh").replace(/^t/, "ṭ"), s: [205] };
    if (c === "h" && !/^(duh|dih|druh|snih|nah)/.test(root)) {
      // ḍh + t → ḍh, the ḍh before it dropped and the vowel lengthened (Sūtras 211, 354, 411)
      const lb = lt(b);
      const v = lb[lb.length - 1];
      const long: Record<string, string> = { i: "ī", u: "ū", a: "ā" };
      return { f: lb.slice(0, -1).join("") + (long[v] ?? v) + "ḍh" + end.replace(/^th?/, ""), s: [211, 354, 411] };
    }
    if (harighosaH) return { f: b + (VOICED[c] ?? c) + "dh" + end.replace(/^th?/, ""), s: [354] };
    if (["k", "c", "j", "g"].includes(c)) return { f: b + "k" + end, s: [63] };
    if (["d", "t"].includes(c)) return { f: b + "t" + end, s: [63] };
    if (["p", "b"].includes(c)) return { f: b + "p" + end, s: [63] };
    return { f: stem + end, s: [] };
  }
  if (/^s/.test(end)) {
    if (["k", "c", "j", "ś", "ṣ", "h", "g", "gh"].includes(c)) return { f: bhas(b) + "kṣ" + end.slice(1), s: [...sut, 63, 108] };
    if (["t", "d", "dh", "th"].includes(c)) return { f: bhas(b) + "ts" + end.slice(1), s: [...sut, 63] };
    if (["p", "b", "bh"].includes(c)) return { f: bhas(b) + "ps" + end.slice(1), s: [...sut, 63] };
    if (c === "s" && /^s/.test(end) && root === "as") return { f: b + end, s: [498] };
    return { f: stem + end, s: [] };
  }
  if (/^dh/.test(end)) {
    if (c === "h" && !/^(duh|dih|druh|snih|nah)/.test(root)) {
      const lb = lt(b);
      const v = lb[lb.length - 1];
      return { f: lb.slice(0, -1).join("") + (({ i: "ī", u: "ū", a: "ā" } as Record<string, string>)[v] ?? v) + "ḍh" + end.slice(2), s: [211, 411] };
    }
    if (c === "h") return { f: b + "g" + end, s: [211, 61] };
    if (["ś", "ṣ"].includes(c)) return { f: b + "ḍ" + end.replace(/^dh/, "ḍh"), s: [61] };
    if (c === "s") return { f: b + end, s: [319] };
    return { f: bhas(b) + (VOICED[c] ?? c) + end, s: [...sut, 61] };
  }
  return { f: stem + end, s: [] };
}

/** At the end of a word (laṅ 3rd/2nd sg after a consonant, Sūtra 482): s/t dropped, final consonant to its stop. */
function padanta(stem: string): string {
  const l = lt(stem);
  const c = l[l.length - 1];
  if (isV(c)) return stem;
  const b = l.slice(0, -1).join("");
  if (c === "h" && /^d/.test(b)) return "dh" + b.slice(1) + "k";
  const m: Record<string, string> = { c: "k", j: "k", ś: "ṭ", ṣ: "ṭ", h: "ṭ", d: "t", dh: "t", th: "t", bh: "p", b: "p", gh: "k", g: "k", s: "ḥ" };
  if (["n", "m"].includes(c) && l[l.length - 2] && !isV(l[l.length - 2])) return b; // saṁyogānta (176)
  return b + (m[c] ?? c);
}

const reduplicate = (root: string): string => {
  const l = lt(root);
  const v = l.findIndex((x) => isV(x));
  let c = l[0] && !isV(l[0]) ? l[0] : "";
  const un: Record<string, string> = { kh: "k", gh: "g", ch: "c", jh: "j", ṭh: "ṭ", ḍh: "ḍ", th: "t", dh: "d", ph: "p", bh: "b" };
  c = un[c] ?? c;
  c = ({ k: "c", g: "j", h: "j" } as Record<string, string>)[c] ?? c;
  let vow = l[v];
  vow = ({ ā: "a", ī: "i", ū: "u", ṛ: "i", ṝ: "i" } as Record<string, string>)[vow] ?? vow;
  if (/^(bhṛ|mā|hā)$/.test(root)) vow = "i"; // Sūtra 535
  return c + vow + root;
};

type Stems = { strong: string; weak: string; weakV: string; sut: number[]; pre?: string; abhyasta?: boolean };

/** The two present stems of a dhātu (strong before pit endings, weak before the rest; weakV before vowels). */
function stems(root: string, g: number): Stems | null {
  const l = lt(root);
  const last = l[l.length - 1];
  const gunaR = (r: string) => {
    const x = lt(r);
    const e = x[x.length - 1];
    if (isV(e) && GUNA[e]) return x.slice(0, -1).join("") + GUNA[e];
    const v = x.length - 2;
    if (v >= 0 && ["i", "u", "ṛ"].includes(x[v]) && !isV(x[v + 1])) return [...x.slice(0, v), GUNA[x[v]], x[v + 1]].join("");
    return r;
  };
  if (g === 2) {
    const S: Record<string, Stems> = {
      as: { strong: "as", weak: "s", weakV: "s", sut: [477, 497] },
      i: { strong: "e", weak: "i", weakV: "y", sut: [477, 289, 384] },
      han: { strong: "han", weak: "han", weakV: "ghn", sut: [477, 437, 487] },
      brū: { strong: "bravī", weak: "brū", weakV: "bruv", sut: [477, 516, 381] },
      śās: { strong: "śās", weak: "śiṣ", weakV: "śās", sut: [477, 509] },
      śī: { strong: "śe", weak: "śe", weakV: "śer", sut: [477, 513] },
      vid: { strong: "ved", weak: "vid", weakV: "vid", sut: [477, 333] },
      mṛj: { strong: "mārj", weak: "mṛj", weakV: "mārj", sut: [477, 502] },
      rud: { strong: "rodi", weak: "rudi", weakV: "rud", sut: [477, 504] },
      svap: { strong: "svapi", weak: "svapi", weakV: "svap", sut: [477, 504] },
      śvas: { strong: "śvasi", weak: "śvasi", weakV: "śvas", sut: [477, 504] },
      jakṣ: { strong: "jakṣi", weak: "jakṣi", weakV: "jakṣ", sut: [477, 504, 505], abhyasta: true },
    };
    if (S[root]) return S[root];
    if (/[uū]$/.test(root)) return { strong: root.slice(0, -1) + "au", weak: root, weakV: root.slice(0, -1) + "uv", sut: [477, 488] }; // stu → stauti
    if (/ā$/.test(root)) return { strong: root, weak: root, weakV: root, sut: [477] };
    return { strong: gunaR(root), weak: root, weakV: root, sut: [477, ...(gunaR(root) !== root ? [333] : [])] };
  }
  if (g === 3) {
    const R = reduplicate(root);
    const nar = R.slice(0, R.length - root.length);
    if (/^(dā|dhā)$/.test(root)) return { strong: R, weak: nar + (root === "dā" ? "d" : "dh"), weakV: nar + root[0] + (root === "dhā" ? "h" : ""), sut: [519, 524], abhyasta: true };
    if (/ā$/.test(root)) return { strong: R, weak: R.slice(0, -1) + "i", weakV: R.slice(0, -1), sut: [519, 523, 524], abhyasta: true };
    return { strong: gunaR(R), weak: R, weakV: R.replace(/[iī]$/, "y").replace(/[uū]$/, "v").replace(/ṛ$/, "r"), sut: [519, 289], abhyasta: true };
  }
  if (g === 5) {
    const sam = l.length > 1 && !isV(last); // root ends in a consonant: u stays uv before vowels
    return { strong: root + "no", weak: root + "nu", weakV: root + (sam ? "nuv" : "nv"), sut: [544, 430] };
  }
  if (g === 8) {
    if (root === "kṛ") return { strong: "karo", weak: "kuru", weakV: "kurv", sut: [553, 430, 557] };
    return { strong: root + "o", weak: root + "u", weakV: root + "v", sut: [553, 430] };
  }
  if (g === 9) {
    const SP: Record<string, string> = { grah: "gṛh", jñā: "jā", jyā: "ji", pū: "pu", lū: "lu", dhū: "dhu" };
    const r = SP[root] ?? root;
    const s = [561, ...(root === "grah" ? [473] : []), ...(root === "jñā" ? [542] : []), ...(/^(pū|lū|dhū)$/.test(root) ? [562] : [])];
    return { strong: r + "nā", weak: r + "nī", weakV: r + "n", sut: [...s, 523, 524] };
  }
  if (g === 7) {
    // śnam: na after the last vowel; weak n (Sūtras 551, 552, 497)
    const v = l.map((x, i) => (isV(x) ? i : -1)).filter((x) => x >= 0).pop()!;
    const pre = l.slice(0, v + 1).join("");
    const fin = l.slice(v + 1).join("").replace(/^n/, "");
    const nas = ({ k: "ṅ", g: "ṅ", c: "ñ", j: "ñ", ṭ: "ṇ", ḍ: "ṇ", t: "n", d: "n", dh: "n", p: "m", b: "m", bh: "m" } as Record<string, string>)[lt(fin)[0]] ?? "ṁ";
    return { strong: pre + "na" + fin, weak: pre + nas + fin, weakV: pre + nas + fin, sut: [551, 552, 497] };
  }
  return null;
}

const natva = (w: string) => w.replace(/([rṣṛṝ][aāiīuūṛeoyvhkgmpb]*?)n(?=[aāiīuūṛeo])/g, "$1ṇ");

/** acyuta, bhūteśvara, vidhātā, vidhi for gaṇas 2, 3, 5, 7, 8, 9. */
export function athematic(root: string, g: number, pada: Pada): { key: string; cells: Cell[][] }[] | null {
  const st = stems(root, g);
  if (!st) return null;
  const E = pada === "para" ? P : A;
  const out: { key: string; cells: Cell[][] }[] = [];
  for (const key of ["lat", "lan", "lot", "lin"]) {
    const cells = E[key].map((row, pi) =>
      row.map(([end0, pit], ni) => {
        const sut = [TENSE_SUTRA[key], pada === "para" ? 278 : 279, ...st.sut];
        let end = end0;
        // abhyasta: anti → ati, an → uḥ (Sūtras 506, 336)
        if (st.abhyasta && /^ant/.test(end)) (end = end.replace(/^an/, "a")), sut.push(506);
        if (st.abhyasta && key === "lan" && end === "an") (end = "uḥ"), sut.push(336);
        if (pada === "ātma" && /^a(te|ta|tām)$/.test(end) && !st.abhyasta) sut.push(317);
        let base = pit && pada === "para" ? st.strong : isV(end[0]) ? st.weakV : st.weak;
        if (key === "lin" && pada === "para" && g === 8 && root === "kṛ") base = "kur"; // 432
        if (g === 5 || g === 8) if (!pit && /^[vm]/.test(end) && !/[^aāiīuūṛeo]u$/.test(st.weak.slice(0, -1) + "u") && root !== "kṛ") sut.push(431);
        // hi: dhi after a consonant (478), dropped after u of the vikaraṇa (433), āna in kryādi after a consonant (563)
        if (end === "hi") {
          if ((g === 5 || g === 8) && !/[^aāiīuūṛeo]$/.test(root)) return { forms: [natva(st.weak)], sutras: [...sut, 433] };
          if (g === 9 && !isV(lt(root).slice(-1)[0])) return { forms: [natva((st.weakV.replace(/n$/, "") || root) + "āna")], sutras: [...sut, 563] };
          if (root === "as") return { forms: ["edhi"], sutras: [...sut, 500] };
          if (root === "han") return { forms: ["jahi"], sutras: [...sut, 483] };
          if (root === "śās") return { forms: ["śādhi"], sutras: [...sut, 510] };
          if (!isV(lt(base).slice(-1)[0])) end = "dhi";
          else if (g === 3 && root === "hu") end = "dhi";
          if (end === "dhi") sut.push(478);
        }
        if (root === "as" && pit && pada === "para" && /^[st]$/.test(end)) return { forms: [`ās${end === "t" ? "īt" : "īḥ"}`], sutras: [...sut, 334, 501] };
        if (root === "han" && /^(t|th|s|dh)/.test(end) && !pit) base = "ha";
        if (root === "brū" && pit && isV(end[0])) base = "brav";
        const aug0 = (x: string) => (key === "lan" ? "a" + x : x);
        if (root === "kṛ" && /^[vmy]/.test(end) && !pit) base = "kur";
        if (/^(dā|dhā)$/.test(root) && (end === "hi" || end === "dhi")) return { forms: [root === "dā" ? "dehi" : "dhehi"], sutras: [...sut, 528] };
        if (root === "dhā" && !pit && /^(t|th|s)/.test(end)) return { forms: [aug0("dhat" + end)], sutras: [...sut, 533, ...(key === "lan" ? [306] : [])] };
        if (root === "dhā" && !pit && /^dh/.test(end)) return { forms: [aug0("dhad" + end)], sutras: [...sut, 533, ...(key === "lan" ? [306] : [])] };
        // vowel endings after a vowel: e → ay, o → av, ā + a → ā (Sūtras 54, 55, 42)
        if (isV(end[0])) {
          if (/au$/.test(base)) (base = base.slice(0, -2) + "av"), sut.push(55);
          else if (/e$/.test(base)) (base = base.slice(0, -1) + "ay"), sut.push(54);
          else if (/o$/.test(base)) (base = base.slice(0, -1) + "av"), sut.push(55);
          else if (/ā$/.test(base) && /^[aā]/.test(end)) (end = end.slice(1)), sut.push(42);
        }
        // juhotyādi: govinda before us of the bhūteśvara (Sūtra 508)
        if (end === "uḥ" && /[iīuūṛ]$/.test(base)) (base = base.slice(0, -1) + ({ i: "ay", ī: "ay", u: "av", ū: "av", ṛ: "ar" } as Record<string, string>)[base.slice(-1)]), sut.push(508);
        let f: string;
        const augm = key === "lan";
        if (augm && /^[ts]$/.test(end) && !isV(lt(base).slice(-1)[0])) (f = padanta(base)), sut.push(482);
        else if (/^[ts]$/.test(end) && augm) f = base + (end === "s" ? "ḥ" : "t");
        else {
          const j = join(base, end, root);
          f = j.f;
          sut.push(...j.s);
        }
        if (root === "as" && /^s/.test(end) && pit) f = f.replace(/^ass/, "as");
        if (augm) {
          f = isV(lt(root)[0]) && !isV(f[0]) ? "ā" + f : isV(f[0]) ? ({ a: "ā", ā: "ā", i: "ai", u: "au", e: "ai", o: "au", ṛ: "ār" } as Record<string, string>)[lt(f)[0]] + lt(f).slice(1).join("") : "a" + f;
          sut.push(306);
        }
        f = f.replace(/([iīuūṛeo]|k|r)s(?=[aāiīuūeot])/g, "$1ṣ");
        f = natva(f).replace(/n(?=[sśṣh])/g, "ṁ").replace(/ñ(?=k|g)/g, "ṅ").replace(/ṁ(?=[kg])/g, "ṅ");
        const forms = [f];
        if (sut.includes(431)) forms.push(f.replace(/nu(?=[vm])/, "n"));
        const short = f.replace(/n(t)(t|th)/, "n$2").replace(/nd(dh)/, "n$1");
        if (short !== f) (forms.push(short), sut.push(78));
        return { forms, sutras: sut };
      })
    );
    out.push({ key, cells });
  }
  return out;
}
