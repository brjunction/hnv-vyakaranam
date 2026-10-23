"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Link2, Plus, Scissors, Trash2 } from "lucide-react";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { VerseLinesIn } from "@/components/scriptures/ScriptText";
import { saveSong } from "@/lib/actions/songs";
import { detectScript } from "@/lib/scriptures/core";
import { SONG_KINDS, SONG_LANGUAGE_LABEL, type Song, type SongLanguage, type SongLink, type SongVerse } from "@/lib/songs/core";

type V = SongVerse & { k: number };
let seq = 0;
const blank = (): V => ({ k: ++seq, text: "", printed: "", translation: "", synonyms: "" });
const plain = (h?: string) =>
  (h ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<\/?p>/gi, "")
    .replace(/&amp;/g, "&")
    .trim();

function Preview({ v, sanskrit }: { v: V; sanskrit: boolean }) {
  const src = v.text.trim();
  if (!src) return null;
  const indic = Boolean(detectScript(src));
  const deva = indic ? src : "";
  const iast = indic ? v.printed?.trim() ?? "" : src;
  const targets = indic ? (["iast", "devanagari"] as const) : (["devanagari", "bengali"] as const);
  return (
    <div className="mt-2 grid gap-2 rounded-md bg-[var(--a-muted)]/50 p-2 sm:grid-cols-2">
      {targets.map((t) => (
        <VerseLinesIn key={t} sanskrit={sanskrit} devanagari={deva} iast={iast} script={t} size="md" className="!text-sm !leading-snug" />
      ))}
    </div>
  );
}

