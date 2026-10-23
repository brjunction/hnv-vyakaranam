"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight, ChevronLeft, ChevronRight, Columns2, Eye, PanelLeft, Wand2, ExternalLink, Keyboard, CheckCircle2,
} from "lucide-react";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { ScriptPicker, VersePane } from "@/components/scriptures/Panes";
import { CommentaryNav } from "@/components/scriptures/CommentaryNav";
import { useReaderPrefs } from "@/components/scriptures/prefs";
import { saveVerse } from "@/lib/actions/scriptures";
import { SCRIPT_LABELS, detectScript, lines, type CommentaryType, type VerseData } from "@/lib/scriptures/core";
import { VerseLinesIn } from "@/components/scriptures/ScriptText";

type Layout = "split" | "edit" | "preview";

export const LANG_LABEL: Record<string, string> = { sanskrit: "Sanskrit", bengali: "Bengali", hindi: "Hindi", nepali: "Nepali", odia: "Odia", english: "English", other: "Other" };

export type VerseEditorProps = {
  book: { code: string; abbrev: string; title: string; verseLabel: string; verseLanguage: string };
  verse: {
    id: number;
    key: string;
    verseNo: string;
    devanagari: string;
    iast: string;
    speaker: string;
    language: string;
    status: string;
    dailyEligible: boolean;
    divisionId: number;
  };
  publicHref: string;
  divisions: { id: number; label: string }[];
  types: (CommentaryType & { isVisible: boolean })[];
  entries: { typeId: number; html: string; status: string }[];
  audio: { title: string; speaker: string; url: string }[];
  prev: { id: number; label: string } | null;
  next: { id: number; label: string } | null;
  position: string;
  canEdit: boolean;
  canWrite: boolean;
  created?: boolean;
};

