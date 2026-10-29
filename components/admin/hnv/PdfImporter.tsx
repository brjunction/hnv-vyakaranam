"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { extractPage, type Line, type PdfDoc } from "@/lib/hnv/pdf-extract";
import { analyseVolume, crossCheck, toItems, type Analysis, type ImportItem } from "@/lib/hnv/pdf-import";
import { finishPdfImport, importPdfBatch, type ItemResult } from "@/lib/actions/hnv-pdf";

// Admin › Chapters & sūtras › Import from PDF.
// 1. The PDF is read here, in the browser (nothing is uploaded): every page's text
//    with its typography, the Balarama letters turned into IAST.
// 2. It is cut into sūtras (number, text, synonyms, translation, vṛtti,
//    commentaries, footnotes, tables) and checked; the report is shown.
// 3. "Preview" sends the sūtras to the server in small batches as a dry run:
//    nothing is written, the result lists what would change.
// 4. "Import" does the same for real. Every change is kept in the revision
//    history of each sūtra, so it can be undone.

type FileState = {
  name: string;
  pages: number;
  done: number;
  analysis: Analysis | null;
  error: string;
};
type Phase = "idle" | "reading" | "ready" | "previewing" | "previewed" | "importing" | "imported";

const BATCH = 20;
const FIELD_LABEL = { sutra: "Sūtra text", synonyms: "Synonyms", translation: "Translation", vrtti: "Vṛtti", commentaries: "Commentaries & introductions" } as const;
type FieldKey = keyof typeof FIELD_LABEL;

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}

