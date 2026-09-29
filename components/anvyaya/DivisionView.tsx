"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import VerseCard from "@/components/anvyaya/VerseCard";
import { versePath } from "@/lib/anvyayaBooks";
import type { ChapterSummary, Verse } from "@/lib/anvyayaTypes";

type Props = {
  bookCode: "SB" | "BG";
  /** Canto (SB) or chapter (BG) number. */
  divisionNo: number;
  /** true = list chapters (SB). false = list verses directly (BG). */
  hasChapters: boolean;
  chapters: ChapterSummary[];
  /** Chapter to open (and scroll to) on arrival, e.g. from /anvyaya/SB/1/12 */
  initialOpenChapter?: number;
};

const btn =
  "px-3.5 py-1.5 rounded-full border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors";

export default function DivisionView({ bookCode, divisionNo, hasChapters, chapters, initialOpenChapter }: Props) {
  const [open, setOpen] = useState<Set<number>>(
    () => new Set(initialOpenChapter !== undefined ? [initialOpenChapter] : [])
  );
  const [loaded, setLoaded] = useState<Record<number, Verse[]>>(() => {
    const m: Record<number, Verse[]> = {};
    for (const c of chapters) if (c.verses) m[c.number] = c.verses;
    return m;
  });
  const [status, setStatus] = useState<Record<number, "loading" | "error">>({});
  // undefined = each card manages itself; true/false = force all open/closed
  const [forceAll, setForceAll] = useState<boolean | undefined>(undefined);

  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;
  const inFlight = useRef<Set<number>>(new Set());

  const bookRef = { code: bookCode, hasChapters };

  const loadChapter = useCallback(
    async (n: number) => {
      if (loadedRef.current[n] || inFlight.current.has(n)) return;
      inFlight.current.add(n);
      setStatus((s) => ({ ...s, [n]: "loading" }));
      try {
        const res = await fetch(`/api/anvyaya/${bookCode}/${divisionNo}/${n}`);
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as { verses: Verse[] };
        setLoaded((l) => ({ ...l, [n]: data.verses }));
        setStatus((s) => {
          const next = { ...s };
          delete next[n];
          return next;
        });
      } catch {
        setStatus((s) => ({ ...s, [n]: "error" }));
      } finally {
        inFlight.current.delete(n);
      }
    },
    [bookCode, divisionNo]
  );

  // Arriving on /anvyaya/SB/1/12: make sure chapter 12 is loaded and in view.
  useEffect(() => {
    if (initialOpenChapter === undefined) return;
    loadChapter(initialOpenChapter);
    const t = setTimeout(() => {
      document.getElementById(`chapter-${initialOpenChapter}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [initialOpenChapter, loadChapter]);

  function toggleChapter(n: number) {
    const willOpen = !open.has(n);
    setOpen((prev) => {
      const next = new Set(prev);
      if (willOpen) next.add(n);
      else next.delete(n);
      return next;
    });
    if (willOpen) loadChapter(n);
  }

  async function expandAllChapters() {
    setOpen(new Set(chapters.map((c) => c.number)));
    // Load in small batches so a 90-chapter canto doesn't fire 90 requests at once.
    const queue = chapters.map((c) => c.number).filter((n) => !loadedRef.current[n]);
    const worker = async () => {
      while (queue.length) {
        const n = queue.shift();
        if (n !== undefined) await loadChapter(n);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }

  const totalVerses = chapters.reduce((n, c) => n + c.verseCount, 0);

  const toolbar = (
    <div className="sticky top-16 z-30 -mx-5 px-5 py-3 mb-8 bg-[var(--bg)]/90 backdrop-blur border-b border-[var(--border)]">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {hasChapters && (
          <>
            <button onClick={expandAllChapters} className={btn}>
              Expand all chapters
            </button>
            <button onClick={() => setOpen(new Set())} className={btn}>
              Collapse all
            </button>
            <span className="w-px h-5 bg-[var(--border)] mx-1 hidden sm:block" />
          </>
        )}
        <button onClick={() => setForceAll(true)} className={btn}>
          Show all verses
        </button>
        <button onClick={() => setForceAll(false)} className={btn}>
          Hide all verses
        </button>
        <button onClick={() => setForceAll(undefined)} className={btn}>
          Reset
        </button>
        <span className="ml-auto text-xs text-[var(--fg-muted)]">
          {totalVerses} verse{totalVerses === 1 ? "" : "s"}
          {hasChapters ? ` · ${chapters.length} chapter${chapters.length === 1 ? "" : "s"}` : ""}
        </span>
      </div>
    </div>
  );

  // ---- No sub-chapters (Bhagavad-gītā): verses straight away ----------------
  if (!hasChapters) {
    const verses = chapters[0]?.verses ?? [];
    return (
      <div>
        {toolbar}
        <div className="space-y-3">
          {verses.map((v) => (
            <VerseCard key={v.verseNo} verse={v} href={versePath(bookRef, v)} forceOpen={forceAll} />
          ))}
        </div>
      </div>
    );
  }

  // ---- Chapters, each expandable (Bhāgavatam) ------------------------------
  return (
    <div>
      {toolbar}
      <div className="space-y-5">
        {chapters.map((ch) => {
          const isOpen = open.has(ch.number);
          const verses = loaded[ch.number];
          const st = status[ch.number];
          return (
            <section key={ch.number} id={`chapter-${ch.number}`} className="scroll-mt-40">
              <button
                onClick={() => toggleChapter(ch.number)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-4 text-left rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] px-4 sm:px-5 py-4 hover:border-[var(--accent)] transition-colors group"
              >
                <span className="anv-numeral text-4xl w-14 shrink-0 text-center sutra-number">{ch.number}</span>
                <span className="flex-1 min-w-0">
                  <span className="anv-label block mb-0.5">Chapter {ch.number}</span>
                  <span className="block text-lg leading-snug group-hover:text-[var(--accent)] transition-colors">
                    {ch.name || `Chapter ${ch.number}`}
                  </span>
                </span>
                <span className="anv-pill shrink-0">
                  {ch.verseCount} verse{ch.verseCount === 1 ? "" : "s"}
                </span>
                <span
                  className={`shrink-0 text-lg leading-none text-[var(--accent)] transition-transform duration-200 ${
                    isOpen ? "rotate-45" : ""
                  }`}
                  aria-hidden
                >
                  +
                </span>
              </button>

              {isOpen && (
                <div className="pt-4 pl-0 sm:pl-4">
                  {verses ? (
                    <div className="space-y-3">
                      {verses.map((v) => (
                        <VerseCard key={v.verseNo} verse={v} href={versePath(bookRef, v)} forceOpen={forceAll} />
                      ))}
                    </div>
                  ) : st === "error" ? (
                    <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--fg-muted)]">
                      Couldn&apos;t load this chapter.{" "}
                      <button
                        onClick={() => loadChapter(ch.number)}
                        className="text-[var(--color-vermillion)] underline underline-offset-2"
                      >
                        Try again
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3" aria-busy="true" aria-label="Loading verses">
                      <div className="anv-skeleton" />
                      <div className="anv-skeleton" />
                      <div className="anv-skeleton" />
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
