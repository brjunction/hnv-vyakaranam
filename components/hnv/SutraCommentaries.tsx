"use client";

import { useEffect, useState } from "react";
import { Columns2, Rows3 } from "lucide-react";
import { ScriptPicker } from "@/components/scriptures/Panes";
import type { PublicSutra } from "@/lib/data/hnv";
import SutraCard from "@/components/SutraCard";
import { RichIn } from "@/components/scriptures/ScriptText";
import { useReaderPrefs } from "@/components/scriptures/prefs";
import { splitVrtti } from "@/lib/hnv/vrtti";

/**
 * A sūtra's own page. Two readers, switched with the icons at the top:
 *  • Reader (default): like the scripture reader — the sūtra on the left, its
 *    commentaries on the right, switched with tabs (stacked on phones).
 *  • Simple: everything one below the other.
 */
export default function SutraFull({ sutra }: { sutra: PublicSutra }) {
  const [prefs, setPrefs] = useReaderPrefs();
  const [mode, setMode] = useState<"reader" | "simple">("reader");
  useEffect(() => {
    try {
      const m = localStorage.getItem("hnv:sutra-reader");
      if (m === "simple" || m === "reader") setMode(m);
    } catch {}
  }, []);
  const pick = (m: "reader" | "simple") => {
    setMode(m);
    try {
      localStorage.setItem("hnv:sutra-reader", m);
    } catch {}
  };
  const card = <SutraCard sutra={sutra} forceOpen showNotes={false} script={prefs.script} />;
  // the vṛtti's English translation is shown among the commentaries (first, bold and coloured)
  const vEn = splitVrtti(sutra.vrtti).english;
  const commentaries = vEn ? [{ key: "vrtti-translation", name: "Vṛtti translation", author: "", html: vEn, vrtti: true }, ...sutra.commentaries] : sutra.commentaries;
  const has = commentaries.length > 0;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <ScriptPicker prefs={prefs} setPrefs={setPrefs} />
        {has && (
          <span className="inline-flex overflow-hidden rounded-full border border-[var(--border)]" role="group" aria-label="Reader">
            <button type="button" title="Reader: sūtra and commentary side by side" aria-label="Reader" aria-pressed={mode === "reader"} onClick={() => pick("reader")} className={`px-3 py-1.5 ${mode === "reader" ? "bg-[var(--accent)] text-[var(--color-ink)]" : ""}`}>
              <Columns2 size={16} />
            </button>
            <button type="button" title="Simple: one below the other" aria-label="Simple" aria-pressed={mode === "simple"} onClick={() => pick("simple")} className={`px-3 py-1.5 ${mode === "simple" ? "bg-[var(--accent)] text-[var(--color-ink)]" : ""}`}>
              <Rows3 size={16} />
            </button>
          </span>
        )}
      </div>
      {!has || mode === "simple" ? (
        <>
          {card}
          <SutraCommentaries commentaries={commentaries} script={prefs.script} />
        </>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
          <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">{card}</div>
          <SutraCommentaries commentaries={commentaries} script={prefs.script} />
        </div>
      )}
    </>
  );
}

/** The commentaries of one sūtra, one at a time (tabs). */
type Com = PublicSutra["commentaries"][number] & { vrtti?: boolean };
const isSanskrit = (c: { name: string }) => /\(Sanskrit\)/i.test(c.name);
export function SutraCommentaries({ commentaries, script }: { commentaries: Com[]; script: ReturnType<typeof useReaderPrefs>[0]["script"] }) {
  const [active, setActive] = useState(0);
  if (!commentaries.length) return null;
  const c = commentaries[Math.min(active, commentaries.length - 1)];
  return (
    <section className="mt-8 lg:mt-0" aria-label="Commentaries">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--fg-muted)]">Commentaries</h2>
      {commentaries.length > 1 && (
        <div role="tablist" className="mb-4 grid gap-2">
          {(["en", "sa"] as const).map((g) => {
            const list = commentaries.map((x, i) => ({ x, i })).filter(({ x }) => (isSanskrit(x) ? "sa" : "en") === g);
            if (!list.length) return null;
            const both = commentaries.some((x) => isSanskrit(x)) && commentaries.some((x) => !isSanskrit(x));
            return (
              <div key={g} className="flex flex-wrap items-center gap-2">
                {both && <span className="w-20 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--fg-muted)]">{g === "en" ? "English" : "Sanskrit"}</span>}
                {list.map(({ x, i }) => (
                  <button
                    key={x.key}
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    onClick={() => setActive(i)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm ${
                      i === active
                        ? g === "sa"
                          ? "border-[var(--color-saffron)] bg-[var(--color-saffron)] text-white"
                          : "border-[var(--accent)] bg-[var(--accent)] text-[var(--color-ink)]"
                        : g === "sa"
                          ? "border-[var(--color-saffron)]/50 text-[var(--color-saffron)]"
                          : "border-[var(--border)]"
                    }`}
                  >
                    {x.name.replace(/\s*\((Sanskrit|English)\)$/, "")}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
      <article className={`rounded-2xl border p-5 sm:p-6 ${isSanskrit(c) ? "border-[var(--color-saffron)]/40 bg-[color-mix(in_srgb,var(--color-saffron)_6%,var(--bg-2))]" : "border-[var(--border)] bg-[var(--bg-2)]"}`}>
        <h3 className="mb-3 font-semibold">
          {c.name}
          {c.author && <span className="font-normal text-[var(--fg-muted)]"> · {c.author}</span>}
        </h3>
        <RichIn html={c.html} english script={script} className={`leading-relaxed ${c.vrtti ? "vrtti-en" : ""}`} />
      </article>
    </section>
  );
}