export default function SongForm({ song, facets }: { song?: Song; facets: { authors: string[]; books: string[]; kinds: string[] } }) {
  const [lang, setLang] = useState<SongLanguage>(song?.language ?? "bengali");
  const [verses, setVerses] = useState<V[]>(() => (song?.verses.length ? song.verses.map((v) => ({ ...v, k: ++seq, synonyms: plain(v.synonyms) })) : [blank()]));
  const [links, setLinks] = useState<SongLink[]>(song?.links ?? []);
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const sanskrit = lang === "sanskrit";
  const set = (k: number, patch: Partial<V>) => setVerses((vs) => vs.map((v) => (v.k === k ? { ...v, ...patch } : v)));
  const move = (i: number, d: -1 | 1) =>
    setVerses((vs) => {
      const j = i + d;
      if (j < 0 || j >= vs.length) return vs;
      const c = [...vs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  const split = () => {
    const parts = paste
      .replace(/\r/g, "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => p.replace(/^\(?\d+\)?[.)]?\s+/, "")); // drop "(1)" / "1." verse numbers
    if (!parts.length) return;
    setVerses((vs) => parts.map((t, i) => ({ ...(vs[i] ?? blank()), text: t })));
    setShowPaste(false);
    setPaste("");
  };

  return (
    <ActionForm action={saveSong} className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      {song && <input type="hidden" name="id" value={song.id} />}
      <input type="hidden" name="verses" value={JSON.stringify(verses.map(({ k, ...v }) => (void k, { ...v, synonyms: v.synonyms ?? "" })))} />
      <input type="hidden" name="links" value={JSON.stringify(links)} />
      <datalist id="song-authors">{facets.authors.map((a) => <option key={a} value={a} />)}</datalist>
      <datalist id="song-books">{facets.books.map((a) => <option key={a} value={a} />)}</datalist>
      <datalist id="song-kinds">{[...new Set([...SONG_KINDS, ...facets.kinds])].map((a) => <option key={a} value={a} />)}</datalist>

      <div className="grid content-start gap-6">
        <section className="a-card grid gap-4 p-5 sm:p-6">
          <Field label="Title" hint="As devotees know it — usually the first words: “Śrī Guru-vandanā”, “Jaya Rādhā-Mādhava”.">
            <input name="title" required defaultValue={song?.title} className={`${inputCls} text-base font-medium`} />
          </Field>
          <Field label="Other names (optional)" hint="Comma separated — only for search, e.g. “Gurvaṣṭakam, saṁsāra-dāvānala”.">
            <input name="altTitles" defaultValue={song?.altTitles} className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Author">
              <input name="author" list="song-authors" defaultValue={song?.author} placeholder="Śrīla Bhaktivinoda Ṭhākura" className={inputCls} />
            </Field>
            <Field label="Type">
              <input name="kind" list="song-kinds" defaultValue={song?.kind ?? "Song"} className={inputCls} />
            </Field>
            <Field label="Book">
              <input name="book" list="song-books" defaultValue={song?.book} placeholder="Śaraṇāgati" className={inputCls} />
            </Field>
            <Field label="Place in the book" hint="e.g. “Song 3” or “1.4” — orders the book.">
              <input name="bookPlace" defaultValue={song?.bookPlace} className={inputCls} />
            </Field>
            <Field label="Language" hint="Sanskrit verses are written with words joined in Devanagari; Bengali songs are not.">
              <select name="language" value={lang} onChange={(e) => setLang(e.target.value as SongLanguage)} className={inputCls}>
                {Object.entries(SONG_LANGUAGE_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Translation by (optional)">
              <input name="translator" defaultValue={song?.translator} className={inputCls} />
            </Field>
          </div>
        </section>

        <section className="a-card p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Verses ({verses.length})</h2>
              <p className="text-xs text-[var(--a-fg-muted)]">
                Each verse ONCE, in any script — {sanskrit ? "IAST is best" : "the Bengali script is best, with the book’s IAST beside it"}. “/” or a new line = line break.
              </p>
            </div>
            <button type="button" onClick={() => setShowPaste((x) => !x)} className="a-btn a-btn-outline h-8 text-xs">
              <Scissors size={13} /> Paste the whole song
            </button>
          </div>
          {showPaste && (
            <div className="mb-5 rounded-lg border border-dashed border-[var(--a-border)] p-3">
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={8} placeholder={"Paste the lyrics here.\nLeave an empty line between verses.\n\n(1)\njaya rādhā-mādhava …"} className={`${inputCls} text-sm`} />
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={split} className="a-btn a-btn-primary h-8 text-xs">
                  Split into verses
                </button>
                <span className="text-xs text-[var(--a-fg-muted)]">Replaces the verse texts below (translations are kept by position).</span>
              </div>
            </div>
          )}
          <ol className="grid gap-5">
            {verses.map((v, i) => (
              <li key={v.k} className="rounded-xl border border-[var(--a-border)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-[var(--a-muted)] px-2 py-0.5 text-xs font-semibold tabular-nums">{i + 1}</span>
                  <span className="ml-auto flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} className="a-btn a-btn-outline h-7 w-7 !p-0" aria-label="Move up">
                      <ArrowUp size={13} />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} className="a-btn a-btn-outline h-7 w-7 !p-0" aria-label="Move down">
                      <ArrowDown size={13} />
                    </button>
                    <button type="button" onClick={() => setVerses((vs) => (vs.length > 1 ? vs.filter((x) => x.k !== v.k) : [blank()]))} className="a-btn a-btn-outline h-7 w-7 !p-0 text-[var(--a-danger)]" aria-label="Remove verse">
                      <Trash2 size={13} />
                    </button>
                  </span>
                </div>
                <textarea
                  value={v.text}
                  onChange={(e) => set(v.k, { text: e.target.value })}
                  rows={Math.max(2, v.text.split(/\n|\//).length)}
                  className={`${inputCls} text-base leading-relaxed ${detectScript(v.text) ? "font-devanagari" : ""}`}
                  placeholder="jaya rādhā-mādhava kuñja-bihārī / gopī-jana-vallabha giri-vara-dhārī"
                />
                {!sanskrit && detectScript(v.text) && (
                  <input value={v.printed ?? ""} onChange={(e) => set(v.k, { printed: e.target.value })} placeholder="IAST as printed (optional), e.g. “doyā koro more”" className={`${inputCls} mt-2 text-sm italic`} />
                )}
                <Preview v={v} sanskrit={sanskrit} />
                <div className="mt-3">
                  <span className="mb-1 block text-xs font-medium text-[var(--a-fg-muted)]">Translation</span>
                  <RichTextEditor name={`tr_${v.k}`} defaultValue={v.translation ?? ""} minHeight={70} placeholder="Translation…" onChange={(h) => set(v.k, { translation: h })} />
                </div>
                <details className="mt-2" open={Boolean(v.synonyms)}>
                  <summary className="cursor-pointer text-xs font-medium text-[var(--a-fg-muted)]">Synonyms (optional)</summary>
                  <textarea value={v.synonyms ?? ""} onChange={(e) => set(v.k, { synonyms: e.target.value })} rows={3} placeholder="jaya — all glories; rādhā-mādhava — to Rādhā and Mādhava; …" className={`${inputCls} mt-1 text-sm`} />
                </details>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setVerses((vs) => [...vs, blank()])} className="a-btn a-btn-outline mt-4">
            <Plus size={15} /> Add a verse
          </button>
        </section>

        <section className="a-card grid gap-4 p-5 sm:p-6">
          <div>
            <span className="mb-1.5 block text-sm font-medium">About this song (optional)</span>
            <RichTextEditor name="introHtml" defaultValue={song?.introHtml ?? ""} minHeight={90} placeholder="Background, when it is sung …" />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium">Purport / commentary (optional)</span>
            <RichTextEditor name="purportHtml" defaultValue={song?.purportHtml ?? ""} minHeight={120} placeholder="Purport…" />
          </div>
        </section>
      </div>

      <aside className="grid content-start gap-4 xl:sticky xl:top-4">
        <div className="a-card grid gap-3 p-5">
          <Field label="Visibility">
            <select name="status" defaultValue={song?.status ?? "published"} className={inputCls}>
              <option value="published">Published</option>
              <option value="draft">Draft (hidden)</option>
              <option value="archived">Archived (hidden)</option>
            </select>
          </Field>
          <Field label="Address" hint="/songs/… — empty = from the title.">
            <input name="slug" defaultValue={song?.slug} placeholder="auto" className={`${inputCls} font-mono text-xs`} />
          </Field>
          <SubmitButton className="w-full">{song ? "Save song" : "Add song"}</SubmitButton>
        </div>
        <div className="a-card grid gap-2 p-5">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Link2 size={14} /> Listen / watch (links only)
          </span>
          {links.map((l, i) => (
            <div key={i} className="grid gap-1 rounded-lg border border-[var(--a-border)] p-2">
              <input value={l.label} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Label, e.g. Śrīla Prabhupāda singing" className={`${inputCls} text-xs`} />
              <input value={l.url} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://…" className={`${inputCls} text-xs`} />
              <button type="button" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))} className="justify-self-end text-xs text-[var(--a-danger)]">
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setLinks((ls) => [...ls, { label: "", url: "" }])} className="a-btn a-btn-outline h-8 text-xs">
            <Plus size={13} /> Add a link
          </button>
        </div>
      </aside>
    </ActionForm>
  );
}
