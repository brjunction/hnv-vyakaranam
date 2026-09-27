// Splits the Miscellaneous-page Google Doc into sections of "extra" cards,
// using marker paragraphs of the exact form:
//
//   <section 1 start>
//   [optional: title: "Section title"]
//
//   <extra 1 start>
//   title: "HNV Grammar Importance"
//   subtitle: "This is regarding the importance of Extra 1"
//   Image: "https://..."
//   <extra 1 body start>
//   ...rich text body: bold, colors, images, tables, anything...
//   <extra 1 body end>
//   <extra 1 end>
//
//   <extra 2 start> ... <extra 2 end>
//   <section 1 end>
//
//   <section 2 start> ... <section 2 end>
//
// Each marker must be its own paragraph/line. "title:" / "subtitle:" /
// "Image:" lines are matched case-insensitively; surrounding quotes are
// optional and stripped automatically.

import { MISC_DOC_URL, REVALIDATE_SECONDS } from "@/lib/config";
import { getParsedGoogleDoc, elementText, elementsToHtml } from "@/lib/googleDocs";
import type { HTMLElement } from "node-html-parser";

const SECTION_START_RE = /^<\s*section\s+(.+?)\s+start\s*>$/i;
const SECTION_END_RE = /^<\s*section\s+(.+?)\s+end\s*>$/i;
const BODY_START_RE = /^<\s*extra\s+(.+?)\s+body\s+start\s*>$/i;
const BODY_END_RE = /^<\s*extra\s+(.+?)\s+body\s+end\s*>$/i;
const EXTRA_START_RE = /^<\s*extra\s+(.+?)\s+start\s*>$/i;
const EXTRA_END_RE = /^<\s*extra\s+(.+?)\s+end\s*>$/i;

const META_LINE_RE = /^(title|subtitle|image)\s*:\s*(.*)$/i;

function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && ((t[0] === '"' && t[t.length - 1] === '"') || (t[0] === "'" && t[t.length - 1] === "'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

export type MiscExtra = {
  key: string;
  title: string;
  subtitle?: string;
  image?: string;
  bodyHtml: string;
};

export type MiscSection = {
  key: string;
  title: string;
  extras: MiscExtra[];
};

export type MiscDoc = {
  sections: MiscSection[];
  styleCss: string;
  scopeClass: string;
};

const EMPTY: MiscDoc = { sections: [], styleCss: "", scopeClass: "" };

type State = "outside" | "inSection" | "inExtraMeta" | "inExtraBody";

export async function getMiscDoc(): Promise<MiscDoc> {
  if (!MISC_DOC_URL.trim()) return EMPTY;

  const doc = await getParsedGoogleDoc(MISC_DOC_URL, REVALIDATE_SECONDS);
  if (!doc) return EMPTY;

  const sections: MiscSection[] = [];
  let state: State = "outside";

  let sectionKey = "";
  let sectionMetaEls: HTMLElement[] = [];
  let sectionExtras: MiscExtra[] = [];

  let extraKey = "";
  let extraMetaEls: HTMLElement[] = [];
  let extraBodyEls: HTMLElement[] = [];

  function finishExtra() {
    const metaText = extraMetaEls.map(elementText).filter(Boolean);
    let title = "";
    let subtitle: string | undefined;
    let image: string | undefined;
    for (const line of metaText) {
      const m = line.match(META_LINE_RE);
      if (!m) continue;
      const field = m[1].toLowerCase();
      const value = stripQuotes(m[2]);
      if (field === "title") title = value;
      else if (field === "subtitle") subtitle = value;
      else if (field === "image") image = value;
    }
    sectionExtras.push({
      key: extraKey,
      title: title || `Extra ${extraKey}`,
      subtitle,
      image,
      bodyHtml: elementsToHtml(extraBodyEls),
    });
    extraMetaEls = [];
    extraBodyEls = [];
  }

  function finishSection() {
    const metaText = sectionMetaEls.map(elementText).filter(Boolean);
    let title = "";
    for (const line of metaText) {
      const m = line.match(META_LINE_RE);
      if (m && m[1].toLowerCase() === "title") title = stripQuotes(m[2]);
    }
    sections.push({
      key: sectionKey,
      title: title || `Section ${sectionKey}`,
      extras: sectionExtras,
    });
    sectionMetaEls = [];
    sectionExtras = [];
  }

  for (const el of doc.bodyElements) {
    const text = elementText(el);

    // Order matters: check the more specific "extra N body ..." markers
    // before the general "extra N ..." markers, since "start>"/"end>" is a
    // suffix of both.
    const bodyStart = text.match(BODY_START_RE);
    if (bodyStart) {
      state = "inExtraBody";
      continue;
    }
    const bodyEnd = text.match(BODY_END_RE);
    if (bodyEnd) {
      state = "inExtraMeta"; // back to waiting for <extra N end>
      continue;
    }

    const sectionStart = text.match(SECTION_START_RE);
    if (sectionStart) {
      sectionKey = sectionStart[1].trim();
      sectionMetaEls = [];
      sectionExtras = [];
      state = "inSection";
      continue;
    }
    const sectionEnd = text.match(SECTION_END_RE);
    if (sectionEnd) {
      finishSection();
      state = "outside";
      continue;
    }

    const extraStart = text.match(EXTRA_START_RE);
    if (extraStart) {
      extraKey = extraStart[1].trim();
      extraMetaEls = [];
      extraBodyEls = [];
      state = "inExtraMeta";
      continue;
    }
    const extraEnd = text.match(EXTRA_END_RE);
    if (extraEnd) {
      finishExtra();
      state = "inSection";
      continue;
    }

    if (state === "inExtraBody") extraBodyEls.push(el);
    else if (state === "inExtraMeta") extraMetaEls.push(el);
    else if (state === "inSection") sectionMetaEls.push(el);
    // state === "outside": ignore stray content between/outside sections
  }

  return { sections, styleCss: doc.styleCss, scopeClass: doc.scopeClass };
}