export default function VerseEditor(p: VerseEditorProps) {
  const { verse: v, types, canEdit } = p;
  const [layout, setLayout] = useState<Layout>("split");
  // ONE verse text, in any script: IAST (preferred — it keeps the word breaks)
  // or Devanagari / Bengali / Odia. Every other script is derived from it.
  const nonSa0 = (v.language || p.book.verseLanguage || "sanskrit") !== "sanskrit";
  const [text, setText] = useState(nonSa0 && v.devanagari ? v.devanagari : v.iast || v.devanagari);
  // Non-Sanskrit texts (Bengali CC verses …): IAST can't be derived faithfully
  // from Bengali spelling, so an optional "IAST as printed" may be given too.
  const [printed, setPrinted] = useState(v.devanagari && v.iast ? v.iast : "");
  const textScript = detectScript(text);
  const [speaker, setSpeaker] = useState(v.speaker);
  const [key, setKey] = useState(v.key);
  const [langSel, setLangSel] = useState(v.language);
  const lang = langSel || p.book.verseLanguage || "sanskrit";
  const isSa = lang === "sanskrit";
  const deva = textScript ? text : "";
  const iast = textScript ? (isSa ? "" : printed.trim()) : text;
  const [comm, setComm] = useState<Record<number, string>>(() => Object.fromEntries(p.entries.map((e) => [e.typeId, e.html])));
  const [dirty, setDirty] = useState(false);
  const [changed, setChanged] = useState<Set<number>>(new Set());
  const [cFilter, setCFilter] = useState("");
  const [cShow, setCShow] = useState<"all" | "empty" | "filled">("all");
  const [activeC, setActiveC] = useState<number | null>(() => {
    const list = p.types.filter((t) => t.appliesTo !== "division" && t.pane === "commentary");
    return (list.find((t) => p.entries.some((e) => e.typeId === t.id && e.html)) ?? list[0])?.id ?? null;
  });
  const [prefs, setPrefs] = useReaderPrefs();
  const formRef = useRef<HTMLDivElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const l = localStorage.getItem("scr:editor-layout") as Layout | null;
      if (l) setLayout(window.innerWidth < 1280 && l === "split" ? "edit" : l);
      else if (window.innerWidth < 1280) setLayout("edit");
    } catch {}
  }, []);
  const choose = (l: Layout) => {
    setLayout(l);
    try {
      localStorage.setItem("scr:editor-layout", l);
    } catch {}
  };

  // Ctrl/⌘+S = save, Ctrl/⌘+Enter = save & next; warn before leaving with unsaved edits
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.closest("form")?.requestSubmit();
      } else if (e.key === "Enter" && nextBtn.current) {
        e.preventDefault();
        nextBtn.current.click();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const onSubmit = () => {
      setDirty(false);
      setChanged(new Set());
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [dirty]);

  const preview: VerseData = useMemo(
    () => ({
      id: v.id,
      key,
      verseNo: v.verseNo,
      devanagari: deva,
      iast,
      speaker,
      language: lang,
      c: Object.fromEntries(Object.entries(comm).filter(([, h]) => h && h !== "<p></p>")) as Record<number, string>,
      audio: [],
    }),
    [v.id, v.verseNo, key, deva, iast, speaker, comm, lang]
  );
  const verseTypes = types.filter((t) => t.appliesTo !== "division");
  const companions = verseTypes.filter((t) => t.pane !== "commentary");
  const comments = verseTypes.filter((t) => t.pane === "commentary");
  const filled = (id: number) => (comm[id] ?? "").replace(/<[^>]+>/g, "").trim();
  const ROLE: Record<string, string> = { anvaya: "Anvaya", translation: "Translation", verse: "Synonyms" };
  const LNG: Record<string, string> = { sanskrit: "Sanskrit", english: "English — not converted", bengali: "Bengali", hindi: "Hindi", nepali: "Nepali", odia: "Odia", other: "Other" };
  const field = (t: (typeof verseTypes)[number]) => {
    const e = p.entries.find((x) => x.typeId === t.id);
    return (
      <div key={t.id}>
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">
            {t.name}
            {t.author && <span className="font-normal text-[var(--a-fg-muted)]"> · {t.author}</span>}
            {ROLE[t.pane] && ROLE[t.pane] !== t.name && <span className="ml-2 text-xs font-normal text-[var(--a-fg-muted)]">({ROLE[t.pane]})</span>}
            <span className="ml-2 rounded-full bg-[var(--a-muted)] px-1.5 py-0.5 text-[10px] font-normal text-[var(--a-fg-muted)]">{LNG[t.language] ?? t.language}</span>
            {!t.isVisible && <span className="ml-2 text-xs font-normal text-[var(--a-danger)]">(hidden on the site)</span>}
          </span>
          {canEdit ? (
            <select name={`cs_${t.id}`} defaultValue={e?.status ?? "published"} className="rounded-md border border-[var(--a-border)] bg-[var(--a-card)] px-2 py-1 text-xs">
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          ) : (
            <span className="text-xs text-[var(--a-fg-muted)]">Your edit is saved as a draft</span>
          )}
        </div>
        <RichTextEditor
          name={`c_${t.id}`}
          defaultValue={e?.html ?? ""}
          devanagari={t.language !== "english"}
          minHeight={t.pane === "commentary" ? 160 : 90}
          placeholder={t.description || `${t.name}…`}
          onChange={(h) => {
            setComm((c) => ({ ...c, [t.id]: h }));
            setChanged((x) => new Set(x).add(t.id));
            setDirty(true);
          }}
        />
      </div>
    );
  };
  const refLabel = `${p.book.abbrev ? p.book.abbrev + " " : ""}${v.verseNo}`;



  const editor = (
    <div ref={formRef} className="grid gap-6" onInput={() => setDirty(true)}>
      <section className="a-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-semibold">{p.book.verseLabel}</h2>
          <span className="text-xs text-[var(--a-fg-muted)]">“/” = line break</span>
        </div>
        <fieldset disabled={!canEdit} className="grid gap-4 disabled:opacity-70">
          <div className="grid gap-4 sm:grid-cols-[7rem_9rem_1fr]">
            <Field label="Number" hint="12 or 16-18">
              <input name="key" required value={key} onChange={(e) => setKey(e.target.value)} className={`${inputCls} font-semibold`} />
            </Field>
            <Field label="Shown as" hint="Blank = automatic">
              <input name="verseNo" defaultValue={v.verseNo} className={inputCls} />
            </Field>
            <Field label="Status">
              <select name="status" defaultValue={v.status} className={inputCls}>
                <option value="published">Published</option>
                <option value="draft">Draft (hidden)</option>
                <option value="archived">Archived (hidden)</option>
              </select>
            </Field>
          </div>
          <div>
            <Field
              label={`${p.book.verseLabel} text`}
              hint="Type or paste it ONCE, in any script. IAST is best: from IAST the other scripts are made with the words joined as printed (karma-phala-hetur bhūr → कर्मफलहेतुर्भूर्). From Devanagari, IAST shows without word breaks."
            >
              <textarea
                rows={Math.max(3, lines(text).length + 1)}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setDirty(true);
                }}
                lang={textScript ? "sa-Deva" : "sa-Latn"}
                className={`${inputCls} text-lg leading-relaxed ${textScript ? "font-devanagari" : ""}`}
                placeholder="dharma-kṣetre kuru-kṣetre / samavetā yuyutsavaḥ"
              />
            </Field>
            {!isSa && textScript && (
              <div className="mt-3">
                <Field label="IAST as printed (optional)" hint="For Bengali / Hindi texts: the transliteration exactly as in the book (e.g. “doyā koro more”). Left empty, it is made from the original script.">
                  <textarea
                    rows={Math.max(2, lines(printed).length + 1)}
                    value={printed}
                    onChange={(e) => {
                      setPrinted(e.target.value);
                      setDirty(true);
                    }}
                    lang="sa-Latn"
                    className={`${inputCls} italic`}
                  />
                </Field>
              </div>
            )}
            <input type="hidden" name="devanagari" value={deva} />
            <input type="hidden" name="iast" value={iast} />
            {text.trim() && (
              <div className="mt-3 grid gap-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-muted)]/40 p-3 sm:grid-cols-2">
                {(["devanagari", "iast", "bengali", "oriya"] as const).map((sc) => (
                  <div key={sc} className="min-w-0">
                    <p className="mb-0.5 text-[11px] font-medium text-[var(--a-fg-muted)]">{SCRIPT_LABELS[sc]}</p>
                    <VerseLinesIn sanskrit={isSa} devanagari={deva} iast={iast} script={sc} size="md" className="!text-base" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Language of this verse" hint="Only Sanskrit is converted freely between scripts.">
              <select name="language" value={langSel} onChange={(e) => setLangSel(e.target.value)} className={inputCls}>
                <option value="">Book default ({LANG_LABEL[p.book.verseLanguage] ?? p.book.verseLanguage})</option>
                {Object.entries(LANG_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Speaker (optional)" hint="If kept apart from the verse, e.g. “śrī-bhagavān uvāca”.">
              <input name="speaker" value={speaker} onChange={(e) => setSpeaker(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Chapter / division">
              <select name="divisionId" defaultValue={v.divisionId} className={inputCls}>
                {p.divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="dailyEligible" defaultChecked={v.dailyEligible} /> Suitable for Verse of the Day
          </label>
        </fieldset>
      </section>

      {companions.length > 0 && (
        <section className="a-card overflow-hidden">
          <div className="border-b border-[var(--a-border)] bg-amber-500/5 px-5 py-3 sm:px-6">
            <h2 className="font-semibold">With the verse</h2>
            <p className="text-xs text-[var(--a-fg-muted)]">Synonyms, anvaya, translation — shown right under the verse, each in its own design.</p>
          </div>
          <div className="grid gap-7 p-5 sm:p-6">{companions.map(field)}</div>
        </section>
      )}

      <section className="a-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--a-border)] px-5 py-3 sm:px-6">
          <div>
            <h2 className="font-semibold">Commentaries</h2>
            <p className="text-xs text-[var(--a-fg-muted)]">Purports, ṭīkās — the commentary pane, with a switcher.</p>
          </div>
          {canEdit && (
            <Link href={`/admin/scriptures/${p.book.code}/commentaries`} className="text-sm text-[var(--a-fg-muted)] underline hover:text-[var(--a-fg)]">
              Add or rename kinds
            </Link>
          )}
        </div>
        <div className="p-5 sm:p-6">
          {comments.length === 0 ? (
            <p className="text-sm text-[var(--a-fg-muted)]">No commentary kinds yet. Add a purport or a ṭīkā under Commentaries and it appears here.</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
              <div className="min-w-0">
                {comments.length > 6 && (
                  <input value={cFilter} onChange={(e) => setCFilter(e.target.value)} placeholder="Filter commentaries…" className={`${inputCls} mb-2 h-8 text-xs`} />
                )}
                <div className="mb-2 grid grid-cols-3 gap-1 rounded-lg bg-[var(--a-muted)] p-0.5 text-[11px]">
                  {(["all", "empty", "filled"] as const).map((k) => (
                    <button key={k} type="button" onClick={() => setCShow(k)} className={`rounded-md py-1 capitalize ${cShow === k ? "bg-[var(--a-card)] font-semibold shadow-sm" : "text-[var(--a-fg-muted)]"}`}>
                      {k} ({k === "all" ? comments.length : comments.filter((t) => Boolean(filled(t.id)) === (k === "filled")).length})
                    </button>
                  ))}
                </div>
                <ul className="grid max-h-[28rem] gap-0.5 overflow-y-auto lg:max-h-[60vh]">
                  {comments
                    .filter((t) => (cShow === "all" ? true : Boolean(filled(t.id)) === (cShow === "filled")))
                    .filter((t) => !cFilter.trim() || `${t.name} ${t.author}`.toLowerCase().includes(cFilter.trim().toLowerCase()))
                    .map((t) => {
                      const st = p.entries.find((x) => x.typeId === t.id)?.status;
                      const on = activeC === t.id;
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => setActiveC(t.id)}
                            className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${on ? "bg-[var(--a-primary)] text-[var(--a-primary-fg)]" : "hover:bg-[var(--a-muted)]"}`}
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${filled(t.id) ? (st === "draft" ? "border-2 border-amber-500" : "bg-[var(--a-success)]") : "ring-1 ring-inset ring-current opacity-40"}`}
                              title={filled(t.id) ? (st === "draft" ? "Draft" : "Has text") : "Empty"}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{t.name}</span>
                              {t.author && <span className={`block truncate text-[11px] ${on ? "opacity-70" : "text-[var(--a-fg-muted)]"}`}>{t.author}</span>}
                            </span>
                            {changed.has(t.id) && <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" title="Unsaved change" />}
                          </button>
                        </li>
                      );
                    })}
                </ul>
                <p className="mt-2 px-1 text-[11px] text-[var(--a-fg-muted)]">● has text · ◌ empty · amber ring = draft · amber dot = unsaved</p>
              </div>
              <div className="min-w-0">
                {comments.map((t) => (
                  <div key={t.id} className={activeC === t.id ? "" : "hidden"}>
                    {field(t)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>


    </div>
  );

  const previewPane = (
    <div className="site-tokens overflow-hidden rounded-xl border border-[var(--a-border)] shadow-[var(--a-shadow)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--fg-muted)]">
          <Eye size={14} /> Live preview
        </span>
        <ScriptPicker prefs={prefs} setPrefs={setPrefs} compact />
      </div>
      <div className="grid gap-0 2xl:grid-cols-2">
        <div className="border-b border-[var(--border)] p-5 2xl:border-b-0 2xl:border-r" style={{ fontSize: `${prefs.fontScale}rem` }}>
          <VersePane verse={preview} refLabel={refLabel} types={verseTypes} prefs={prefs} setPrefs={setPrefs} big={false} />
        </div>
        <div className="p-5" style={{ fontSize: `${prefs.commScale}rem` }}>
          <CommentaryNav bookCode={p.book.code} c={preview.c} types={verseTypes} prefs={prefs} setPrefs={setPrefs} variant="compact" />
        </div>
      </div>
    </div>
  );

  return (
    <ActionForm action={saveVerse}>
      <input type="hidden" name="id" value={v.id} />
      {p.next && <input type="hidden" name="nextId" value={p.next.id} />}

      {/* top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {p.prev ? (
            <Link href={`/admin/scriptures/v/${p.prev.id}`} className="a-btn a-btn-outline" title="Previous">
              <ChevronLeft size={15} /> {p.prev.label}
            </Link>
          ) : null}
          <span className="px-1 text-sm tabular-nums text-[var(--a-fg-muted)]">{p.position}</span>
          {p.next ? (
            <Link href={`/admin/scriptures/v/${p.next.id}`} className="a-btn a-btn-outline" title="Next">
              {p.next.label} <ChevronRight size={15} />
            </Link>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-[var(--a-border)] bg-[var(--a-card)] p-0.5" role="group" aria-label="Layout">
            {(
              [
                ["edit", PanelLeft, "Editor"],
                ["split", Columns2, "Side by side"],
                ["preview", Eye, "Preview"],
              ] as const
            ).map(([k, Icon, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => choose(k)}
                aria-pressed={layout === k}
                title={label}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium ${layout === k ? "bg-[var(--a-primary)] text-[var(--a-primary-fg)]" : "text-[var(--a-fg-muted)] hover:text-[var(--a-fg)]"}`}
              >
                <Icon size={14} /> <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <a href={p.publicHref} target="_blank" rel="noreferrer" className="a-btn a-btn-outline">
            <ExternalLink size={14} /> <span className="hidden sm:inline">On site</span>
          </a>
        </div>
      </div>

      {p.created && (
        <p className="mb-5 flex items-center gap-2 rounded-xl border border-[var(--a-success)]/30 bg-[var(--a-success)]/10 px-4 py-3 text-sm">
          <CheckCircle2 size={16} className="text-[var(--a-success)]" /> {p.book.verseLabel} {v.verseNo} was added — fill it in below.
        </p>
      )}

      <div className={layout === "split" ? "grid items-start gap-6 xl:grid-cols-2" : ""}>
        <div className={layout === "preview" ? "hidden" : ""}>{editor}</div>
        {layout !== "edit" && <div className={layout === "split" ? "xl:sticky xl:top-20" : ""}>{previewPane}</div>}
      </div>

      {p.canWrite && (
        <div className="sticky bottom-4 z-20 mt-6">
          <div className="a-card flex flex-wrap items-center gap-3 px-4 py-3 shadow-[var(--a-shadow-lg)]">
            <SubmitButton>Save {v.verseNo}</SubmitButton>
            {p.next && (
              <button ref={nextBtn} type="submit" name="then" value="next" className="a-btn a-btn-outline" onClick={() => setDirty(false)}>
                Save & next <ArrowLeftRight size={14} />
              </button>
            )}
            <span className="hidden items-center gap-1 text-xs text-[var(--a-fg-muted)] md:inline-flex">
              <Keyboard size={13} /> Ctrl/⌘ S save · Ctrl/⌘ Enter save & next
            </span>
            {dirty && <span className="ml-auto text-xs font-medium text-amber-600">Unsaved changes</span>}
          </div>
        </div>
      )}
    </ActionForm>
  );
}
