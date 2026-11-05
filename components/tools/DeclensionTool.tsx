"use client";

import { useEffect, useMemo, useState } from "react";
import type { ConjAttested, NamaAttested } from "@/lib/grammar/attested";
import Link from "next/link";
import Sanscript from "@indic-transliteration/sanscript";
import { CASES, ENDINGS, NUMBERS as NUM_N, decline, gendersFor, stemFromForm, type Cell } from "@/lib/grammar/nama";
import { conjugate, rootOf, GANA_NAMES, PERSONS, EXTRA_DHATUS, type DhatuRow } from "@/lib/grammar/dhatu";
import dhatus from "@/lib/data/static/dhatus.json";
import sutras from "@/lib/data/static/madhyama-sutras.json";
import { useFeatures } from "@/components/FeaturesProvider";

// Declensions — nāma (śabda-rūpa) and dhātu (dhātu-rūpa), every form with the
// Madhyama sūtras that make it. Click a form to see its sūtras.
const S = sutras as Record<string, { t: string; p: string }>;
const isDeva = (s: string) => /[ऀ-ॿ]/.test(s);
const toIast = (s: string) => (isDeva(s) ? Sanscript.t(s, "devanagari", "iast") : s).normalize("NFC").replace(/ṃ/g, "ṁ").trim().toLowerCase();
const deva = (s: string) => Sanscript.t(s.replace(/ṁ/g, "ṃ"), "iast", "devanagari");
const G = { m: "Puruṣottama (masc.)", f: "Lakṣmī (fem.)", n: "Brahma (neut.)" } as const;
const NAMA_EX = ["rāma", "jñāna", "ramā", "hari", "mati", "guru", "vāri", "madhu", "nadī", "vadhū", "pitṛ", "dātṛ", "mātṛ", "rājan", "ātman", "nāman", "yogin", "bhagavat", "manas", "marut", "vāc", "sarva", "tad", "yad", "kim", "idam", "adas", "yuṣmad", "asmad", "sakhi", "pati", "go", "pathin", "tri", "catur"];
const DHATU_EX = ["bhū", "gam", "nī", "budh", "labh", "sev", "vad", "div", "tud", "likh", "cur", "katha", "as", "brū", "i", "han", "duh", "hu", "dā", "su", "rudh", "yuj", "kṛ", "tan", "krī", "jñā"];

