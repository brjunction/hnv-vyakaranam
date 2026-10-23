"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Headphones } from "lucide-react";
import { ScriptPicker, SizeControl } from "@/components/scriptures/Panes";
import { VerseLinesIn } from "@/components/scriptures/ScriptText";
import SynonymsBlock from "@/components/scriptures/SynonymsBlock";
import { useReaderPrefs } from "@/components/scriptures/prefs";
import { detectScript, type CommentaryType } from "@/lib/scriptures/core";
import type { Song } from "@/lib/songs/core";
import DictButton from "@/components/DictButton";

// A song, verse by verse, in the reader's script — the same script picker and
// text size as the scriptures. Translation and synonyms can be hidden to sing
// from the page.

const SYN: CommentaryType = { id: 0, key: "synonyms", name: "Synonyms", nameDeva: "", author: "", description: "", language: "english", appliesTo: "verse", pane: "verse" };
const VIEW_KEY = "hnv:songs:view";

export default function SongReader({ song }: { song: Song }) {
  const [prefs, setPrefs] = useReaderPrefs();
  const [showTr, setShowTr] = useState(true);
  const [showSyn, setShowSyn] = useState(false);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(VIEW_KEY) ?? "{}");
      if (typeof v.tr === "boolean") setShowTr(v.tr);
      if (typeof v.syn === "boolean") setShowSyn(v.syn);
    } catch {}
  }, []);
  const save = (tr: boolean, syn: boolean) => {
    setShowTr(tr);
    setShowSyn(syn);
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify({ tr, syn }));
    } catch {}
  };
  const sanskrit = song.language === "sanskrit";
  const hasTr = song.verses.some((v) => v.translation);
  const hasSyn = song.verses.some((v) => v.synonyms);

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-5 mb-6 border-b border-[var(--border)] bg-[var(--bg)]/92 px-5 py-2.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          {(hasTr || hasSyn) && (
            <div className="ui-seg" role="group" aria-label="What to show">
              <button type="button" aria-pressed={!showTr && !showSyn} onClick={() => save(false, false)}>
                Lyrics only
              </button>
              {hasTr && (
                <button type="button" aria-pressed={showTr && !showSyn} onClick={() => save(true, false)}>
                  + Translation
                </button>
              )}
              {hasSyn && (
                <button type="button" aria-pressed={showSyn} onClick={() => save(true, true)}>
                  + Synonyms
                </button>
              )}
            </div>
          )}
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <ScriptPicker prefs={prefs} setPrefs={setPrefs} />
            <DictButton />
            <SizeControl value={prefs.fontScale} onChange={(v) => setPrefs({ fontScale: v })} label="lyrics" />
          </span>
        </div>
      </div>

      {song.verses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">The words of this song haven&apos;t been added yet.</p>
      ) : (
        <ol className="song-verses" style={{ fontSize: `${prefs.fontScale}rem` }}>
          {song.verses.map((v, i) => {
            const indic = Boolean(detectScript(v.text));
            return (
              <li key={i} className="song-verse">
                <span className="song-num" aria-label={`Verse ${i + 1}`}>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <VerseLinesIn
                    sanskrit={sanskrit}
                    devanagari={indic ? v.text : ""}
                    iast={indic ? v.printed ?? "" : v.text}
                    script={prefs.script}
                    size="lg"
                    lineClass="py-0.5"
                  />
                  {showSyn && v.synonyms && <SynonymsBlock type={SYN} html={v.synonyms} script={prefs.script} compact />}
                  {showTr && v.translation && <div className="song-translation rich-content" dangerouslySetInnerHTML={{ __html: v.translation }} />}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {song.links.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {song.links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="ui-btn">
              <Headphones size={14} />
              {l.label || "Listen"} <ExternalLink size={13} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
