import terms from "@/lib/data/static/terms.json";

// "HNV terms" in the dictionaries: Pāṇini's grammatical terms in an entry are
// shown as Śrīla Jīva Gosvāmī's (HNV Vol. 1, Appendix 3), the original kept
// in a tooltip. Whole words only, in IAST (and Devanagari, added at runtime);
// terms that are also ordinary words are left alone.

const ORDINARY = new Set(["pada", "varga", "varṇa", "sat", "bha", "kit", "pit", "ṅit", "ṇit", "ghi", "vidhi", "kṛtya", "niṣṭhā", "abhyāsa", "upadhā", "nadī", "latā", "ādeśa", "āgama", "lopa", "pluta", "hrasva", "dīrgha", "laghu", "guru", "svara", "anusvāra", "visarga"]);

export type TermMap = Map<string, { hnv: string; panini: string }>;

export function buildTermMap(): TermMap {
  const m: TermMap = new Map();
  const order = (x: string) => (/Tenses/.test(x) ? 0 : /Compounds/.test(x) ? 1 : /Kṛt/.test(x) ? 2 : 3);
  const list = [...(terms as { h: string; p: string; s: string }[])].sort((a, b) => order(a.s) - order(b.s));
  for (const t of list) {
    const hnv = t.h.replace(/-\s+/g, "-").trim();
    if (!t.p || /no equivalent/i.test(t.p)) continue;
    for (const v0 of t.p.split(/[,;]|\bor\b/)) {
      const v = v0.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
      if (!v || v.length < 3 || ORDINARY.has(v) || /\s/.test(v)) continue;
      if (!m.has(v)) m.set(v, { hnv, panini: v });
      if (v.includes("-") && !m.has(v.replace(/-/g, ""))) m.set(v.replace(/-/g, ""), { hnv, panini: v.replace(/-/g, "") });
      const cap = v.charAt(0).toUpperCase() + v.slice(1);
      if (!m.has(cap)) m.set(cap, { hnv: hnv.charAt(0).toUpperCase() + hnv.slice(1), panini: cap });
    }
  }
  // the pada names are written out in English dictionaries
  for (const [p, h] of [["Parasmaipada", "Parapada"], ["parasmaipada", "parapada"], ["Ātmanepada", "Ātmapada"], ["ātmanepada", "ātmapada"]] as const) m.set(p, { hnv: h, panini: p });
  return m;
}

/** Adds the Devanagari spelling of every term (the library loads only when needed). */
export async function addDevanagari(m: TermMap): Promise<TermMap> {
  const { default: S } = await import("@indic-transliteration/sanscript");
  const out: TermMap = new Map(m);
  for (const [k, v] of m) {
    if (/[A-Z]/.test(k.charAt(0))) continue;
    const d = S.t(k.replace(/ṁ/g, "ṃ"), "iast", "devanagari");
    const hd = S.t(v.hnv.replace(/ṁ/g, "ṃ"), "iast", "devanagari");
    if (d && !out.has(d)) out.set(d, { hnv: hd, panini: d });
  }
  return out;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The entry's HTML with the terms replaced (text only; tags and links are left alone). */
export function toHnvTerms(html: string, m: TermMap): string {
  if (!m.size || typeof DOMParser === "undefined") return html;
  const keys = [...m.keys()].sort((a, b) => b.length - a.length).map(esc);
  const re = new RegExp(`(?<![\\p{L}\\p{M}])(${keys.join("|")})(?![\\p{L}\\p{M}])`, "gu");
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild!;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const n of nodes) {
    const t = n.nodeValue ?? "";
    if (!re.test(t)) continue;
    re.lastIndex = 0;
    const frag = doc.createDocumentFragment();
    let last = 0;
    for (const mm of t.matchAll(re)) {
      const i = mm.index ?? 0;
      frag.append(t.slice(last, i));
      const e = m.get(mm[1])!;
      const ab = doc.createElement("abbr");
      ab.className = "hnv-term";
      ab.title = `Pāṇini: ${e.panini}`;
      ab.textContent = e.hnv;
      frag.append(ab);
      last = i + mm[1].length;
    }
    frag.append(t.slice(last));
    n.replaceWith(frag);
  }
  return root.innerHTML;
}
