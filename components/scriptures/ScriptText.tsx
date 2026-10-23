"use client";

import { useEffect, useState } from "react";
import { convertScript, detectScript, lines, type ScriptName } from "@/lib/scriptures/core";

// Script-aware rendering for Sanskrit text (docs/07): the typed IAST and
// Devanagari are shown as stored; other scripts are converted in the browser
// (the library loads only when needed). English is never converted.

const LANG: Record<ScriptName, string> = { iast: "sa-Latn", devanagari: "sa-Deva", bengali: "sa-Beng", oriya: "sa-Orya" };
const FONT: Record<ScriptName, string> = {
  iast: "",
  devanagari: "font-devanagari",
  bengali: "font-devanagari",
  oriya: "font-devanagari",
};

/**
 * Verse lines in the chosen script. Typed text wins: IAST mode shows the
 * typed transliteration, and the original shows as-is in its own script.
 * Anything else is converted from the original (Devanagari, Bengali, Odia),
 * or from the IAST if there is no original.
 */
export function VerseLinesIn({
  devanagari,
  iast,
  script,
  className = "",
  lineClass = "",
  size = "md",
  sanskrit = true,
}: {
  devanagari: string;
  iast: string;
  /** Sanskrit text is sandhi-joined when made from IAST; other languages (Bengali songs, CC) are not. */
  sanskrit?: boolean;
  script: ScriptName;
  className?: string;
  lineClass?: string;
  /** One fixed scale: lg = the reader, md = lists. Indic scripts are set a step larger so both read the same size. */
  size?: "lg" | "md";
}) {
  const origScript = detectScript(devanagari);
  const direct = script === "iast" ? iast : origScript === script ? devanagari : "";
  const [text, setText] = useState(direct);
  useEffect(() => {
    let live = true;
    if (direct) {
      setText(direct);
      return;
    }
    const src = devanagari && origScript ? { t: devanagari, f: origScript } : { t: iast, f: "iast" as ScriptName };
    if (!src.t) {
      setText("");
      return;
    }
    // convert line by line so the "/" markers can't be mangled
    Promise.all(lines(src.t).map((l) => convertScript(l, src.f, script, { sanskrit }))).then((ls) => live && setText(ls.join(" / ")));
    return () => {
      live = false;
    };
  }, [direct, devanagari, iast, script, origScript, sanskrit]);
  const ls = lines(text);
  if (!ls.length) return null;
  return (
    <div lang={LANG[script]} className={`verse-text verse-${size} ${script === "iast" ? "verse-latn" : "verse-indic"} ${FONT[script]} ${className}`}>
      {ls.map((l, i) => (
        <span key={i} className={`block ${lineClass}`}>
          {l}
        </span>
      ))}
    </div>
  );
}

const INDIC_RUN = /([\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u200c\u200d]+(?:[\s\d.,;:()\-–—'"!?]+[\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u200c\u200d]+)*)/;
const INDIC_CH = /[\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F]/;
const LATIN_LETTER = /[A-Za-zÀ-ɏḀ-ỿ]/;

/**
 * Is Latin text here English (leave it) or IAST (convert it)? The nearest
 * element with a `lang` mark decides; otherwise the field's own language.
 */
function latinIsEnglish(node: Node, root: Element, fieldIsEnglish: boolean): boolean {
  let el = node.parentElement;
  while (el && el !== root) {
    const l = el.getAttribute("lang");
    if (l) return /^en(\b|-)/i.test(l);
    el = el.parentElement;
  }
  return fieldIsEnglish;
}

/**
 * Sanitized HTML in the reader's script.
 *  - Devanagari, Bengali and Odia text is ALWAYS converted (any language).
 *  - Latin text is IAST and converted — unless it is English: the whole field's
 *    kind is English, or the part is marked English in the editor.
 *  - Inside an English field, parts marked Sanskrit (IAST terms) are converted.
 */
export function RichIn({ html, english, script, className = "" }: { html: string; english: boolean; script: ScriptName; className?: string }) {
  const [out, setOut] = useState(html);
  useEffect(() => {
    let live = true;
    setOut(html);
    const hasIndic = INDIC_CH.test(html);
    const mayHaveIast = !english || /lang=["']?sa/i.test(html);
    if (!hasIndic && (!mayHaveIast || script === "iast")) return;
    (async () => {
      const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
      const root = doc.body.firstElementChild as Element;
      const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      for (const n of nodes) {
        if (!n.data.trim()) continue;
        const latinStays = script === "iast" || latinIsEnglish(n, root, english);
        const parts = n.data.split(INDIC_RUN);
        const conv = await Promise.all(
          parts.map((p) => {
            if (INDIC_CH.test(p)) {
              const from = detectScript(p)!;
              return from === script ? Promise.resolve(p) : convertScript(p, from, script);
            }
            if (!latinStays && LATIN_LETTER.test(p)) return convertScript(p, "iast", script);
            return Promise.resolve(p);
          })
        );
        n.data = conv.join("");
      }
      if (live) setOut(root.innerHTML);
    })();
    return () => {
      live = false;
    };
  }, [html, english, script]);
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: out }} />;
}
