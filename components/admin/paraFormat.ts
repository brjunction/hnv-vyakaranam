import { Extension } from "@tiptap/core";

// Paragraph spacing and line spacing on paragraphs and headings (Word's
// "Line and paragraph spacing"), stored as inline styles.
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paraFormat: { setParaFormat: (attrs: { lineHeight?: string | null; spaceAfter?: string | null }) => ReturnType };
  }
}

export const ParaFormat = Extension.create({
  name: "paraFormat",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (a) => (a.lineHeight ? { style: `line-height: ${a.lineHeight}` } : {}),
          },
          spaceAfter: {
            default: null,
            parseHTML: (el) => el.style.marginBottom || null,
            renderHTML: (a) => (a.spaceAfter ? { style: `margin-bottom: ${a.spaceAfter}` } : {}),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setParaFormat:
        (attrs) =>
        ({ commands }) =>
          ["paragraph", "heading"].map((t) => commands.updateAttributes(t, attrs)).some(Boolean),
    };
  },
});
