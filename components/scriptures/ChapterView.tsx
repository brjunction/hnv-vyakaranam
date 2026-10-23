"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpenText, BookmarkCheck, ChevronDown, ChevronsDownUp, ChevronsUpDown, NotebookPen } from "lucide-react";
import { ScriptPicker, SizeControl, VerseCompanions } from "@/components/scriptures/Panes";
import { CommentaryNav } from "@/components/scriptures/CommentaryNav";
import { RichIn, VerseLinesIn } from "@/components/scriptures/ScriptText";
import { useMarks, useNotes, useReaderPrefs } from "@/components/scriptures/prefs";
import { versePath, verseRef, type DivisionData } from "@/lib/scriptures/core";

export default function ChapterView({ data }: { data: DivisionData }) {
  const { book, division, verses, types } = data;
  const [prefs, setPrefs] = useReaderPrefs();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const bookmarks = useMarks("bookmarks");
  const { notes } = useNotes();
  const verseTypes = types.filter((t) => t.appliesTo !== "division");
  const hasComm = verseTypes.some((t) => t.pane === "commentary");
  const divTypes = types.filter((t) => t.appliesTo !== "verse" && division.c[t.id]);
  useEffect(() => {
    if (prefs.expandAll) setOpen(new Set(verses.map((v) => v.key)));
  }, [prefs.expandAll, verses]);
  // open the verse in the URL hash (#12)
  useEffect(() => {
    const h = decodeURIComponent(window.location.hash.slice(1));
    if (h && verses.some((v) => v.key === h)) {
      setOpen((o) => new Set([...o, h]));
      setTimeout(() => document.getElementById(`v-${h}`)?.scrollIntoView({ block: "start" }), 50);
    }
  }, [verses]);

  const toggle = (k: string) => setOpen((o) => (o.has(k) ? new Set([...o].filter((x) => x !== k)) : new Set([...o, k])));
  const font = { fontSize: `${prefs.fontScale}rem` };
  const commFont = { fontSize: `${prefs.commScale}rem` };

  return (
    <div>
      {(division.bodyHtml || divTypes.length > 0) && (
        <div className="mb-10 space-y-8" style={font}>
          {division.bodyHtml && <RichIn html={division.bodyHtml} english script={prefs.script} className="mx-auto max-w-3xl text-[1.05em] leading-relaxed" />}
          {divTypes.map((t) => (
            <section key={t.id} className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--bg-2)]/50 p-5 sm:p-6">
              <h2 className="mb-1 font-semibold">{t.name}</h2>
              {t.author && <p className="mb-3 text-xs text-[var(--fg-muted)]">{t.author}</p>}
              <RichIn html={division.c[t.id]} english={t.language === "english"} script={prefs.script} />
            </section>
          ))}
        </div>
      )}

      {verses.length > 0 && (
        <>
          <div className="sticky top-16 z-20 -mx-4 mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg)]/92 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
            <span className="text-sm text-[var(--fg-muted)]">
              {verses.length} {verses.length === 1 ? book.verseLabel.toLowerCase() : book.verseLabelPlural.toLowerCase()}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <ScriptPicker prefs={prefs} setPrefs={setPrefs} compact />
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--fg-muted)]">
                Verse <SizeControl value={prefs.fontScale} onChange={(v) => setPrefs({ fontScale: v })} label="verse" />
              </span>
              {hasComm && (
                <span className="inline-flex items-center gap-1.5 text-xs text-[var(--fg-muted)]">
                  Commentary <SizeControl value={prefs.commScale} onChange={(v) => setPrefs({ commScale: v })} label="commentary" />
                </span>
              )}
              <button
                onClick={() => {
                  const all = open.size < verses.length;
                  setOpen(all ? new Set(verses.map((v) => v.key)) : new Set());
                  setPrefs({ expandAll: all });
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 text-sm hover:border-[var(--accent)]"
              >
                {open.size < verses.length ? <ChevronsUpDown size={15} /> : <ChevronsDownUp size={15} />}
                {open.size < verses.length ? "Open all" : "Close all"}
              </button>
              {prefs.script === "iast" && (
                <button onClick={() => setPrefs({ showDeva: !prefs.showDeva })} aria-pressed={prefs.showDeva} className={`inline-flex h-9 items-center rounded-full border px-3 text-sm ${prefs.showDeva ? "border-[var(--accent)] bg-[var(--accent)]/15" : "border-[var(--border)] bg-[var(--bg)]"}`}>
                  + देवनागरी
                </button>
              )}
            </div>
          </div>

          <ol className="space-y-3">
            {verses.map((v) => {
              const href = versePath(book.code, division.path, v.key);
              const isOpen = open.has(v.key);
              const marked = bookmarks.has(href);
              const note = notes[href];
              return (
                <li key={v.key} id={`v-${v.key}`} className="scroll-mt-32 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-sm transition-shadow hover:shadow-[var(--shadow-lift)]">
                  <button onClick={() => toggle(v.key)} aria-expanded={isOpen} className="flex w-full items-start gap-4 px-4 py-4 text-left sm:px-6">
                    <span className="mt-1 shrink-0 rounded-full bg-[var(--bg-2)] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--color-saffron)]">{v.verseNo}</span>
                    <span className="min-w-0 flex-1" style={font}>
                      {v.speaker && <span className="mb-1 block text-sm italic text-[var(--fg-muted)]">{v.speaker}</span>}
                      <VerseLinesIn devanagari={v.devanagari} iast={v.iast} script={prefs.script} size="md" />
                      {prefs.script === "iast" && prefs.showDeva && v.devanagari && v.iast && (
                        <VerseLinesIn devanagari={v.devanagari} iast="" script="devanagari" size="md" className="mt-2 text-[var(--fg-muted)]" />
                      )}
                      {!v.iast && !v.devanagari && <span className="text-sm text-[var(--fg-muted)]">Text not yet added.</span>}
                    </span>
                    <span className="mt-1 flex shrink-0 items-center gap-1.5 text-[var(--fg-muted)]">
                      {marked && <BookmarkCheck size={15} className="text-[var(--accent)]" aria-label="Bookmarked" />}
                      {note && <NotebookPen size={15} className="text-[var(--accent)]" aria-label="Has your note" />}
                      <ChevronDown size={18} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-[var(--border)] px-4 pb-5 pt-4 sm:px-6">
                      <div className="-mt-3 mb-6" style={font}>
                        <VerseCompanions types={verseTypes} c={v.c} script={prefs.script} compact />
                      </div>
                      {hasComm && <div style={commFont}><CommentaryNav bookCode={book.code} c={v.c} types={verseTypes} prefs={prefs} setPrefs={setPrefs} variant="compact" /></div>}
                      {note && (
                        <p className="mt-5 whitespace-pre-wrap rounded-xl border border-dashed border-[var(--accent)]/60 bg-[var(--bg-2)]/60 p-3 text-sm">
                          <span className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                            <NotebookPen size={12} /> My note
                          </span>
                          {note.text}
                        </p>
                      )}
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Link href={href} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--color-ink)]">
                          <BookOpenText size={15} /> Open in reader
                        </Link>
                        <button
                          onClick={() => bookmarks.toggle({ book: book.code, ref: verseRef(book, v.verseNo), href, title: book.title })}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
                        >
                          <BookmarkCheck size={15} /> {marked ? "Bookmarked" : "Bookmark"}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
