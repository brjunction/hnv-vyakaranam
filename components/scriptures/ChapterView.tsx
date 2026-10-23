"use client";

import Link from "next/link";
import { BookOpenText, MessageSquareText } from "lucide-react";
import { AnvayaBlock, ScriptPicker, SizeControl, TranslationBlock } from "@/components/scriptures/Panes";
import { RichIn, VerseLinesIn } from "@/components/scriptures/ScriptText";
import { useReaderPrefs } from "@/components/scriptures/prefs";
import Select from "@/components/ui/Select";
import SynonymsBlock from "@/components/scriptures/SynonymsBlock";
import { detectScript, versePath, type DivisionData } from "@/lib/scriptures/core";
import DictButton from "@/components/DictButton";

// A whole chapter on one page: every verse at once, with a view switch —
// Verses · + Translation · + Commentary (choose which) — and an Anvaya toggle.

export default function ChapterView({ data }: { data: DivisionData }) {
  const { book, division, verses, types } = data;
  const [prefs, setPrefs] = useReaderPrefs();
  const verseTypes = types.filter((t) => t.appliesTo !== "division");
  const anvayaT = verseTypes.filter((t) => t.pane === "anvaya");
  const transT = verseTypes.filter((t) => t.pane === "translation");
  const wfwT = verseTypes.filter((t) => t.pane === "verse");
  const commT = verseTypes.filter((t) => t.pane === "commentary");
  const divTypes = types.filter((t) => t.appliesTo !== "verse" && division.c[t.id]);
  const mode = commT.length ? prefs.chapterMode : prefs.chapterMode === "commentary" ? "translation" : prefs.chapterMode;
  const commKey = prefs.chapterComm[book.code] ?? commT.find((t) => verses.some((v) => v.c[t.id]))?.key ?? commT[0]?.key;
  const comm = commT.find((t) => t.key === commKey) ?? commT[0];
  const font = { fontSize: `${prefs.fontScale}rem` };
  const commFont = { fontSize: `${prefs.commScale}rem` };
  const withTrans = mode !== "verse";
  const count = (id: number) => verses.filter((v) => v.c[id]).length;

  return (
    <div>
      {(division.bodyHtml || divTypes.length > 0) && (
        <div className="mx-auto mb-10 max-w-3xl space-y-8" style={font}>
          {division.bodyHtml && <RichIn html={division.bodyHtml} english script={prefs.script} className="text-[1.02em] leading-relaxed" />}
          {divTypes.map((t) => (
            <section key={t.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)]/50 p-5 sm:p-6">
              <h2 className="mb-1 font-semibold">{t.name}</h2>
              {t.author && <p className="mb-3 text-xs text-[var(--fg-muted)]">{t.author}</p>}
              <RichIn html={division.c[t.id]} english={t.language === "english"} script={prefs.script} />
            </section>
          ))}
        </div>
      )}

      {verses.length > 0 && (
        <>
          <div className="sticky top-16 z-20 -mx-4 mb-8 border-b border-[var(--border)] bg-[var(--bg)]/92 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="ui-seg" role="group" aria-label="What to show">
                <button type="button" aria-pressed={mode === "verse"} onClick={() => setPrefs({ chapterMode: "verse" })}>
                  {book.verseLabelPlural}
                </button>
                {transT.length > 0 && (
                  <button type="button" aria-pressed={mode === "translation"} onClick={() => setPrefs({ chapterMode: "translation" })}>
                    + Translation
                  </button>
                )}
                {commT.length > 0 && (
                  <button type="button" aria-pressed={mode === "commentary"} onClick={() => setPrefs({ chapterMode: "commentary" })}>
                    + Commentary
                  </button>
                )}
              </div>
              {mode === "commentary" && comm && (
                <Select
                  value={comm.key}
                  onChange={(k) => setPrefs({ chapterComm: { ...prefs.chapterComm, [book.code]: k } })}
                  options={commT.map((t) => ({ value: t.key, label: t.name, sub: t.author || undefined, dot: count(t.id) ? "on" : "off", badge: `${count(t.id)}/${verses.length}` }))}
                  icon={<MessageSquareText size={15} />}
                  width={320}
                  searchable={commT.length > 7}
                />
              )}
              {anvayaT.length > 0 && (
                <button type="button" className="ui-btn" aria-pressed={prefs.chapterAnvaya} onClick={() => setPrefs({ chapterAnvaya: !prefs.chapterAnvaya })}>
                  <span className="font-devanagari">अन्वयः</span> Anvaya
                </button>
              )}
              <span className="ml-auto flex flex-wrap items-center gap-2">
                <ScriptPicker prefs={prefs} setPrefs={setPrefs} />
                <DictButton />
                <SizeControl value={prefs.fontScale} onChange={(v) => setPrefs({ fontScale: v })} label="verse" />
                {mode === "commentary" && <SizeControl value={prefs.commScale} onChange={(v) => setPrefs({ commScale: v })} label="commentary" />}
              </span>
            </div>
          </div>

          <ol className="mx-auto max-w-4xl divide-y divide-[var(--border)]">
            {verses.map((v) => {
              const href = versePath(book.code, division.path, v.key);
              return (
                <li key={v.key} id={`v-${v.key}`} className="scroll-mt-36 py-8 first:pt-0">
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[4.5rem_1fr]">
                    <div className="flex items-start gap-2 sm:flex-col">
                      <Link href={href} className="rounded-full bg-[var(--bg-2)] px-2.5 py-1 text-xs font-semibold tabular-nums text-[var(--color-saffron)] ring-1 ring-[var(--border)] hover:ring-[var(--accent)]" title="Open in the reader">
                        {v.verseNo}
                      </Link>
                      <Link href={href} className="ui-icon-btn ui-btn-sm sm:mt-1" aria-label={`Open ${v.verseNo} in the reader`} title="Open in the reader">
                        <BookOpenText size={14} />
                      </Link>
                    </div>
                    <div className="min-w-0">
                      <div style={font}>
                        {v.speaker && <p className="mb-1 text-sm italic text-[var(--fg-muted)]">{v.speaker}</p>}
                        {v.iast || v.devanagari ? (
                          <VerseLinesIn sanskrit={v.language === "sanskrit"} devanagari={v.devanagari} iast={v.iast} script={prefs.script} size="md" />
                        ) : (
                          <p className="text-sm italic text-[var(--fg-muted)]">Text not yet added.</p>
                        )}
                        {prefs.script === "iast" && prefs.showDeva && (v.devanagari || v.iast) && (
                          <VerseLinesIn sanskrit={v.language === "sanskrit"} devanagari={v.devanagari} iast={v.iast} script={detectScript(v.devanagari) ?? "devanagari"} size="md" className="mt-2 text-[var(--fg-muted)]" />
                        )}
                        {prefs.chapterAnvaya && anvayaT.map((t) => <AnvayaBlock key={t.id} type={t} html={v.c[t.id]} script={prefs.script} compact />)}
                        {withTrans && wfwT.filter((t) => v.c[t.id]).map((t) => <SynonymsBlock key={t.id} type={t} html={v.c[t.id]} script={prefs.script} compact />)}
                        {withTrans && transT.map((t) => <TranslationBlock key={t.id} type={t} html={v.c[t.id]} script={prefs.script} compact />)}
                      </div>
                      {mode === "commentary" && comm && (
                        <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg-2)]/40 p-4 sm:p-5" style={commFont}>
                          <p className="mb-2 text-[0.8rem] font-medium text-[var(--fg-muted)]">{comm.name}{comm.author ? <span className="font-normal"> · {comm.author}</span> : null}</p>
                          {v.c[comm.id] ? (
                            <RichIn html={v.c[comm.id]} english={comm.language === "english"} script={prefs.script} className="leading-relaxed" />
                          ) : (
                            <p className="text-sm italic text-[var(--fg-muted)]">Nothing for this verse yet.</p>
                          )}
                        </section>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
