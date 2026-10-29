import { blocks, cleanInline, toText, type Block } from "@/lib/scriptures/sb/html";

// The ācāryas' Sanskrit commentaries (Gauḍīya Grantha Mandira e-books
// "four / five / ten commentaries – bhagavata purana – canto N"):
//   "|| 1.5.1 ||"                        a verse begins (its number in that edition)
//   verse lines, "sūta uvāca—"           the verse itself
//   "śrīdhara-svāmī (bhāvārtha-dīpikā) :" a commentary begins (alone, or at the
//                                        start of its first paragraph)
//   "———"                                end of a commentary
//   "na vyākhyātam."                     not commented on

export type CommentaryText = { author: string; work: string; html: string };
export type CommentaryVerse = { canto: number; chapter: number; from: number; to: number; ref: string; lines: string[]; commentaries: CommentaryText[]; /** the edition printed no number: read from the verse's last line */ noRef?: true };

const REF = /^\|\|\s*(\d+)\.(\d+)\.(\d+)(?:\s*[-–]\s*(\d+))?\s*\|\|$/;
/** Bhagavad-gītā editions: "(3.1)", "(1.4-6)" — read as canto 1 */
const REF_BG = /^\(\s*(\d+)\s*\.\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*\)?$/;
/** "Verses 41-42" (the chapter is the current one) */
const REF_VERSES = /^Verses?\s+(\d+)(?:\s*[-–]\s*(\d+))?$/i;
const HEAD = /^\s*([a-zāīūṛṝḷḹṅñṭḍṇśṣṁḥ’'\s-]{3,60}?)\s*\(([^)]{2,80})\)\s*:\s*/i;
/** Short form without the work: "śrīdharaḥ :", "madhvaḥ :" */
const HEAD2 = /^\s*(śrīdhara(?:-svāmī|ḥ)?|madhvaḥ|madhvācāryaḥ|jīvaḥ|jīva-gosvāmī|viśvanāthaḥ|viśvanātha-cakravartī|baladevaḥ|baladeva|viśvanātha|madhusūdanaḥ|madhusūdana(?:-sarasvatī)?|rāmānujaḥ|rāmānuja|vaṁśīdharaḥ|sanātanaḥ|sanātana-gosvāmī)\s*:\s*/i;
const WORK_OF: Record<string, string> = {
  sridhara: "bhāvārtha-dīpikā", madhusudana: "gūḍhārtha-dīpikā", ramanuja: "gītā-bhāṣya", madhva: "bhāgavata-tātparyam", jiva: "krama-sandarbhaḥ", visvanatha: "sārārtha-darśinī",
  baladeva: "vaiṣṇavānandinī", vamsidhara: "bhāvārtha-dīpikā-prakāśaḥ", sanatana: "bṛhad-vaiṣṇava-toṣaṇī",
};

/** "śrīdhara-svāmī" → "Śrīdhara Svāmī", "bhāvārtha-dīpikā" → "Bhāvārtha-dīpikā" */
const titleCase = (s: string, joinWords: boolean) => {
  const t = s.trim().replace(/\s+/g, " ");
  if (joinWords) return t.split(/[-\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** A paragraph's HTML without its "author (work) :" header; a bold run cut in two is reopened. */
function afterHeader(html: string): string {
  const m = /\)\s*:\s*/.exec(html) ?? /^(?:<b>)?\s*[^:<]{3,40}\s*:\s*/.exec(html);
  if (!m) return html;
  const before = html.slice(0, m.index);
  let after = html.slice(m.index + m[0].length);
  const open = (before.match(/<b>/g)?.length ?? 0) - (before.match(/<\/b>/g)?.length ?? 0);
  if (open > 0) after = `<b>${after}`;
  return after.replace(/^<b>\s*<\/b>/, "").replace(/<b>\s*<\/b>/g, " ").trim();
}

const NAMES = HEAD2.source.slice(HEAD2.source.indexOf("("), HEAD2.source.lastIndexOf(")") + 1);
const SPLIT = new RegExp(`\\|\\|(?:\\s*\\d+\\s*\\|\\|)?(?=\\s*(?:<[^>]+>\\s*)*${NAMES}(?:\\s*<[^>]+>)*\\s*:)`, "gi");
/** A paragraph holding the end of a verse (or of one commentary) and the next commentary's header is cut in two there. */
function splitAtHeaders(b: Block): Block[] {
  const cuts = [...b.html.matchAll(SPLIT)].map((m) => (m.index ?? 0) + m[0].length);
  if (!cuts.length) return [b];
  const out: Block[] = [];
  let at = 0;
  for (const c of [...cuts, b.html.length]) {
    const html = b.html.slice(at, c);
    at = c;
    const text = toText(html);
    if (text) out.push({ ...b, html, text });
  }
  return out;
}

/** Notes left in by the editor's word processor: "Commented [3]: other sources say …" */
const stripEditorNotes = (x: string) =>
  x.normalize("NFC").replace(/<span\b[^>]*>\s*Commented \[\d+\]:\s*<\/span>\s*(?:<span\b[^>]*>[^<]*<\/span>)?/g, " ").replace(/Commented \[\d+\]:\s*/g, "");

/** A line of a verse: short, and ending in "|" or "||12||" (no "|" inside) */
const VERSE_LINE = /^[^|]{8,90}(?:\|\|?\s*(?:\d+(?:\s*[-–]\s*\d+)?\s*\|\|)?)?$/;
const VERSE_END = /\|\|\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*\|\|\s*$/;

export function parseCommentaries(files: { path: string; xhtml: string }[]): CommentaryVerse[] {
  const out: CommentaryVerse[] = [];
  let cur: CommentaryVerse | null = null;
  let com: CommentaryText | null = null;
  let paras: { html: string; text: string }[] = [];
  let inVerse = false;
  const close = () => {
    if (com) com.html = paras.map((p) => `<p>${p.html}</p>`).join("");
    const plain = com?.html.replace(/<[^>]+>/g, "").trim() ?? "";
    if (cur && com && plain && !/^na vyākhyātam\.?$/i.test(plain)) cur.commentaries.push(com);
    com = null;
    paras = [];
  };
  const verseLines = (t: string) => t.split("\n").map((x) => x.replace(/\|\|\s*\d+(?:\s*[-–]\s*\d+)?\s*\|\|\s*$/, "").replace(/[|।॥]+\s*$/, "").trim()).filter(Boolean);
  for (const f of files) {
    for (const blk of blocks(stripEditorNotes(f.xhtml))) for (const b of splitAtHeaders(blk)) {
      const t = b.text.trim();
      const html = b.html;
      const rb = REF_BG.exec(t);
      const rv: RegExpExecArray | null = cur ? REF_VERSES.exec(t) : null;
      const r: (string | undefined)[] | null = REF.exec(t) ?? (rb ? [rb[0], "1", rb[1], rb[2], rb[3]] : rv && cur ? [rv[0], String(cur.canto), String(cur.chapter), rv[1], rv[2]] : null);
      if (r) {
        close();
        const from: number = Number(r[3]);
        cur = { canto: Number(r[1]), chapter: Number(r[2]), from, to: r[4] ? Number(r[4]) : from, ref: rv ? `${r[2]}.${r[3]}${r[4] ? `-${r[4]}` : ""}` : t.replace(/[|()\s]/g, ""), lines: [], commentaries: [] };
        out.push(cur);
        inVerse = true;
        continue;
      }
      if (!cur) continue;
      if (/^[—–_-]{5,}$/.test(t)) {
        close();
        continue;
      }
      if (/^\.{3}$/.test(t) || !t) continue;
      if (/^h[1-6]$/.test(b.tag)) continue; // chapter headings of that edition
      let h = HEAD.exec(t);
      if (!h) {
        const h2 = HEAD2.exec(t);
        if (h2) {
          const who = h2[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          const w = Object.entries(WORK_OF).find(([k]) => who.startsWith(k))?.[1] ?? "";
          h = Object.assign([h2[0], h2[1].replace(/ḥ$/, ""), w], { index: 0, input: t, groups: undefined }) as unknown as RegExpExecArray;
        }
      }
      if (h) {
        const author = titleCase(h[1], true);
        // A verse whose number is missing in that edition: the same ācārya
        // begins again, right after a few verse lines ending in "||27||".
        const again = (com as CommentaryText | null)?.author === author || cur.commentaries.some((c) => c.author === author);
        if (again && !inVerse && paras.length > 2 && VERSE_END.test(paras[paras.length - 1].text)) {
          let k = paras.length;
          while (k > 1 && VERSE_LINE.test(paras[k - 1].text.replace(/\n/g, " ")) && paras.length - k < 8) k--;
          const verse = paras.slice(k);
          if (verse.length >= 2) {
            paras = paras.slice(0, k);
            close();
            const e = VERSE_END.exec(verse[verse.length - 1].text)!;
            const to = Number(e[2] ?? e[1]);
            const from = e[2] ? Number(e[1]) : to;
            cur = { canto: cur.canto, chapter: cur.chapter, from, to, ref: `${cur.chapter}.${from}${from !== to ? `-${to}` : ""}`, lines: verse.flatMap((v) => verseLines(v.text)), commentaries: [], noRef: true };
            out.push(cur);
          }
        }
        close();
        inVerse = false;
        com = { author, work: titleCase(h[2], false), html: "" };
        // the rest of this paragraph is the first part of the commentary
        const rest = afterHeader(cleanInline(html));
        if (rest) paras.push({ html: rest, text: t });
        continue;
      }
      if (inVerse) {
        cur.lines.push(...verseLines(t));
        continue;
      }
      if (com) {
        const p = cleanInline(b.html);
        if (p) paras.push({ html: p, text: t });
      }
    }
  }
  close();
  return out;
}

/**
 * Misprinted verse numbers ("(8.5)" in the middle of Chapter 9): a number that
 * does not follow the one before it (next verse, or verse 1 of the next
 * chapter) is replaced by the expected one. The verse text decides the final
 * place later (build.ts), so this only keeps the commentary in its chapter.
 */
export function repairSequence(list: CommentaryVerse[]): string[] {
  const fixed: string[] = [];
  let prev: CommentaryVerse | null = null;
  for (const v of list) {
    if (prev && v.canto === prev.canto) {
      const next = v.chapter === prev.chapter && v.from === prev.to + 1;
      const first = v.chapter === prev.chapter + 1 && v.from === 1;
      // a number that jumps a little ahead (a verse not commented on) is fine
      const ahead = v.chapter === prev.chapter && v.from > prev.to && v.from - prev.to <= 4;
      if (!next && !first && !ahead) {
        const was = v.ref;
        const n = v.to - v.from;
        v.chapter = prev.chapter;
        v.from = prev.to + 1;
        v.to = v.from + n;
        v.ref = `${v.chapter}.${v.from}${n ? `-${v.to}` : ""}`;
        fixed.push(`(${was}) after (${prev.ref}) — read as (${v.ref})`);
      }
    }
    prev = v;
  }
  return fixed;
}

// ------------------------------------------------------------------ kinds
/** The commentaries kept as their own kind (one tab each on the site). */
export const COMMENTARY_KINDS: { key: string; name: string; author: string; match: (author: string, work: string) => boolean }[] = [
  { key: "sridhara", name: "Bhāvārtha-dīpikā", author: "Śrīdhara Svāmī", match: (a, w) => /sridhara/.test(a) && /bhavartha/.test(w) && !/prakasa/.test(w) },
  { key: "vamsidhara", name: "Bhāvārtha-dīpikā-prakāśa", author: "Vaṁśīdhara", match: (a, w) => /vamsidhara/.test(a) || /prakasa/.test(w) },
  { key: "jiva-krama", name: "Krama-sandarbha", author: "Śrīla Jīva Gosvāmī", match: (a, w) => /jiva/.test(a) && /krama/.test(w) && !/^brhat/.test(w) },
  { key: "jiva-brhat-krama", name: "Bṛhat-krama-sandarbha", author: "Śrīla Jīva Gosvāmī", match: (a, w) => /jiva/.test(a) && /^brhat.?krama/.test(w) },
  { key: "jiva-laghu-tosani", name: "Laghu-vaiṣṇava-toṣaṇī", author: "Śrīla Jīva Gosvāmī", match: (a, w) => /jiva/.test(a) && /laghu/.test(w) },
  { key: "jiva-sandarbha", name: "Ṣaṭ-sandarbha (citations)", author: "Śrīla Jīva Gosvāmī", match: (a, w) => (/jiva/.test(a) && /sandarbha/.test(w)) || /sandarbha/.test(a) },
  { key: "sanatana-brhat-tosani", name: "Bṛhad-vaiṣṇava-toṣaṇī", author: "Śrīla Sanātana Gosvāmī", match: (a, w) => /sanatana/.test(a) && /tosani/.test(w) },
  { key: "sanatana-dig-darsini", name: "Dig-darśinī", author: "Śrīla Sanātana Gosvāmī", match: (a, w) => /sanatana/.test(a) && /dig/.test(w) },
  { key: "visvanatha", name: "Sārārtha-darśinī", author: "Śrīla Viśvanātha Cakravartī Ṭhākura", match: (a) => /visvanatha/.test(a) },
  { key: "baladeva", name: "Vaiṣṇavānandinī", author: "Śrīla Baladeva Vidyābhūṣaṇa", match: (a) => /baladeva/.test(a) },
  { key: "madhva", name: "Bhāgavata-tātparya", author: "Śrī Madhvācārya", match: (a) => /madhva/.test(a) },
  { key: "srinatha", name: "Caitanya-mata-mañjuṣā", author: "Śrīnātha Cakravartī", match: (a) => /srinatha/.test(a) },
  { key: "narayana-bhatta", name: "Rasikāhlādinī", author: "Nārāyaṇa Bhaṭṭa", match: (a) => /narayana/.test(a) },
  { key: "hemadri", name: "Kaivalya-dīpikā", author: "Hemādri", match: (a) => /hemadri/.test(a) },
  { key: "prabodhananda", name: "Śruti-stuti-vyākhyā", author: "Prabodhānanda Sarasvatī", match: (a) => /prabodhananda/.test(a) },
  { key: "madhusudana", name: "Paramahaṁsa-priyā", author: "Madhusūdana Sarasvatī", match: (a) => /madhusudana/.test(a) },
];
export const OTHER_KIND = { key: "other-acaryas", name: "Other commentaries", author: "" };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, "");
/** Which kind a commentary belongs to. */
export function kindOf(c: CommentaryText) {
  const a = fold(c.author);
  const w = fold(c.work);
  return COMMENTARY_KINDS.find((k) => k.match(a, w)) ?? null;
}
