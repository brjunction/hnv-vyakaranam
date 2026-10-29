"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, GripVertical, Loader2, Pencil, Trash2 } from "lucide-react";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import {
  deleteDictSection,
  deleteDictionary,
  reprocessDictionary,
  buildMeaningForm,
  saveDictLayout,
  saveDictSection,
  setDictionaryEnabled,
  updateDictionary,
} from "@/lib/actions/dictionaries";

// Sections and dictionaries, ordered by DRAGGING (mouse or touch): drag a
// dictionary by its handle to reorder it or move it to another section;
// drag a section by its handle to reorder sections. Saved at once.

export type BoardSection = { id: number; name: string; description: string };
export type BoardDict = {
  id: number;
  name: string;
  shortName: string;
  category: string;
  source: string;
  description: string;
  isEnabled: boolean;
  wordCount: number;
  totalBytes: number;
  headwordScheme: string;
  meaningWords: string;
  sectionId: number | null;
};

const SCHEME_LABEL: Record<string, string> = {
  itrans: "ITRANS",
  iast: "IAST",
  devanagari: "Devanagari",
  hk: "Harvard-Kyoto",
  slp1: "SLP1",
  velthuis: "Velthuis",
  english: "English / other",
};

type Groups = Record<number, number[]>;
type Drag = { kind: "dict" | "section"; id: number; label: string; x: number; y: number };
type Target = { kind: "dict"; section: number; index: number } | { kind: "section"; index: number } | null;

