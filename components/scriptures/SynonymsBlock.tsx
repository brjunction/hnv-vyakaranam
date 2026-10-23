"use client";

import { useEffect, useMemo, useState } from "react";
import { RichIn } from "@/components/scriptures/ScriptText";
import { convertScript, type CommentaryType, type ScriptName } from "@/lib/scriptures/core";

// Synonyms (word-for-word), as in Śrīla Prabhupāda's books:
//   "dharma-kṣetre — in the place of pilgrimage; kuru-kṣetre — in the place named Kurukṣetra; …"
// Each Sanskrit word is shown in the reader's script (always as a word — no
// sandhi joining), its meaning stays English. Text in another shape is shown
// as written.

type Entry = { term: string; meaning: string };

function parse(html: string): Entry[] | null {
  const text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>\s*<p[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  const parts = text.split(/;\s*/).map((p) => p.trim()).filter(Boolean);
  const out: Entry[] = [];
  for (const p of parts) {
    const m = p.match(/^(.+?)\s+[—–-]\s+(.+)$/);
    if (!m) return null; // not in "term — meaning" form: show as written
    out.push({ term: m[1].trim(), meaning: m[2].trim().replace(/[.]$/, "") });
  }
  return out.length >= 2 || (out.length === 1 && parts.length === 1) ? out : null;
}

export default function SynonymsBlock({ type, html, script, compact = false }: { type: CommentaryType; html?: string; script: ScriptName; compact?: boolean }) {
  const entries = useMemo(() => (html ? parse(html) : null), [html]);
  const [terms, setTerms] = useState<string[] | null>(null);
  useEffect(() => {
    let live = true;
    if (!entries) return;
    if (script === "iast") {
      setTerms(entries.map((e) => e.term));
      return;
    }
    // each term on its own (a word list, not a verse: no joining across words)
    Promise.all(entries.map((e) => (/[ऀ-୿]/.test(e.term) ? Promise.resolve(e.term) : convertScript(e.term, "iast", script, { join: false })))).then(
      (t) => live && setTerms(t)
    );
    return () => {
      live = false;
    };
  }, [entries, script]);

  if (!html) return null;
  return (
    <section className={`synonyms-block ${compact ? "mt-4" : "mt-6"}`} aria-label={type.name}>
      <header className="synonyms-head">
        <span>{type.name || "Synonyms"}</span>
        {type.author && !compact && <span className="font-normal text-[var(--fg-muted)]">· {type.author}</span>}
      </header>
      {entries ? (
        <p className="synonyms-body">
          {entries.map((e, i) => (
            <span key={i} className="syn-entry">
              <span className={`syn-term ${script === "iast" ? "" : "font-devanagari"}`}>{terms?.[i] ?? e.term}</span>
              <span className="syn-dash"> — </span>
              <span className="syn-meaning">{e.meaning}</span>
              {i < entries.length - 1 ? "; " : ""}
            </span>
          ))}
        </p>
      ) : (
        <RichIn html={html} english={type.language === "english"} script={script} className="synonyms-body" />
      )}
    </section>
  );
}
