import terms from "@/lib/data/static/terms.json";

// "HNV terms" in the dictionaries: Pāṇini's grammatical terms in an entry are
// shown as Śrīla Jīva Gosvāmī's (HNV Vol. 1, Appendix 3), the original kept in
// a tooltip. Every dictionary writes the terms its own way, so words are
// compared after normalising:
//   · hyphens ignored            tat-puruṣa = tatpuruṣa (MW splits compounds)
//   · ṃ / ṁ / class nasals equal  dvaṃdva = dvandva, saṃprasāraṇa = saṁprasāraṇa
//   · case ignored                Bahuvrīhi (Apte), bahuvrīhi (MW)
//   · decomposed diacritics (NFD) normalised
//   · case endings kept           बहुव्रीहिः, परस्मैपदी, liṭi, tatpuruṣaḥ
//   · abbreviations               Bahuvr., Tatp., Karmadh., Avyayībh., "cl. 1 P." / "Ā."
// Terms that are also ordinary words (guṇa "quality", vṛddhi "growth", āgama
// "scripture" …) are replaced only where the dictionary capitalises them as a
// grammatical term (MW: "Guṇa", "Vṛddhi"), never in Devanagari text.

const ORDINARY = new Set(
  "pada varga varṇa sat bha nadī latā vidhi guṇa vṛddhi vṛddha ādeśa āgama lopa abhyāsa saṁyoga hrasva dīrgha laghu guru svara visarga niṣṭhā kṛtya upadhā ka ki ci as kti".split(" ")
);

export type TermEntry = { hnv: string; panini: string; ordinary?: boolean; deva?: string };
export type TermMap = Map<string, TermEntry>;

const NASAL: Record<string, string> = { k: "ṅ", g: "ṅ", c: "ñ", j: "ñ", ṭ: "ṇ", ḍ: "ṇ", t: "n", d: "n", n: "n", p: "m", b: "m", m: "m" };

/** The comparison key of a Latin-script word. */
export function normLatin(w: string): string {
  return w
    .normalize("NFC")
    .toLowerCase()
    .replace(/-/g, "")
    .replace(/ṃ/g, "ṁ")
    .replace(/ṁ(?=([kgcjṭḍtdpbnm]))/g, (_m, c: string) => NASAL[c] ?? "ṁ")
    .replace(/[ṅñṇnm](?=[kgcjṭḍtdpb])/g, (x: string, i: number, s: string) => NASAL[s[i + 1]] ?? x);
}
/** The comparison key of a Devanagari word (anusvāra before a stop = the class nasal). */
function normDeva(w: string): string {
  const cls: Record<string, string> = {};
  "कखगघ:ङ्|चछजझ:ञ्|टठडढ:ण्|तथदध:न्|पफबभ:म्".split("|").forEach((g) => {
    const [cs, n] = g.split(":");
    for (const c of cs) cls[c] = n;
  });
  return w.replace(/-/g, "").replace(/ं(?=([क-न]|[प-भ]))/g, (_m, c: string) => cls[c] ?? "ं");
}

export function buildTermMap(): TermMap {
  const m: TermMap = new Map();
  const order = (x: string) => (/Tenses/.test(x) ? 0 : /Compounds/.test(x) ? 1 : /Kṛt/.test(x) ? 2 : 3);
  const list = [...(terms as { h: string; p: string; s: string }[])].sort((a, b) => order(a.s) - order(b.s));
  for (const t of list) {
    const hnv = t.h.replace(/-\s+/g, "-").replace(/^\([^)]*\)\s*/, "").trim();
    if (!t.p || /no equivalent/i.test(t.p)) continue;
    for (const v0 of t.p.split(/[,;]|\bor\b/)) {
      const v = v0.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
      if (!v || v.length < 2 || /\s/.test(v)) continue;
      const k = normLatin(v);
      if (!m.has(k) || (k === "ac" && /Basic/.test(t.s))) m.set(k, { hnv, panini: v, ordinary: ORDINARY.has(v) });
    }
  }
  // the pada names as the dictionaries write them
  m.set(normLatin("parasmaipada"), { hnv: "parapada", panini: "parasmaipada" });
  m.set(normLatin("ātmanepada"), { hnv: "ātmapada", panini: "ātmanepada" });
  m.set(normLatin("parasmai"), { hnv: "para", panini: "parasmai" });
  m.set(normLatin("ātmane"), { hnv: "ātma", panini: "ātmane" });
  // abbreviations (MW, Apte)
  for (const [a, full] of [["bahuvr", "bahuvrīhi"], ["tatp", "tatpuruṣa"], ["tatpur", "tatpuruṣa"], ["karmadh", "karmadhāraya"], ["avyayībh", "avyayībhāva"], ["dvig", "dvigu"]] as const) {
    const e = m.get(normLatin(full));
    if (e) m.set(`${a}.`, { hnv: e.hnv.replace(/-/g, "").slice(0, Math.max(4, a.length)) + ".", panini: `${a}. (${full})` });
  }
  return m;
}

/** Adds the Devanagari spelling of every term (the library loads only when needed). */
export async function addDevanagari(m: TermMap): Promise<TermMap> {
  const { default: S } = await import("@indic-transliteration/sanscript");
  const out: TermMap = new Map(m);
  const dv = (s: string) => S.t(s.replace(/ṁ/g, "ṃ").replace(/-/g, ""), "iast", "devanagari");
  for (const [k, v] of m) {
    if (k.endsWith(".")) continue;
    const d = normDeva(dv(v.panini));
    if (d && !out.has(`d:${d}`)) out.set(`d:${d}`, { ...v, deva: dv(v.hnv) });
  }
  return out;
}

