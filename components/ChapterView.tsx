"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicChapter } from "@/lib/data/hnv";
import SutraCard from "@/components/SutraCard";
import { ScriptPicker } from "@/components/scriptures/Panes";
import { useReaderPrefs } from "@/components/scriptures/prefs";
import DictButton from "@/components/DictButton";
import { ChevronsDownUp, ChevronsUpDown, Eye, EyeOff } from "lucide-react";

function IconBtn({ title, onClick, active, children }: { title: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={title} aria-label={title} aria-pressed={active} onClick={onClick} className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${active ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--accent)]"}`}>
      {children}
    </button>
  );
}

export default function ChapterView({ chapter, sutraBase }: { chapter: PublicChapter; sutraBase?: string }) {
  const allSectionSlugs = useMemo(() => chapter.sections.map((s) => s.slug), [chapter]);

  // Which sections are expanded. Starts with the first section open (if any).
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(allSectionSlugs.slice(0, 1))
  );

  // undefined = each sutra card manages its own open state.
  // true/false = force every card open or closed.
  const [forceAllSutras, setForceAllSutras] = useState<boolean | undefined>(undefined);
  // Commentaries are read on each sūtra's own page; "show all" shows only the translation and/or vṛtti.
  const [compact, setCompact] = useState<"translation" | "vrtti" | "both">("translation");
  const [prefs, setPrefs] = useReaderPrefs();

  // Arriving at #<sūtra number> (e.g. from a Madhyama ↔ Bṛhat link): open its section and scroll to it.
  useEffect(() => {
    const go = () => {
      const n = decodeURIComponent(window.location.hash.slice(1));
      if (!n) return;
      const sec = chapter.sections.find((x) => x.sutras.some((y) => y.number === n));
      if (!sec) return;
      setOpenSections((prev) => new Set(prev).add(sec.slug));
      setTimeout(() => {
        const el = document.getElementById(n);
        el?.scrollIntoView({ block: "start" });
        el?.classList.add("sutra-flash");
        setTimeout(() => el?.classList.remove("sutra-flash"), 2200);
      }, 60);
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, [chapter]);

  const totalSutras = chapter.sections.reduce((n, s) => n + s.sutras.length, 0);

  function toggleSection(slug: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function expandAllSections() {
    setOpenSections(new Set(allSectionSlugs));
  }
  function collapseAllSections() {
    setOpenSections(new Set());
  }

  return (
    <div>
      {totalSutras > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8 text-sm">
          <ScriptPicker prefs={prefs} setPrefs={setPrefs} />
          <DictButton />
          <span className="w-px h-5 bg-[var(--border)] mx-1" />
          <IconBtn title="Open all sections" onClick={expandAllSections}><ChevronsUpDown size={16} /></IconBtn>
          <IconBtn title="Close all sections" onClick={collapseAllSections}><ChevronsDownUp size={16} /></IconBtn>
          <span className="w-px h-5 bg-[var(--border)] mx-1" />
          <IconBtn title="Show every sūtra (translation / vṛtti only)" active={forceAllSutras === true} onClick={() => setForceAllSutras(forceAllSutras === true ? undefined : true)}>
            <Eye size={16} />
          </IconBtn>
          <IconBtn title="Close every sūtra" onClick={() => setForceAllSutras(false)}><EyeOff size={16} /></IconBtn>
          {forceAllSutras === true && (
            <span className="inline-flex overflow-hidden rounded-full border border-[var(--border)]" role="group" aria-label="What to show">
              {(["translation", "vrtti", "both"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={compact === k}
                  onClick={() => setCompact(k)}
                  className={`px-3 py-1.5 ${compact === k ? "bg-[var(--accent)] text-[var(--color-ink)]" : "hover:text-[var(--accent)]"}`}
                >
                  {k === "translation" ? "Translation" : k === "vrtti" ? "Vṛtti" : "Both"}
                </button>
              ))}
            </span>
          )}
        </div>
      )}

      {chapter.sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">
          Sūtras for this chapter will appear here.
        </div>
      ) : (
        <div className="space-y-6">
          {chapter.sections.map((section) => {
            const isOpen = openSections.has(section.slug);
            return (
              <section key={section.slug} id={section.slug} className="scroll-mt-24">
                <button
                  onClick={() => toggleSection(section.slug)}
                  className="w-full flex items-center justify-between gap-4 text-left mb-1 group"
                  aria-expanded={isOpen}
                >
                  <h2 className="font-devanagari text-xl group-hover:text-[var(--accent)] transition-colors">
                    {section.title}
                  </h2>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-[var(--fg-muted)]">
                      {section.sutras.length} sūtra{section.sutras.length === 1 ? "" : "s"}
                    </span>
                    <span
                      className={`text-[var(--accent)] transition-transform ${isOpen ? "rotate-45" : ""}`}
                      aria-hidden
                    >
                      +
                    </span>
                  </span>
                </button>
                <div className="h-px bg-[var(--border)] mb-6" />

                {/* Always in the HTML (hidden when closed) so every sūtra is indexed. */}
                <div hidden={!isOpen}>
                {(section.sutras.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--fg-muted)]">
                      Sūtras for this section will appear here.
                    </div>
                  ) : (
                    <div className="space-y-3 mb-4">
                      {section.sutras.map((s) => (
                        <SutraCard script={prefs.script}
                          key={s.id}
                          sutra={s}
                          forceOpen={forceAllSutras}
                          showNotes={false}
                          compact={forceAllSutras === true ? compact : undefined}
                          pageHref={sutraBase ? `${sutraBase}/${encodeURIComponent(s.number)}` : undefined}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
