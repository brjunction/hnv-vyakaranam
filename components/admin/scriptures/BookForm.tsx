"use client";

import { useState } from "react";
import { ImageUp, Loader2, X } from "lucide-react";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { saveBook } from "@/lib/actions/scriptures";
import type { BookInfo } from "@/lib/scriptures/core";

const PRESETS: { label: string; levels: string; verse: [string, string] }[] = [
  { label: "Chapter → Verse", levels: "Chapter", verse: ["Verse", "Verses"] },
  { label: "Canto → Chapter → Verse", levels: "Canto, Chapter", verse: ["Verse", "Verses"] },
  { label: "Līlā → Chapter → Text", levels: "Līlā, Chapter", verse: ["Text", "Texts"] },
  { label: "Part → Chapter → Verse", levels: "Part, Chapter", verse: ["Verse", "Verses"] },
  { label: "Chapter → Śloka", levels: "Chapter", verse: ["Śloka", "Ślokas"] },
  { label: "Section only (prose)", levels: "Section", verse: ["Paragraph", "Paragraphs"] },
];

export default function BookForm({ book, isNew }: { book?: BookInfo; isNew?: boolean }) {
  const [levels, setLevels] = useState(book?.levels.join(", ") ?? "Chapter");
  const [vl, setVl] = useState(book?.verseLabel ?? "Verse");
  const [vlp, setVlp] = useState(book?.verseLabelPlural ?? "Verses");
  const [cover, setCover] = useState(book?.coverUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [upErr, setUpErr] = useState("");
  const [title, setTitle] = useState(book?.title ?? "");
  const [code, setCode] = useState(book?.code ?? "");
  const [codeTouched, setCodeTouched] = useState(Boolean(book));

  async function upload(f: File) {
    setBusy(true);
    setUpErr("");
    try {
      const body = new FormData();
      body.append("file", f);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed.");
      setCover(data.url);
    } catch (e) {
      setUpErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const autoCode = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/^(sri|srimad|sriman)[\s-]+/, "")
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 6);

  return (
    <ActionForm action={saveBook} className="grid gap-6">
      {book && <input type="hidden" name="id" value={book.id} />}
      <section className="a-card p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">Identity</h2>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <Field label="Title">
            <input
              name="title"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!codeTouched) setCode(autoCode(e.target.value));
              }}
              placeholder="Śrī Caitanya-caritāmṛta"
              className={inputCls}
            />
          </Field>
          <Field label="Title in Devanagari">
            <input name="titleDeva" defaultValue={book?.titleDeva} placeholder="श्रीचैतन्यचरितामृत" className={`${inputCls} font-devanagari`} />
          </Field>
          <Field label="Web address code" hint={`The book lives at /scriptures/${code || "code"}. Lowercase letters, digits, hyphens.`}>
            <input
              name="code"
              required
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toLowerCase());
                setCodeTouched(true);
              }}
              placeholder="cc"
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label="Reference abbreviation" hint="Shown before verse numbers: “SB 1.12.1”. Optional.">
            <input name="abbrev" defaultValue={book?.abbrev} placeholder="CC" className={inputCls} />
          </Field>
          <Field label="Author / compiler">
            <input name="author" defaultValue={book?.author} placeholder="Kṛṣṇadāsa Kavirāja Gosvāmī" className={inputCls} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={book?.status ?? (isNew ? "draft" : "published")} className={inputCls}>
              <option value="published">Published — visible on the site</option>
              <option value="draft">Draft — hidden while you prepare it</option>
              <option value="archived">Archived — hidden</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="a-card p-5 sm:p-6">
        <h2 className="mb-1 font-semibold">Structure</h2>
        <p className="mb-4 text-sm text-[var(--a-fg-muted)]">How the book is divided, from the top down. The smallest unit (verse, text, śloka …) comes last.</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setLevels(p.levels);
                setVl(p.verse[0]);
                setVlp(p.verse[1]);
              }}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                levels === p.levels && vl === p.verse[0] ? "border-[var(--a-primary)] bg-[var(--a-primary)] text-[var(--a-primary-fg)]" : "border-[var(--a-border)] hover:bg-[var(--a-muted)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <Field label="Levels (top → bottom, comma-separated)" hint="e.g. “Canto, Chapter”. Up to 6 levels.">
            <input name="levels" value={levels} onChange={(e) => setLevels(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Smallest unit">
            <input name="verseLabel" value={vl} onChange={(e) => setVl(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Plural">
            <input name="verseLabelPlural" value={vlp} onChange={(e) => setVlp(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Language of the verses" hint="CC: Bengali. A single verse can differ.">
            <select name="verseLanguage" defaultValue={book?.verseLanguage ?? "sanskrit"} className={inputCls}>
              <option value="sanskrit">Sanskrit</option>
              <option value="bengali">Bengali</option>
              <option value="hindi">Hindi</option>
              <option value="nepali">Nepali</option>
              <option value="odia">Odia</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>
        <p className="mt-3 rounded-lg bg-[var(--a-muted)] px-3 py-2 text-sm">
          {levels
            .split(/[,>→/]+/)
            .map((x) => x.trim())
            .filter(Boolean)
            .join(" → ")}{" "}
          → {vl} <span className="text-[var(--a-fg-muted)]">· a chapter can also hold prose instead of {vlp.toLowerCase()}</span>
        </p>
        {isNew && (
          <div className="mt-4 max-w-xs">
            <Field label={`Create top-level ${levels.split(",")[0]?.trim().toLowerCase() || "division"}s now`} hint="e.g. 18 for the Gītā’s chapters. You can add more any time.">
              <input name="generate" type="number" min={0} max={500} placeholder="0" className={inputCls} />
            </Field>
          </div>
        )}
      </section>

      <section className="a-card p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">Presentation</h2>
        <div className="grid gap-5 md:grid-cols-[1fr_12rem]">
          <div className="grid gap-4">
            <Field label="Tagline">
              <input name="tagline" defaultValue={book?.tagline} placeholder="One line shown under the title" className={inputCls} />
            </Field>
            <Field label="Short description" hint="Used on the scriptures page and for search engines.">
              <textarea name="description" rows={3} defaultValue={book?.description} className={inputCls} />
            </Field>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium">Cover</span>
            <input type="hidden" name="coverUrl" value={cover} />
            <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--a-border)] bg-[var(--a-muted)]">
              {cover ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setCover("")} className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white" aria-label="Remove cover">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-1 p-3 text-center text-xs text-[var(--a-fg-muted)]">
                  {busy ? <Loader2 size={20} className="animate-spin" /> : <ImageUp size={20} />}
                  {busy ? "Uploading…" : "Upload a picture"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
              )}
            </div>
            {upErr && <p className="mt-1 text-xs text-[var(--a-danger)]">{upErr}</p>}
          </div>
        </div>
        <div className="mt-5">
          <span className="mb-1.5 block text-sm font-medium">Introduction (shown on the book’s page)</span>
          <RichTextEditor name="introHtml" defaultValue={book?.introHtml ?? ""} placeholder="About this scripture…" minHeight={120} />
        </div>
      </section>

      <div className="sticky bottom-4 z-20">
        <div className="a-card flex items-center gap-4 px-4 py-3 shadow-[var(--a-shadow-lg)]">
          <SubmitButton>{isNew ? "Create scripture" : "Save settings"}</SubmitButton>
          {isNew && <span className="text-xs text-[var(--a-fg-muted)]">A “Translation” commentary is created for you; add more under Commentaries.</span>}
        </div>
      </div>
    </ActionForm>
  );
}
