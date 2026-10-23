import { Mark, type Editor } from "@tiptap/react";

// Language marks for rich text: <span lang="en">…</span> / <span lang="sa">…</span>.
// The reader's script switcher converts all Devanagari, Bengali and Odia
// text, and Latin text as IAST — except English. English looks like IAST,
// so it is marked: a whole commentary kind set to English, or a part
// marked English here. In an English text, IAST terms can be marked Sanskrit
// so that they follow the script switcher.

export const TEXT_LANGS: { code: string; label: string; short: string; hint: string }[] = [
  { code: "en", label: "English", short: "En", hint: "never changes script" },
  { code: "sa", label: "Sanskrit / IAST", short: "सं", hint: "follows the reader's script" },
];

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    lang: {
      setLang: (lang: string) => ReturnType;
      unsetLang: () => ReturnType;
    };
  }
}

export const LangMark = Mark.create({
  name: "lang",
  priority: 1100,
  excludes: "lang",
  addAttributes() {
    return {
      lang: {
        default: "sa",
        parseHTML: (el) => el.getAttribute("lang"),
        renderHTML: (attrs) => ({ lang: attrs.lang }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[lang]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
  addCommands() {
    return {
      setLang:
        (lang: string) =>
        ({ commands }) =>
          commands.setMark(this.name, { lang }),
      unsetLang:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name, { extendEmptyMarkRange: true }),
    };
  },
});

const DEVA = /[ऀ-ॿ]/g;

/**
 * Mark Devanagari passages that look like quoted verses as Sanskrit:
 * paragraphs containing "॥", and Devanagari paragraphs inside a quote block.
 * Returns how many passages were marked (the editor reviews the result).
 */
export function markSanskritVerses(editor: Editor): number {
  const ranges: { from: number; to: number }[] = [];
  editor.state.doc.descendants((node, pos, parent) => {
    if (!node.isTextblock) return true;
    const text = node.textContent;
    const deva = (text.match(DEVA) ?? []).length;
    const letters = (text.match(/\p{L}/gu) ?? []).length || 1;
    const mostlyDeva = deva / letters > 0.6;
    const inQuote = parent?.type.name === "blockquote";
    if (mostlyDeva && (text.includes("॥") || inQuote)) ranges.push({ from: pos + 1, to: pos + node.nodeSize - 1 });
    return false;
  });
  if (!ranges.length) return 0;
  const type = editor.schema.marks.lang;
  const tr = editor.state.tr;
  for (const r of ranges) tr.addMark(r.from, r.to, type.create({ lang: "sa" }));
  editor.view.dispatch(tr);
  return ranges.length;
}

const IAST_WORD = /[A-Za-zĀāĪīŪūṚṛṜṝḶḷḸḹṂṃṀṁḤḥṄṅÑñṬṭḌḍṆṇŚśṢṣ'’]+(?:-[A-Za-zĀāĪīŪūṚṛṜṝḶḷḸḹṂṃṀṁḤḥṄṅÑñṬṭḌḍṆṇŚśṢṣ'’]+)*/g;
const IAST_MARK = /[ĀāĪīŪūṚṛṜṝḶḷḸḹṂṃṀṁḤḥṄṅÑñṬṭḌḍṆṇŚśṢṣ]/;

/** Mark words written with Sanskrit diacritics (kṛṣṇa-bhakti, Śrīmad-Bhāgavatam) in non-Sanskrit text. */
export function markIastTerms(editor: Editor): number {
  const ranges: { from: number; to: number }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    if (node.marks.some((m) => m.type.name === "lang")) return false;
    for (const m of node.text.matchAll(IAST_WORD)) {
      if (IAST_MARK.test(m[0])) ranges.push({ from: pos + (m.index ?? 0), to: pos + (m.index ?? 0) + m[0].length });
    }
    return false;
  });
  if (!ranges.length) return 0;
  const type = editor.schema.marks.lang;
  const tr = editor.state.tr;
  for (const r of ranges) tr.addMark(r.from, r.to, type.create({ lang: "sa" }));
  editor.view.dispatch(tr);
  return ranges.length;
}
