"use client";

import { useState } from "react";
import type { PublicSutra } from "@/lib/data/hnv";
import SutraCard from "@/components/SutraCard";
import { RichIn } from "@/components/scriptures/ScriptText";
import { useReaderPrefs } from "@/components/scriptures/prefs";

/** A sūtra's own page body: the sūtra (synonyms, vṛtti, translation), then its commentaries in their own section. */
export default function SutraFull({ sutra }: { sutra: PublicSutra }) {
  const [prefs] = useReaderPrefs();
  return (
    <>
      <SutraCard sutra={sutra} forceOpen showNotes={false} script={prefs.script} />
      <SutraCommentaries commentaries={sutra.commentaries} script={prefs.script} />
    </>
  );
}

/** The commentaries of one sūtra, one at a time (tabs). */
export function SutraCommentaries({ commentaries, script }: { commentaries: PublicSutra["commentaries"]; script: ReturnType<typeof useReaderPrefs>[0]["script"] }) {
  const [active, setActive] = useState(0);
  if (!commentaries.length) return null;
  const c = commentaries[Math.min(active, commentaries.length - 1)];
  return (
    <section className="mt-8" aria-label="Commentaries">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--fg-muted)]">Commentaries</h2>
      {commentaries.length > 1 && (
        <div role="tablist" className="mb-4 flex flex-wrap gap-2">
          {commentaries.map((x, i) => (
            <button
              key={x.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${i === active ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--color-ink)]" : "border-[var(--border)]"}`}
            >
              {x.name}
            </button>
          ))}
        </div>
      )}
      <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-5 sm:p-6">
        <h3 className="mb-3 font-semibold">
          {c.name}
          {c.author && <span className="font-normal text-[var(--fg-muted)]"> · {c.author}</span>}
        </h3>
        <RichIn html={c.html} english script={script} className="leading-relaxed" />
      </article>
    </section>
  );
}
