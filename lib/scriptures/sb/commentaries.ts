import { blocks, cleanInline } from "@/lib/scriptures/sb/html";

// The ācāryas' Sanskrit commentaries (Gauḍīya Grantha Mandira e-books
// "four / five / ten commentaries – bhagavata purana – canto N"):
//   "|| 1.5.1 ||"                        a verse begins (its number in that edition)
//   verse lines, "sūta uvāca—"           the verse itself
//   "śrīdhara-svāmī (bhāvārtha-dīpikā) :" a commentary begins (alone, or at the
//                                        start of its first paragraph)
//   "———"                                end of a commentary
//   "na vyākhyātam."                     not commented on

export type CommentaryText = { author: string; work: string; html: string };
export type CommentaryVerse = { canto: number; chapter: number; from: number; to: number; ref: string; lines: string[]; commentaries: CommentaryText[] };

const REF = /^\|\|\s*(\d+)\.(\d+)\.(\d+)(?:\s*[-–]\s*(\d+))?\s*\|\|$/;
const HEAD = /^\s*([a-zāīūṛṝḷḹṅñṭḍṇśṣṁḥ’'\s-]{3,60}?)\s*\(([^)]{2,80})\)\s*:\s*/i;
/** Short form without the work: "śrīdharaḥ :", "madhvaḥ :" */
const HEAD2 = /^\s*(śrīdhara(?:-svāmī|ḥ)?|madhvaḥ|madhvācāryaḥ|jīvaḥ|jīva-gosvāmī|viśvanāthaḥ|viśvanātha-cakravartī|baladevaḥ|vaṁśīdharaḥ|sanātanaḥ|sanātana-gosvāmī)\s*:\s*/i;
const WORK_OF: Record<string, string> = {
  sridhara: "bhāvārtha-dīpikā", madhva: "bhāgavata-tātparyam", jiva: "krama-sandarbhaḥ", visvanatha: "sārārtha-darśinī",
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

export function parseCommentaries(files: { path: string; xhtml: string }[]): CommentaryVerse[] {
  const out: CommentaryVerse[] = [];
  let cur: CommentaryVerse | null = null;
  let com: CommentaryText | null = null;
  let inVerse = false;
  const close = () => {
    const plain = com?.html.replace(/<[^>]+>/g, "").trim() ?? "";
    if (cur && com && plain && !/^na vyākhyātam\.?$/i.test(plain)) cur.commentaries.push(com);
    com = null;
  };
  for (const f of files) {
    for (const b of blocks(f.xhtml)) {
      const t = b.text.trim();
      const r = REF.exec(t);
      if (r) {
        close();
        const from = Number(r[3]);
        cur = { canto: Number(r[1]), chapter: Number(r[2]), from, to: r[4] ? Number(r[4]) : from, ref: t.replace(/\|/g, "").trim(), lines: [], commentaries: [] };
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
        close();
        inVerse = false;
        com = { author: titleCase(h[1], true), work: titleCase(h[2], false), html: "" };
        // the rest of this paragraph is the first part of the commentary
        const rest = afterHeader(cleanInline(b.html));
        if (rest) com.html += `<p>${rest}</p>`;
        continue;
      }
      if (inVerse) {
        cur.lines.push(...t.split("\n").map((x) => x.replace(/[|।॥]+\s*$/, "").trim()).filter(Boolean));
        continue;
      }
      if (com) {
        const p = cleanInline(b.html);
        if (p) com.html += `<p>${p}</p>`;
      }
    }
  }
  close();
  return out;
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