// endings that may follow a term (longest first); "+a" = the term's final a is replaced
const LATIN_END = ["ānām", "ebhyaḥ", "ayoḥ", "asya", "eṣu", "ena", "āya", "ābhyām", "āt", "aiḥ", "āḥ", "ān", "aḥ", "am", "au", "e", "ī", "inī", "iḥ", "iṁ", "iṃ", "im", "ayaḥ", "i", "ḥ", "ṁ", "ṃ", "m", "ī"].sort((a, b) => b.length - a.length);
const DEVA_END = ["ानाम्", "ेभ्यः", "योः", "स्य", "ेषु", "ेन", "ाय", "ात्", "ैः", "ाः", "ान्", "ानां", "ः", "म्", "ं", "े", "ौ", "ी", "िनी", "िः", "ि", "यः", "ये", "०", "॰", "ीं", "ीः"].sort((a, b) => b.length - a.length);

const LATIN_WORD = /[A-Za-zÀ-ɏḀ-ỿ̀-ͯ]+(?:-[A-Za-zÀ-ɏḀ-ỿ̀-ͯ]+)*\.?/g;
const DEVA_WORD = /[ऀ-ॣ०-ॿ]+/g;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The HNV spelling of one word, or null. */
function replaceWord(w: string, m: TermMap, prev: string): string | null {
  if (/[ऀ-ॿ]/.test(w)) {
    const tryD = (stem: string) => {
      const e = m.get(`d:${normDeva(stem)}`);
      return e && !e.ordinary && e.deva ? e : null;
    };
    let e = tryD(w);
    if (e) return e.deva!;
    for (const end of DEVA_END) {
      if (w.length > end.length + 1 && w.endsWith(end)) {
        e = tryD(w.slice(0, -end.length));
        if (e) return (e.hnv === "nāma" ? "नाम" : e.deva!) + (e.hnv === "nāma" && end === "म्" ? "" : end);
      }
    }
    return null;
  }
  const dot = w.endsWith(".");
  const body = dot ? w.slice(0, -1) : w;
  const isCap = /^\p{Lu}/u.test(body);
  // single-letter pada marks: "cl. 1 P." / "1 Ā." (MW, Apte)
  if (dot && /^(P|Ā|A|U)$/.test(body) && /(\d|cl\.)\s*$/.test(prev)) return body === "P" ? "Parap." : body === "U" ? "Ubh." : "Ātmap.";
  if (dot) {
    const a = m.get(`${normLatin(body)}.`);
    if (a) return (isCap ? cap(a.hnv) : a.hnv);
  }
  const ok = (e: TermEntry | undefined) => (e && (!e.ordinary || isCap) ? e : null);
  const n = normLatin(body);
  let e = ok(m.get(n));
  let out: string | null = e ? e.hnv : null;
  if (!out && n.length > 3)
    for (const end of LATIN_END) {
      if (!n.endsWith(end) || n.length <= end.length + 1) continue;
      const stem = n.slice(0, -end.length);
      e = ok(m.get(stem)) ?? ok(m.get(stem + "a"));
      if (e) {
        const viaA = !m.get(stem) || m.get(stem) !== e;
        const base = e.hnv === "nāma" ? "nām" : e.hnv;
        out =
          viaA && base.endsWith("a") ? base.slice(0, -1) + end
          : base.endsWith("a") && /^[iī]/.test(end) ? base.slice(0, -1) + "e" + end.slice(1)
          : base.endsWith("a") ? null : base + end;
        if (e.hnv === "nāma") out = "nām" + (viaA ? end : "a" + end);
        if (!out) continue;
        break;
      }
    }
  if (!out) return null;
  return (isCap ? cap(out) : out) + (dot ? "." : "");
}

/** The entry's HTML with the terms replaced (text only; tags and links are left alone). */
export function toHnvTerms(html: string, m: TermMap): string {
  if (!m.size || typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild!;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    if (node.parentElement?.closest("abbr.hnv-term, a[data-word]")) continue;
    const t = node.nodeValue ?? "";
    const hits: { i: number; len: number; to: string; from: string }[] = [];
    for (const re of [LATIN_WORD, DEVA_WORD]) {
      re.lastIndex = 0;
      for (const mm of t.matchAll(re)) {
        const i = mm.index ?? 0;
        let w = mm[0];
        // a sentence-final period belongs to the text, unless the word is an abbreviation
        let to = replaceWord(w, m, t.slice(Math.max(0, i - 6), i));
        if (!to && w.endsWith(".")) {
          w = w.slice(0, -1);
          to = replaceWord(w, m, t.slice(Math.max(0, i - 6), i));
        }
        if (to && to !== w) hits.push({ i, len: w.length, to, from: w });
      }
    }
    if (!hits.length) continue;
    hits.sort((a, b) => a.i - b.i);
    const frag = doc.createDocumentFragment();
    let last = 0;
    for (const h of hits) {
      if (h.i < last) continue;
      frag.append(t.slice(last, h.i));
      const ab = doc.createElement("abbr");
      ab.className = "hnv-term";
      ab.title = `Pāṇini: ${h.from}`;
      ab.textContent = h.to;
      frag.append(ab);
      last = h.i + h.len;
    }
    frag.append(t.slice(last));
    node.replaceWith(frag);
  }
  return root.innerHTML;
}
