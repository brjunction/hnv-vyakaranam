"use client";

import { useMemo, useState } from "react";
import type { Chapter } from "@/lib/content";
import SutraCard, { type SutraWithNotes } from "@/components/SutraCard";

export type ChapterWithNotes = Omit<Chapter, "sections"> & {
  sections: { slug: string; title: string; sutras: SutraWithNotes[] }[];
};

export default function ChapterView({
  chapter,
  notesScopeClass,
}: {
  chapter: ChapterWithNotes;
  notesScopeClass: string;
}) {
  const allSectionSlugs = useMemo(() => chapter.sections.map((s) => s.slug), [chapter]);

  // Which sections are expanded. Starts with the first section open (if any).
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(allSectionSlugs.slice(0, 1))
  );

  // undefined = each sutra card manages its own open state.
  // true/false = force every card open or closed.
  const [forceAllSutras, setForceAllSutras] = useState<boolean | undefined>(undefined);
  const [showNotes, setShowNotes] = useState(true);

  const totalSutras = chapter.sections.reduce((n, s) => n + s.sutras.length, 0);
  const notesCount = chapter.sections.reduce(
    (n, s) => n + s.sutras.filter((x) => x.notesHtml).length,
    0
  );

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
        <div className="flex flex-wrap items-center gap-2 mb-10 text-sm">
          <button
            onClick={expandAllSections}
            className="px-3 py-1.5 rounded-full border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
          >
            Expand all subchapters
          </button>
          <button
            onClick={collapseAllSections}
            className="px-3 py-1.5 rounded-full border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
          >
            Collapse all
          </button>
          <span className="w-px h-5 bg-[var(--border)] mx-1" />
          <button
            onClick={() => setForceAllSutras(true)}
            className="px-3 py-1.5 rounded-full border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
          >
            Show all sūtras
          </button>
          <button
            onClick={() => setForceAllSutras(false)}
            className="px-3 py-1.5 rounded-full border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
          >
            Hide all sūtras
          </button>
          <button
            onClick={() => setForceAllSutras(undefined)}
            className="px-3 py-1.5 rounded-full border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
          >
            Reset
          </button>
          <span className="w-px h-5 bg-[var(--border)] mx-1" />
          <button
            onClick={() => setShowNotes((v) => !v)}
            className={`px-3 py-1.5 rounded-full border transition-colors ${
              showNotes
                ? "border-[var(--color-saffron)] text-[var(--color-saffron)]"
                : "border-[var(--border)] hover:border-[var(--accent)]"
            }`}
          >
            {showNotes ? "Notes: shown" : "Notes: hidden"}
          </button>
          {notesCount > 0 && (
            <span className="text-xs text-[var(--fg-muted)]">
              {notesCount} of {totalSutras} sūtras have notes
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

                {isOpen &&
                  (section.sutras.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--fg-muted)]">
                      Sūtras for this section will appear here.
                    </div>
                  ) : (
                    <div className="space-y-3 mb-4">
                      {section.sutras.map((s) => (
                        <SutraCard
                          key={s.number}
                          sutra={s}
                          forceOpen={forceAllSutras}
                          showNotes={showNotes}
                          notesScopeClass={notesScopeClass}
                        />
                      ))}
                    </div>
                  ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