function SutraList({ list, head }: { list: number[]; head?: string }) {
  return (
    <div className="mt-3 rounded-xl border border-[var(--accent)]/40 bg-[var(--bg-2)] p-4 text-sm">
      {head && <p className="mb-2 font-medium" lang="sa">{head}</p>}
      {!list.length && <p className="text-[var(--fg-muted)]">The ending is added with no further change.</p>}
      <ol className="grid gap-1.5">
        {list.map((n, i) => (
          <li key={i}>
            <Link href={`/sutras/${n}`} className="font-medium text-[var(--accent)] hover:underline">Sūtra {n}</Link>
            {S[n] ? <>: <i lang="sa">{S[n].t}</i>{S[n].p && <span className="block text-xs text-[var(--fg-muted)]">Pāṇini {S[n].p}</span>}</> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

const norm = (f: string) => f.normalize("NFC").replace(/ṃ/g, "ṁ").trim();
type GCell = Cell & { att?: string[] };

/** The checked forms of the grammar tables (fetched once per word). */
function useAttested<T>(kind: "nama" | "dhatu", word: string): T | null {
  const [d, setD] = useState<T | null>(null);
  useEffect(() => {
    setD(null);
    if (!word) return;
    const ac = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/grammar/forms?kind=${kind}&h=${encodeURIComponent(word)}`, { signal: ac.signal })
        .then((r) => r.json())
        .then((x) => setD(x as T))
        .catch(() => {});
    }, 250);
    return () => (clearTimeout(t), ac.abort());
  }, [kind, word]);
  return d;
}

/** Our cells with the attested forms beside them (✓ when they agree; extra attested forms added). */
function withAtt(cells: Cell[][], att?: string[][][]): GCell[][] {
  if (!att) return cells;
  return cells.map((r, i) => r.map((c, j) => ({ ...c, att: att[i]?.[j] ?? [] })));
}

function Grid({ rows, cols, cells, script, onPick, picked }: { rows: string[]; cols: string[]; cells: GCell[][]; script: "iast" | "deva"; onPick: (i: number, j: number) => void; picked: [number, number] | null }) {
  const show = (f: string) => (script === "deva" ? deva(f) : f);
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)]">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="bg-[var(--bg-2)]">
          <tr>
            <th className="p-2 text-left font-medium text-[var(--fg-muted)]" />
            {cols.map((c) => <th key={c} className="p-2 text-left font-medium">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {cells.map((r, i) => (
            <tr key={i} className="border-t border-[var(--border)]">
              <th className="whitespace-nowrap p-2 text-left font-medium text-[var(--fg-muted)]">{rows[i]}</th>
              {r.map((c, j) => {
                const att = (c.att ?? []).map(norm);
                const ours = c.forms.map(norm);
                const extra = att.filter((f) => !ours.includes(f));
                const agree = att.length > 0 && ours.length > 0 && ours.every((f) => att.includes(f));
                return (
                  <td key={j} className="p-1">
                    <button type="button" onClick={() => onPick(i, j)} className={`w-full rounded-lg px-2 py-1.5 text-left hover:bg-[var(--bg-2)] ${picked?.[0] === i && picked?.[1] === j ? "bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]" : ""}`} lang="sa">
                      <span className={script === "deva" ? "font-devanagari text-base" : ""}>{ours.map(show).join(" / ")}</span>
                      {agree && <span className="ml-1 text-xs text-green-600" title="Confirmed by the grammar tables">✓</span>}
                      {extra.length > 0 && (
                        <span className={`${ours.length ? "ml-1 " : ""}italic text-[var(--fg-muted)] ${script === "deva" ? "font-devanagari text-base" : ""}`} title="Also in use (from the grammar tables)">
                          {ours.length ? "· " : ""}
                          {extra.map(show).join(" / ")}
                        </span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Nama({ script }: { script: "iast" | "deva" }) {
  const [q, setQ] = useState("rāma");
  const stem = stemFromForm(toIast(q));
  const attN = useAttested<{ nama: NamaAttested[] }>("nama", stem);
  const gs = [...new Set([...gendersFor(stem), ...(attN?.nama ?? []).map((x) => x.gender)])] as ("m" | "f" | "n")[];
  const [g0, setG] = useState<"m" | "f" | "n">("m");
  const g = gs.includes(g0) ? g0 : gs[0];
  const [pick, setPick] = useState<[number, number] | null>(null);
  const t0 = useMemo(() => (stem ? decline(stem, g) : null), [stem, g]);
  const attT = attN?.nama.find((x) => x.gender === g);
  // no derivation yet but the forms are known: show them
  const t = t0 && "error" in t0 && attT ? { stem, gender: g, cls: "", label: "Forms in use (their derivation is coming)", cells: attT.cells.map((r) => r.map((f) => ({ forms: [] as string[], sutras: [] as number[] }))) as Cell[][], note: undefined } : t0;
  return (
    <div>
      <input value={q} onChange={(e) => (setQ(e.target.value), setPick(null))} placeholder="Type a nāma (stem): rāma, hari, nadī, rājan …" className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-lg shadow-sm" lang="sa" />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {NAMA_EX.map((x) => (
          <button key={x} type="button" onClick={() => (setQ(x), setPick(null))} className={`rounded-full border px-2.5 py-0.5 text-xs ${stem === x ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]"}`} lang="sa">{x}</button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {gs.map((x) => (
          <button key={x} type="button" onClick={() => (setG(x), setPick(null))} className={`rounded-lg border px-3 py-1 text-sm ${g === x ? "border-[var(--accent)] bg-[var(--accent)] font-medium text-[var(--color-ink)]" : "border-[var(--border)]"}`}>{G[x]}</button>
        ))}
      </div>
      {t && "error" in t && <p className="mt-4 text-sm text-[var(--fg-muted)]">{t.error}</p>}
      {t && !("error" in t) && (
        <>
          <p className="mt-4 text-sm"><b lang="sa">{t.stem}</b> · {t.label}</p>
          {t.note && <p className="mt-1 text-sm text-[var(--fg-muted)]">{t.note}</p>}
          <Grid rows={CASES.slice(0, t.cells.length)} cols={NUM_N.slice(0, t.cells[0].length)} cells={withAtt(t.cells, attT?.cells.slice(0, t.cells.length).map((r) => r.slice(0, t.cells[0].length)))} script={script} onPick={(i, j) => setPick([i, j])} picked={pick} />
          {pick && t.cells[pick[0]]?.[pick[1]] && (
            <SutraList list={t.cls ? [90, ...t.cells[pick[0]][pick[1]].sutras.filter((x) => x !== 90)] : []} head={`${t.stem} + ${ENDINGS[pick[0]][pick[1]]} → ${t.cells[pick[0]][pick[1]].forms.join(" / ")}  (${CASES[pick[0]]}, ${NUM_N[pick[1]]})`} />
          )}
          {!pick && <p className="mt-2 text-xs text-[var(--fg-muted)]">Click any form to see the sūtras that make it.</p>}
        </>
      )}
    </div>
  );
}

function Dhatu({ script }: { script: "iast" | "deva" }) {
  const rows = useMemo(() => [...(dhatus as DhatuRow[]), ...EXTRA_DHATUS], []);
  const [q, setQ] = useState("bhū");
  const [sel, setSel] = useState<number | null>(null);
  const [tense, setTense] = useState("lat");
  const [pick, setPick] = useState<[number, number] | null>(null);
  const key = toIast(q).replace(/^ṣ/, "s").replace(/^ṇ/, "n");
  const matches = useMemo(() => {
    if (!key) return [];
    const exact = rows.map((r, i) => ({ r, i, root: rootOf(r.d).root })).filter((x) => x.root === key || x.root === `${key}a` || x.r.d.split(/\s+/)[0].replace(/\[[^\]]*\]/g, "") === key);
    if (exact.length) return exact.sort((x, y) => (y.r.g === 8 && y.root === "kṛ" ? 1 : 0) - (x.r.g === 8 && x.root === "kṛ" ? 1 : 0));
    return rows.map((r, i) => ({ r, i, root: rootOf(r.d).root })).filter((x) => x.root.startsWith(key) || x.r.e.toLowerCase().includes(key)).slice(0, 20);
  }, [key, rows]);
  const chosen = sel ?? (matches.find((m) => [1, 4, 6, 10].includes(m.r.g))?.i ?? matches[0]?.i ?? null);
  const c = chosen != null ? conjugate(rows[chosen]) : null;
  const rootKey = chosen != null ? rootOf(rows[chosen].d).root : "";
  const attD = useAttested<{ conj: ConjAttested[] }>("dhatu", rootKey);
  const gana = chosen != null ? rows[chosen].g : 0;
  const prim = attD?.conj.filter((x) => x.kind === "primary") ?? [];
  const primary = prim.find((x) => x.gana === gana) ?? (prim.length === 1 ? prim[0] : undefined);
  const attOf = (key: string, voice: string) => primary?.tenses.find((x) => x.tense === key && x.voice === voice)?.cells;
  const [kind, setKind] = useState("primary");
  const derived = (attD?.conj ?? []).filter((x) => x.kind !== "primary");
  const KIND: Record<string, { name: string; sutra: number }> = { causative: { name: "Ṇic (causative)", sutra: 569 }, desiderative: { name: "San (desiderative)", sutra: 578 }, intensive: { name: "Yaṅ (intensive)", sutra: 586 } };
  const TN: Record<string, string> = { lat: "acyuta (laṭ)", lan: "bhūteśvara (laṅ)", lot: "vidhātā (loṭ)", lin: "vidhi (vidhi-liṅ)", lrt: "kalki (lṛṭ)", lrn: "ajita (lṛṅ)", lut: "bāla-kalki (luṭ)", lit: "adhokṣaja (liṭ)", lun: "bhūteśa (luṅ)", asir: "kāmapāla (āśīr-liṅ)", inj: "bhūteśa without at" };
  const VN: Record<string, string> = { active: "Parapada", middle: "Ātmapada", passive: "Karmaṇi (passive, Sūtras 286, 293)" };
  const tables = c && !("error" in c) ? c.tables : [];
  const keys = [...new Set(tables.map((t) => t.key))];
  const cur = tables.filter((t) => t.key === tense);
  return (
    <div>
      <input value={q} onChange={(e) => (setQ(e.target.value), setSel(null), setPick(null))} placeholder="Type a dhātu (bhū, gam, labh …) or an English meaning" className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-lg shadow-sm" lang="sa" />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {DHATU_EX.map((x) => (
          <button key={x} type="button" onClick={() => (setQ(x), setSel(null), setPick(null))} className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]" lang="sa">{x}</button>
        ))}
      </div>
      {matches.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {matches.map((m) => (
            <li key={m.i}>
              <button type="button" onClick={() => (setSel(m.i), setPick(null))} className={`rounded-lg border px-3 py-1.5 text-left text-sm ${chosen === m.i ? "border-[var(--accent)] bg-[var(--bg-2)]" : "border-[var(--border)]"}`}>
                <b lang="sa">{m.r.d.split(/\s+/)[0]}</b> <span className="text-[var(--fg-muted)]">· {GANA_NAMES[m.r.g]} {m.r.g} · {m.r.p === "P" ? "parapadī" : m.r.p === "A" ? "ātmapadī" : "ubhayapadī"} · {m.r.i} · {m.r.e}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {key && !matches.length && <p className="mt-3 text-sm text-[var(--fg-muted)]">Not in the Dhātu-saṅgraha.</p>}
      {c && "error" in c && <p className="mt-4 text-sm">{c.error}</p>}
      {c && !("error" in c) && (
        <>
          <p className="mt-4 text-sm">
            Stem <b lang="sa">{c.stem}</b>: {c.stemSteps.map((s) => (s.sutra ? `${s.change} (Sūtra ${s.sutra})` : s.change)).join(" · ")}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {keys.map((k) => {
              const t = tables.find((x) => x.key === k)!;
              return (
                <button key={k} type="button" onClick={() => (setTense(k), setPick(null))} className={`rounded-lg border px-3 py-1 text-sm ${tense === k ? "border-[var(--accent)] bg-[var(--accent)] font-medium text-[var(--color-ink)]" : "border-[var(--border)]"}`}>
                  {t.hnv} <span className="opacity-70">· {t.name}</span>
                </button>
              );
            })}
          </div>
          {derived.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5 text-sm">
              {["primary", ...derived.map((x) => x.kind)].map((k) => (
                <button key={k} type="button" onClick={() => (setKind(k), setPick(null))} className={`rounded-full border px-3 py-0.5 ${kind === k ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--fg-muted)]"}`}>
                  {k === "primary" ? "Kevala (the dhātu itself)" : KIND[k]?.name ?? k}
                </button>
              ))}
            </div>
          )}
          {kind !== "primary" &&
            (() => {
              const d = derived.find((x) => x.kind === kind);
              if (!d) return null;
              return (
                <section>
                  <SutraList list={[KIND[kind]?.sutra].filter(Boolean) as number[]} />
                  {d.tenses.map((t, ti) => (
                    <div key={ti}>
                      <h3 className="mt-5 font-semibold">{TN[t.tense] ?? t.tense} · {VN[t.voice]}</h3>
                      <Grid rows={PERSONS} cols={["eka-vacana", "dvi-vacana", "bahu-vacana"]} cells={t.cells.map((r) => r.map(() => ({ forms: [] as string[], sutras: [] as number[] }))).map((r, i) => r.map((x, j) => ({ ...x, att: t.cells[i][j] })))} script={script} onPick={() => {}} picked={null} />
                    </div>
                  ))}
                </section>
              );
            })()}
          {kind === "primary" && cur.map((t, ti) => (
            <section key={t.pada}>
              <h3 className="mt-5 font-semibold">{t.pada === "para" ? "Parapada" : "Ātmapada"}</h3>
              {t.note && <p className="text-sm text-[var(--fg-muted)]">{t.note}</p>}
              <Grid rows={PERSONS} cols={["eka-vacana", "dvi-vacana", "bahu-vacana"]} cells={withAtt(t.cells, attOf(t.key, t.pada === "para" ? "active" : "middle"))} script={script} onPick={(i, j) => setPick([ti * 10 + i, j])} picked={pick && Math.floor(pick[0] / 10) === ti ? [pick[0] % 10, pick[1]] : null} />
              {pick && Math.floor(pick[0] / 10) === ti && <SutraList list={t.cells[pick[0] % 10][pick[1]].sutras} head={`${t.cells[pick[0] % 10][pick[1]].forms.join(" / ")}  (${t.hnv}, ${PERSONS[pick[0] % 10]}, ${["eka", "dvi", "bahu"][pick[1]]}-vacana)`} />}
            </section>
          ))}
          {kind === "primary" && attOf(tense, "passive") && (
            <section>
              <h3 className="mt-5 font-semibold">{VN.passive}</h3>
              <Grid rows={PERSONS} cols={["eka-vacana", "dvi-vacana", "bahu-vacana"]} cells={attOf(tense, "passive")!.map((r) => r.map((f) => ({ forms: [] as string[], sutras: [] as number[], att: f })))} script={script} onPick={() => {}} picked={null} />
            </section>
          )}
          {(() => {
            const src = kind === "primary" ? primary : derived.find((x) => x.kind === kind);
            if (!src || (!src.participles.length && !src.indeclinables.length)) return null;
            return (
              <section className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] p-4">
                  <h3 className="font-semibold">Kṛdanta (participles)</h3>
                  <ul className="mt-2 grid gap-1 text-sm">
                    {src.participles.map((p, i) => (
                      <li key={i}>
                        <span className="text-[var(--fg-muted)]">{p.name}:</span> <span lang="sa" className={script === "deva" ? "font-devanagari" : ""}>{p.forms.map((f) => (script === "deva" ? f.replace(/^\S+/, (w) => deva(w)) : f)).join(" · ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-[var(--border)] p-4">
                  <h3 className="font-semibold">Avyaya (infinitive, absolutive)</h3>
                  <ul className="mt-2 grid gap-1 text-sm">
                    {src.indeclinables.map((p, i) => (
                      <li key={i}>
                        <span className="text-[var(--fg-muted)]">{p.name}:</span> <span lang="sa" className={script === "deva" ? "font-devanagari" : ""}>{p.forms.map((f) => (script === "deva" ? deva(f) : f)).join(" · ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })()}
          <ul className="mt-4 grid gap-1 text-sm text-[var(--fg-muted)]">
            {c.notes.map((n) => <li key={n}>· {n}</li>)}
            {primary && <li>· ✓ marks forms confirmed by the grammar tables; forms in italics are also in use.</li>}
          </ul>
        </>
      )}
    </div>
  );
}

export default function DeclensionTool() {
  const f = useFeatures();
  const tabs = (["nama", "dhatu"] as const).filter((t) => f[t === "nama" ? "tool-nama" : "tool-dhatu"]);
  const [tab0, setTab] = useState<"nama" | "dhatu">("nama");
  const tab = tabs.includes(tab0) ? tab0 : tabs[0] ?? "nama";
  const [script, setScript] = useState<"iast" | "deva">("iast");
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1 text-sm">
          {tabs.map((m) => (
            <button key={m} type="button" onClick={() => setTab(m)} className={`rounded-lg px-4 py-1.5 ${tab === m ? "bg-[var(--accent)] font-medium text-[var(--color-ink)]" : "text-[var(--fg-muted)]"}`}>
              {m === "nama" ? "Nāma (śabda-rūpa)" : "Dhātu (dhātu-rūpa)"}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-xl border border-[var(--border)] p-1 text-sm">
          {(["iast", "deva"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setScript(s)} className={`rounded-lg px-3 py-1 ${script === s ? "bg-[var(--bg-2)] font-medium" : "text-[var(--fg-muted)]"}`}>{s === "iast" ? "IAST" : "देवनागरी"}</button>
          ))}
        </div>
      </div>
      <div className="mt-5">{tab === "nama" ? <Nama script={script} /> : <Dhatu script={script} />}</div>
    </div>
  );
}