export default function PdfImporter({ edition, editionName }: { edition: string; editionName: string }) {
  const [files, setFiles] = useState<FileState[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fields, setFields] = useState<Record<FieldKey, boolean>>({ sutra: true, synonyms: true, translation: true, vrtti: true, commentaries: true });
  const [replace, setReplace] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ItemResult[]>([]);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const items: ImportItem[] = useMemo(() => {
    const map = new Map<string, ImportItem>();
    for (const f of files) if (f.analysis) for (const it of toItems(f.analysis)) map.set(it.number, it);
    return [...map.values()].sort((a, b) => order(a.number) - order(b.number));
  }, [files]);

  async function read(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    setResults([]);
    setPhase("reading");
    const pdfjs = await loadPdfjs();
    const states: FileState[] = [...list].map((f) => ({ name: f.name, pages: 0, done: 0, analysis: null, error: "" }));
    setFiles(states);
    for (let k = 0; k < list.length; k++) {
      const file = list[k];
      try {
        const doc = (await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), verbosity: 0 }).promise) as unknown as PdfDoc;
        states[k] = { ...states[k], pages: doc.numPages };
        setFiles([...states]);
        const lines: Line[] = [];
        for (let p = 1; p <= doc.numPages; p++) {
          lines.push(...(await extractPage(doc, p)));
          if (p % 10 === 0 || p === doc.numPages) {
            states[k] = { ...states[k], done: p };
            setFiles([...states]);
          }
        }
        states[k] = { ...states[k], analysis: analyseVolume(lines, doc.numPages) };
      } catch (err) {
        states[k] = { ...states[k], error: `Could not read this PDF: ${(err as Error).message}` };
      }
      setFiles([...states]);
    }
    setPhase("ready");
  }

  async function run(dryRun: boolean) {
    setError("");
    setPhase(dryRun ? "previewing" : "importing");
    setProgress({ done: 0, total: items.length });
    const out: ItemResult[] = [];
    for (let i = 0; i < items.length; i += BATCH) {
      const batch = items.slice(i, i + BATCH);
      let r = await importPdfBatch({ edition, dryRun, replace, fields, items: batch }).catch((e: Error) => ({ ok: false, message: e.message, results: [] }));
      if (!r.ok) r = await importPdfBatch({ edition, dryRun, replace, fields, items: batch }).catch((e: Error) => ({ ok: false, message: e.message, results: [] })); // one retry
      if (!r.ok) {
        setError(`Stopped at sūtra ${batch[0].number}: ${r.message ?? "the server did not answer"}. ${dryRun ? "" : "Everything before it was imported; run the import again to continue (already imported sūtras show as unchanged)."}`);
        setResults(out);
        setPhase(dryRun ? "ready" : "previewed");
        return;
      }
      out.push(...r.results);
      setProgress({ done: Math.min(i + BATCH, items.length), total: items.length });
    }
    setResults(out);
    if (!dryRun) await finishPdfImport();
    setPhase(dryRun ? "previewed" : "imported");
  }

  const reading = phase === "reading";
  const busy = phase === "reading" || phase === "previewing" || phase === "importing";
  const all = files.map((f) => f.analysis).filter((a): a is Analysis => !!a);
  const warnings = all.flatMap((a) => a.blocks.filter((b) => b.warnings.length).map((b) => ({ n: b.number, w: b.warnings, pages: b.pages })));
  const issues = all.flatMap((a) => a.issues);
  const list = all.find((a) => a.list)?.list ?? null;
  const cc = crossCheck(all.flatMap((a) => a.blocks), list);

  return (
    <div className="grid gap-6">
      {/* 1 · choose */}
      <section className="a-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">1 · Choose the PDF volumes</h2>
        <p className="mt-1 text-sm text-[var(--a-fg-muted)]">
          Choose one or both volumes of the {editionName} edition. They are read here in your browser; nothing is uploaded. Reading takes about a minute per volume.
        </p>
        <input ref={input} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => read(e.target.files)} />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="a-btn a-btn-primary mt-4 inline-flex items-center gap-2">
          <Upload size={16} /> Choose PDF files
        </button>
        {files.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {files.map((f) => (
              <li key={f.name} className="rounded-lg border border-[var(--a-border)] p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <FileText size={16} /> {f.name}
                  {!f.analysis && !f.error && reading && <Loader2 size={14} className="animate-spin" />}
                </div>
                {f.pages > 0 && !f.analysis && !f.error && (
                  <div className="mt-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--a-border)]">
                      <div className="h-full bg-[var(--a-accent,var(--accent))]" style={{ width: `${(f.done / f.pages) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-[var(--a-fg-muted)]">
                      Page {f.done} of {f.pages}
                    </p>
                  </div>
                )}
                {f.error && <p className="mt-1 text-red-600">{f.error}</p>}
                {f.analysis && <FileSummary a={f.analysis} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2 · report */}
      {phase !== "idle" && !reading && all.length > 0 && (
        <section className="a-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">2 · What was found</h2>
          <p className="mt-1 text-sm">
            <b>{items.length}</b> sūtras and verses ready to import
            {items.length ? ` (${items[0].number} … ${items[items.length - 1].number})` : ""}.
          </p>
          <Counts items={items} />
          {issues.length > 0 && (
            <Box tone="warn" title="Notes from reading the PDF">
              <ul className="list-disc pl-5">{issues.map((i, k) => <li key={k}>{i}</li>)}</ul>
            </Box>
          )}
          {cc && (
            <Box tone={cc.diffs.length ? "warn" : "ok"} title="Sūtra text checked against the list of sūtras in the appendix">
              <p>
                {cc.same} identical · {cc.longer} where the list also prints a verse or heading after the sūtra · {cc.diffs.length} different.
                {cc.diffs.length > 0 && " The main text is used. Most differences are misprints in the list; check them below."}
              </p>
              {cc.diffs.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Show the {cc.diffs.length} differences</summary>
                  <ul className="mt-2 grid gap-2">
                    {cc.diffs.map((d) => (
                      <li key={d.number} className="text-xs">
                        <b>{d.number}</b> — text: <span className="font-mono">{d.body}</span>
                        <br />
                        list: <span className="font-mono">{d.list}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </Box>
          )}
          {warnings.length > 0 && (
            <Box tone="warn" title={`${warnings.length} sūtra(s) to look at after the import`}>
              <ul className="grid gap-1 text-xs">
                {warnings.map((w) => (
                  <li key={w.n}>
                    <b>{w.n}</b> (PDF page {w.pages[0]}
                    {w.pages[1] !== w.pages[0] ? `–${w.pages[1]}` : ""}): {w.w.join("; ")}
                  </li>
                ))}
              </ul>
            </Box>
          )}
        </section>
      )}

      {/* 3 · import */}
      {items.length > 0 && !reading && (
        <section className="a-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">3 · Preview, then import</h2>
          <fieldset className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {(Object.keys(FIELD_LABEL) as FieldKey[]).map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" checked={fields[k]} disabled={busy} onChange={(e) => setFields({ ...fields, [k]: e.target.checked })} />
                {FIELD_LABEL[k]}
              </label>
            ))}
            <label className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={replace} disabled={busy} onChange={(e) => setReplace(e.target.checked)} />
              Replace text that is already in the database (otherwise only empty fields are filled). The sūtra text itself is always corrected when it differs.
            </label>
          </fieldset>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => run(true)} className="a-btn a-btn-outline">
              Preview changes
            </button>
            <button
              type="button"
              disabled={busy || (phase !== "previewed" && phase !== "imported")}
              onClick={() => {
                if (window.confirm(`Write these changes for ${items.length} sūtras to the ${editionName} edition? Each change is saved in the sūtra's history.`)) run(false);
              }}
              className="a-btn a-btn-primary"
              title={phase === "previewed" || phase === "imported" ? "" : "Preview first"}
            >
              Import now
            </button>
          </div>
          {(phase === "previewing" || phase === "importing") && (
            <div className="mt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--a-border)]">
                <div className="h-full bg-[var(--a-accent,var(--accent))]" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
              <p className="mt-1 text-xs text-[var(--a-fg-muted)]">
                {phase === "previewing" ? "Comparing" : "Importing"} {progress.done} of {progress.total}…
              </p>
            </div>
          )}
          {error && <Box tone="warn" title="Stopped">{error}</Box>}
          {results.length > 0 && <Results results={results} imported={phase === "imported"} />}
        </section>
      )}
    </div>
  );
}

const order = (n: string) => (n.startsWith("0.1.") ? -100 + Number(n.split(".")[2]) : n.startsWith("0.2.") ? 100000 + Number(n.split(".")[2]) : Number(n));

function FileSummary({ a }: { a: Analysis }) {
  const sutras = a.blocks.filter((b) => !b.number.startsWith("0."));
  return (
    <ul className="mt-2 grid gap-0.5 text-xs text-[var(--a-fg-muted)]">
      {a.parts.map((p, k) => (
        <li key={k}>
          {p.label} — pages {p.first}–{p.last}
        </li>
      ))}
      <li className="text-[var(--a-fg)]">
        {sutras.length ? `Sūtras ${sutras[0].number}–${sutras[sutras.length - 1].number} (${sutras.length})` : "No sūtras"}
        {a.blocks.length > sutras.length ? ` · ${a.blocks.length - sutras.length} verses` : ""}
      </li>
    </ul>
  );
}

function Counts({ items }: { items: ImportItem[] }) {
  const n = (f: (i: ImportItem) => boolean) => items.filter(f).length;
  const c = (k: string) => n((i) => i.commentaries.some((x) => x.key === k));
  const rows: [string, number][] = [
    ["Synonyms", n((i) => !!i.synonyms)],
    ["Translation", n((i) => !!i.translation)],
    ["Vṛtti", n((i) => !!i.vrtti)],
    ["Amṛta", c("amrta")],
    ["Saṁśodhinī", c("samsodhini")],
    ["Bāla", c("bala")],
    ["Introductions", c("intro")],
    ["Tables", items.reduce((a, i) => a + (JSON.stringify(i).match(/<table/g)?.length ?? 0), 0)],
  ];
  return (
    <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {rows.map(([k, v]) => (
        <div key={k} className="rounded-lg border border-[var(--a-border)] px-3 py-2">
          <dt className="text-xs text-[var(--a-fg-muted)]">{k}</dt>
          <dd className="text-lg font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Results({ results, imported }: { results: ItemResult[]; imported: boolean }) {
  const missing = results.filter((r) => r.error);
  const textChanges = results.filter((r) => r.sutra && r.sutra.change !== "same");
  const count = (pick: (r: ItemResult) => string | undefined, v: string) => results.filter((r) => pick(r) === v).length;
  const fields = ["synonyms", "translation", "vrtti"] as const;
  const coms = ["intro", "amrta", "samsodhini", "bala"] as const;
  return (
    <div className="mt-5 grid gap-4">
      <Box tone="ok" title={imported ? "Imported" : "Preview — nothing has been written yet"}>
        <table className="text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--a-fg-muted)]">
              <th className="pr-4">Field</th>
              <th className="pr-4">{imported ? "filled" : "will fill"}</th>
              <th className="pr-4">{imported ? "replaced" : "will replace"}</th>
              <th className="pr-4">unchanged</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pr-4">Sūtra text</td>
              <td>{results.filter((r) => r.sutra?.change === "fill").length}</td>
              <td>{results.filter((r) => r.sutra?.change === "replace").length}</td>
              <td>{results.filter((r) => r.sutra?.change === "same").length}</td>
            </tr>
            {fields.map((f) => (
              <tr key={f}>
                <td className="pr-4">{FIELD_LABEL[f]}</td>
                <td>{count((r) => r.fields[f], "fill")}</td>
                <td>{count((r) => r.fields[f], "replace")}</td>
                <td>{count((r) => r.fields[f], "same") + count((r) => r.fields[f], "keep")}</td>
              </tr>
            ))}
            {coms.map((k) => (
              <tr key={k}>
                <td className="pr-4">{{ intro: "Introductions", amrta: "Amṛta", samsodhini: "Saṁśodhinī", bala: "Bāla" }[k]}</td>
                <td>{count((r) => r.commentaries[k], "fill")}</td>
                <td>{count((r) => r.commentaries[k], "replace")}</td>
                <td>{count((r) => r.commentaries[k], "same") + count((r) => r.commentaries[k], "keep")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
      {missing.length > 0 && (
        <Box tone="warn" title={`${missing.length} not matched in the database`}>
          <ul className="text-xs">{missing.map((r) => <li key={r.number}><b>{r.number}</b>: {r.error}</li>)}</ul>
        </Box>
      )}
      {textChanges.length > 0 && (
        <Box tone="warn" title={`${textChanges.length} sūtra text(s) ${imported ? "corrected" : "will be corrected"} from the PDF`}>
          <details>
            <summary className="cursor-pointer text-sm">Show them</summary>
            <ul className="mt-2 grid gap-2 text-xs">
              {textChanges.map((r) => (
                <li key={r.number}>
                  <b>{r.dbNumber ?? r.number}</b>
                  <br />
                  <span className="text-red-700 line-through">{r.sutra!.from || "(empty)"}</span>
                  <br />
                  <span className="text-green-700">{r.sutra!.to}</span>
                </li>
              ))}
            </ul>
          </details>
        </Box>
      )}
    </div>
  );
}

function Box({ tone, title, children }: { tone: "ok" | "warn"; title: string; children: React.ReactNode }) {
  return (
    <div className={`mt-4 rounded-lg border p-3 text-sm ${tone === "ok" ? "border-green-600/40" : "border-amber-500/50"}`}>
      <p className="mb-1 flex items-center gap-2 font-medium">
        {tone === "ok" ? <CheckCircle2 size={16} className="text-green-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
        {title}
      </p>
      {children}
    </div>
  );
}