export default function DictBoard({ sections: initialSections, dicts, canEdit }: { sections: BoardSection[]; dicts: BoardDict[]; canEdit: boolean }) {
  const byId = useMemo(() => new Map(dicts.map((d) => [d.id, d])), [dicts]);
  const [sections, setSections] = useState(initialSections);
  const [groups, setGroups] = useState<Groups>(() => {
    const g: Groups = { 0: [] };
    for (const s of initialSections) g[s.id] = [];
    for (const d of dicts) (g[d.sectionId && g[d.sectionId] ? d.sectionId : 0] ??= []).push(d.id);
    return g;
  });
  const [enabled, setEnabled] = useState<Record<number, boolean>>(() => Object.fromEntries(dicts.map((d) => [d.id, d.isEnabled])));
  const [drag, setDrag] = useState<Drag | null>(null);
  const [target, setTarget] = useState<Target>(null);
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [editSec, setEditSec] = useState<number | null>(null);
  const [closed, setClosed] = useState<Set<number>>(new Set());
  const tRef = useRef<Target>(null);
  tRef.current = target;

  // keep in sync when the server sends a new list (after add / delete)
  useEffect(() => {
    setSections(initialSections);
    const g: Groups = { 0: [] };
    for (const s of initialSections) g[s.id] = [];
    for (const d of dicts) (g[d.sectionId && g[d.sectionId] !== undefined ? d.sectionId : 0] ??= []).push(d.id);
    setGroups(g);
    setEnabled(Object.fromEntries(dicts.map((d) => [d.id, d.isEnabled])));
  }, [initialSections, dicts]);

  async function persist(secs: BoardSection[], g: Groups) {
    setStatus("saving");
    const r = await saveDictLayout({
      sections: secs.map((s) => s.id),
      dicts: [...secs.map((s) => ({ sectionId: s.id, ids: g[s.id] ?? [] })), { sectionId: 0, ids: g[0] ?? [] }],
    }).catch(() => ({ ok: false }));
    setStatus(r.ok ? "saved" : "error");
    if (r.ok) setTimeout(() => setStatus((x) => (x === "saved" ? "" : x)), 1500);
  }

  // ---- pointer drag (mouse + touch)
  function start(e: React.PointerEvent, kind: Drag["kind"], id: number, label: string) {
    if (!canEdit) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ kind, id, label, x: e.clientX, y: e.clientY });
  }
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!el) return;
      if (drag.kind === "dict") {
        const row = el.closest<HTMLElement>("[data-drow]");
        if (row) {
          const sec = Number(row.dataset.sec);
          const idx = Number(row.dataset.idx);
          const r = row.getBoundingClientRect();
          setTarget({ kind: "dict", section: sec, index: e.clientY > r.top + r.height / 2 ? idx + 1 : idx });
          return;
        }
        const list = el.closest<HTMLElement>("[data-dlist]");
        if (list) setTarget({ kind: "dict", section: Number(list.dataset.dlist), index: (groups[Number(list.dataset.dlist)] ?? []).length });
      } else {
        const sec = el.closest<HTMLElement>("[data-sblock]");
        if (sec) {
          const idx = Number(sec.dataset.sidx);
          const r = sec.getBoundingClientRect();
          setTarget({ kind: "section", index: e.clientY > r.top + Math.min(r.height / 2, 40) ? idx + 1 : idx });
        }
      }
      // auto-scroll near the edges
      if (e.clientY < 70) window.scrollBy(0, -12);
      else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 12);
    };
    const up = () => {
      const t = tRef.current;
      if (t && drag.kind === "dict" && t.kind === "dict") {
        const g: Groups = Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, [...v]]));
        let from = 0;
        for (const [k, v] of Object.entries(g)) if (v.includes(drag.id)) from = Number(k);
        const oldIdx = g[from].indexOf(drag.id);
        g[from].splice(oldIdx, 1);
        const at = from === t.section && oldIdx < t.index ? t.index - 1 : t.index;
        (g[t.section] ??= []).splice(at, 0, drag.id);
        if (JSON.stringify(g) !== JSON.stringify(groups)) {
          setGroups(g);
          void persist(sections, g);
        }
      } else if (t && drag.kind === "section" && t.kind === "section") {
        const s = [...sections];
        const oldIdx = s.findIndex((x) => x.id === drag.id);
        const [moved] = s.splice(oldIdx, 1);
        s.splice(oldIdx < t.index ? t.index - 1 : t.index, 0, moved);
        if (s.map((x) => x.id).join() !== sections.map((x) => x.id).join()) {
          setSections(s);
          void persist(s, groups);
        }
      }
      setDrag(null);
      setTarget(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    window.addEventListener("pointercancel", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.kind, drag?.id]);

  const blocks: { id: number; name: string; description: string }[] = [...sections, ...(groups[0]?.length || !sections.length ? [{ id: 0, name: "Not in a section", description: "Drag dictionaries into a section." }] : [])];
  const enabledCount = Object.values(enabled).filter(Boolean).length;

  return (
    <div className={drag ? "select-none" : ""}>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-[var(--a-fg-muted)]">
        <span>
          {dicts.length} dictionaries · {enabledCount} on · drag <GripVertical size={13} className="inline" /> to reorder or move between sections
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          {status === "saving" && (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving…
            </>
          )}
          {status === "saved" && (
            <>
              <Check size={14} className="text-[var(--a-success)]" /> Saved
            </>
          )}
          {status === "error" && <span className="text-[var(--a-danger)]">Could not save — try again.</span>}
        </span>
      </div>

      <div className="grid gap-4">
        {blocks.map((sec, si) => {
          const ids = groups[sec.id] ?? [];
          const isClosed = closed.has(sec.id);
          return (
            <div key={sec.id}>
              {target?.kind === "section" && target.index === si && <div className="mb-2 h-1 rounded-full bg-[var(--a-primary)]" />}
              <section
                data-sblock={sec.id ? "" : undefined}
                data-sidx={si}
                className={`rounded-xl border bg-[var(--a-card)] ${drag?.kind === "section" && drag.id === sec.id ? "opacity-40" : ""} ${sec.id ? "border-[var(--a-border)]" : "border-dashed border-[var(--a-border)]"}`}
              >
                <header className="flex items-center gap-2 border-b border-[var(--a-border)] px-3 py-2.5">
                  {canEdit && sec.id > 0 && (
                    <span onPointerDown={(e) => start(e, "section", sec.id, sec.name)} className="cursor-grab touch-none rounded p-1 text-[var(--a-fg-muted)] hover:bg-[var(--a-muted)] active:cursor-grabbing" title="Drag to reorder sections">
                      <GripVertical size={16} />
                    </span>
                  )}
                  <button type="button" onClick={() => setClosed((c) => (c.has(sec.id) ? new Set([...c].filter((x) => x !== sec.id)) : new Set([...c, sec.id])))} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <ChevronDown size={15} className={`shrink-0 text-[var(--a-fg-muted)] transition-transform ${isClosed ? "-rotate-90" : ""}`} />
                    <span className="truncate font-semibold">{sec.name}</span>
                    <span className="rounded-full bg-[var(--a-muted)] px-2 text-xs tabular-nums text-[var(--a-fg-muted)]">{ids.length}</span>
                    {sec.description && <span className="hidden truncate text-xs text-[var(--a-fg-muted)] md:inline">{sec.description}</span>}
                  </button>
                  {canEdit && sec.id > 0 && (
                    <button type="button" onClick={() => setEditSec(editSec === sec.id ? null : sec.id)} className="rounded p-1.5 text-[var(--a-fg-muted)] hover:bg-[var(--a-muted)]" title="Rename / delete section">
                      <Pencil size={14} />
                    </button>
                  )}
                </header>
                {editSec === sec.id && (
                  <div className="grid gap-3 border-b border-[var(--a-border)] bg-[var(--a-muted)]/40 p-3 md:grid-cols-[1fr_auto]">
                    <ActionForm action={saveDictSection} className="grid gap-2 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
                      <input type="hidden" name="id" value={sec.id} />
                      <Field label="Name">
                        <input name="name" defaultValue={sec.name} required className={inputCls} />
                      </Field>
                      <Field label="Description">
                        <input name="description" defaultValue={sec.description} className={inputCls} />
                      </Field>
                      <SubmitButton>Save</SubmitButton>
                    </ActionForm>
                    <ActionForm action={deleteDictSection} confirm={`Delete the section “${sec.name}”? Its dictionaries stay, without a section.`} className="self-end">
                      <input type="hidden" name="id" value={sec.id} />
                      <SubmitButton variant="danger">
                        <Trash2 size={14} /> Delete
                      </SubmitButton>
                    </ActionForm>
                  </div>
                )}
                {!isClosed && (
                  <ul data-dlist={sec.id} className="min-h-[2.75rem] p-1.5">
                    {ids.map((id, i) => {
                      const d = byId.get(id);
                      if (!d) return null;
                      const on = enabled[id];
                      return (
                        <li key={id}>
                          {target?.kind === "dict" && target.section === sec.id && target.index === i && <div className="mx-2 my-0.5 h-0.5 rounded-full bg-[var(--a-primary)]" />}
                          <div
                            data-drow=""
                            data-sec={sec.id}
                            data-idx={i}
                            className={`flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-[var(--a-muted)]/50 ${drag?.kind === "dict" && drag.id === id ? "opacity-40" : ""} ${on ? "" : "opacity-60"}`}
                          >
                            {canEdit && (
                              <span onPointerDown={(e) => start(e, "dict", id, d.name)} className="cursor-grab touch-none rounded p-1 text-[var(--a-fg-muted)] hover:bg-[var(--a-muted)] active:cursor-grabbing" title="Drag to reorder">
                                <GripVertical size={16} />
                              </span>
                            )}
                            <button type="button" onClick={() => setOpenId(openId === id ? null : id)} className="min-w-0 flex-1 text-left">
                              <span className="flex flex-wrap items-center gap-x-2">
                                <span className="truncate text-sm font-medium">{d.name}</span>
                                {d.category && d.category !== d.name && <span className="rounded-full border border-[var(--a-border)] px-1.5 text-[11px] text-[var(--a-fg-muted)]">{d.category}</span>}
                              </span>
                              <span className="block truncate text-xs text-[var(--a-fg-muted)]">
                                {d.wordCount.toLocaleString()} words · {(d.totalBytes / 1048576).toFixed(1)} MB · {SCHEME_LABEL[d.headwordScheme] ?? d.headwordScheme}
                              </span>
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                role="switch"
                                aria-checked={on}
                                title={on ? "Searchable — click to switch off" : "Off — click to switch on"}
                                onClick={async () => {
                                  setEnabled((x) => ({ ...x, [id]: !on }));
                                  await setDictionaryEnabled(id, !on).catch(() => setEnabled((x) => ({ ...x, [id]: on })));
                                }}
                                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-[var(--a-primary)]" : "bg-[var(--a-border)]"}`}
                              >
                                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[1.1rem]" : "left-0.5"}`} />
                              </button>
                            )}
                          </div>
                          {openId === id && canEdit && (
                            <div className="mx-2 mb-2 grid gap-5 rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] p-4 lg:grid-cols-2">
                              <ActionForm action={updateDictionary} className="grid gap-3">
                                <input type="hidden" name="id" value={d.id} />
                                {on && <input type="hidden" name="isEnabled" value="on" />}
                                <Field label="Name">
                                  <input name="name" defaultValue={d.name} required className={inputCls} />
                                </Field>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <Field label="Short name" hint="e.g. MW, Apte">
                                    <input name="shortName" defaultValue={d.shortName} maxLength={24} className={inputCls} />
                                  </Field>
                                  <Field label="Section">
                                    <select name="sectionId" defaultValue={d.sectionId ?? ""} className={inputCls}>
                                      <option value="">— none —</option>
                                      {sections.map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.name}
                                        </option>
                                      ))}
                                    </select>
                                  </Field>
                                </div>
                                <Field label="Work" hint="Files of the same work (e.g. three copies of Monier-Williams) are shown as ONE card, their entries merged.">
                                  <input name="category" defaultValue={d.category} className={inputCls} />
                                </Field>
                                <Field label="Source / licence">
                                  <input name="source" defaultValue={d.source} className={inputCls} />
                                </Field>
                                <Field label="Description">
                                  <textarea name="description" rows={2} defaultValue={d.description} className={inputCls} />
                                </Field>
                                <div>
                                  <SubmitButton>Save</SubmitButton>
                                </div>
                              </ActionForm>
                              <div className="grid content-start gap-5">
                                <ActionForm action={reprocessDictionary} className="grid gap-3">
                                  <input type="hidden" name="id" value={d.id} />
                                  <Field label="Headwords are written in" hint="If search results look wrong, change this and prepare again.">
                                    <select name="scheme" defaultValue={d.headwordScheme} className={inputCls}>
                                      {Object.entries(SCHEME_LABEL).map(([v, l]) => (
                                        <option key={v} value={v}>
                                          {l}
                                        </option>
                                      ))}
                                    </select>
                                  </Field>
                                  <div>
                                    <SubmitButton variant="ghost">Prepare search again</SubmitButton>
                                  </div>
                                </ActionForm>
                                <ActionForm action={buildMeaningForm} className="grid gap-2">
                                  <input type="hidden" name="id" value={d.id} />
                                  <p className="text-xs text-[var(--fg-muted)]">
                                    {d.meaningWords ? `Meaning search is ready (${Number(d.meaningWords).toLocaleString()} words).` : "Meaning search is not built yet."}
                                  </p>
                                  <div>
                                    <SubmitButton variant="ghost">{d.meaningWords ? "Rebuild meaning search" : "Build meaning search"}</SubmitButton>
                                  </div>
                                </ActionForm>
                                <ActionForm action={deleteDictionary} confirm={`Delete “${d.name}” and its files?`}>
                                  <input type="hidden" name="id" value={d.id} />
                                  <SubmitButton variant="danger">Delete dictionary</SubmitButton>
                                </ActionForm>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                    {target?.kind === "dict" && target.section === sec.id && target.index === ids.length && <li className="mx-2 my-0.5 h-0.5 rounded-full bg-[var(--a-primary)]" />}
                    {!ids.length && <li className="px-3 py-2 text-xs text-[var(--a-fg-muted)]">Drop dictionaries here.</li>}
                  </ul>
                )}
              </section>
            </div>
          );
        })}
        {target?.kind === "section" && target.index === blocks.length && <div className="h-1 rounded-full bg-[var(--a-primary)]" />}
      </div>

      {drag && (
        <div className="pointer-events-none fixed z-[200] rounded-lg border border-[var(--a-primary)] bg-[var(--a-card)] px-3 py-1.5 text-sm font-medium shadow-xl" style={{ left: drag.x + 14, top: drag.y - 14 }}>
          {drag.label}
        </div>
      )}
    </div>
  );
}
