"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { parseCommentaryDocx, type DocxResult } from "@/lib/hnv/docx-commentary";
import { finishPdfImport, importPdfBatch, linkMadhyamaBrhat, type PdfImportBatch } from "@/lib/actions/hnv-pdf";

// Admin › HNV › (edition) › Import commentaries (Word). Reads amrta_*.docx /
// bala_*.docx in the browser; each sūtra's Amṛta and Bāla-toṣaṇī go to the
// sūtra with that number (created in its prakaraṇa when missing). Uses the
// same server action as the PDF import (batches, dry run, revisions).

type Item = PdfImportBatch["items"][number];
type Sum = { created: number; filled: number; replaced: number; same: number; kept: number; errors: string[] };
const zero = (): Sum => ({ created: 0, filled: 0, replaced: 0, same: 0, kept: 0, errors: [] });
const BATCH = 20;

export default function DocxImporter({ edition, editionName }: { edition: string; editionName: string }) {
  const [files, setFiles] = useState<{ name: string; r: DocxResult }[]>([]);
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState<"" | "read" | "check" | "save">("");
  const [progress, setProgress] = useState(0);
  const [sum, setSum] = useState<Sum | null>(null);
  const [done, setDone] = useState<"" | "checked" | "saved">("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function read(list: FileList | null) {
    if (!list?.length) return;
    setBusy("read");
    setError("");
    setSum(null);
    setDone("");
    const out: { name: string; r: DocxResult }[] = [];
    for (const f of [...list]) {
      try {
        out.push({ name: f.name, r: parseCommentaryDocx(f.name, new Uint8Array(await f.arrayBuffer())) });
      } catch (e) {
        setError(`${f.name}: ${(e as Error).message}`);
      }
    }
    setFiles(out);
    setBusy("");
  }

  /** One item per sūtra number, with every file's commentary on it. */
  function items(): Item[] {
    const by = new Map<string, Item>();
    for (const { r } of files) {
      if (!r.kind) continue;
      for (const it of r.items) {
        const x = by.get(it.number) ?? { number: it.number, sutra: "", synonyms: "", translation: "", vrtti: "", commentaries: [], pages: [0, 0] as [number, number], prakarana: r.prakarana };
        if (it.sutra && !x.sutra) x.sutra = it.sutra;
        const label = it.to ? `<p><b>(Sūtras ${it.number}–${it.to})</b></p>` : "";
        x.commentaries = [...x.commentaries.filter((c) => c.key !== r.kind), { key: r.kind, html: label + it.html }];
        by.set(it.number, x);
      }
    }
    return [...by.values()].sort((a, b) => Number(a.number) - Number(b.number));
  }

  async function run(dryRun: boolean) {
    const all = items();
    if (!all.length) return;
    setBusy(dryRun ? "check" : "save");
    setError("");
    setProgress(0);
    const s = zero();
    for (let i = 0; i < all.length; i += BATCH) {
      const batch = all.slice(i, i + BATCH);
      const hasSutra = batch.some((b) => b.sutra);
      const call = () =>
        importPdfBatch({ edition, dryRun, replace, fields: { sutra: hasSutra, synonyms: false, translation: false, vrtti: false, commentaries: true }, items: batch }).catch(
          (e: Error) => ({ ok: false, message: e.message, results: [] })
        );
      let r = await call();
      if (!r.ok) r = await call();
      if (!r.ok) {
        setError(`Stopped at sūtra ${batch[0].number}: ${r.message}${dryRun ? "" : " Everything before it was saved; run it again to continue."}`);
        setSum({ ...s });
        setBusy("");
        return;
      }
      for (const x of r.results) {
        if (x.error) s.errors.push(`${x.number}: ${x.error}`);
        if (x.created) s.created++;
        for (const v of Object.values(x.commentaries ?? {})) {
          if (v === "fill") s.filled++;
          else if (v === "replace") s.replaced++;
          else if (v === "same") s.same++;
          else if (v === "keep") s.kept++;
        }
      }
      setProgress(Math.min(1, (i + BATCH) / all.length));
      setSum({ ...s });
    }
    if (!dryRun) await finishPdfImport();
    setDone(dryRun ? "checked" : "saved");
    setBusy("");
  }

  const all = files.length ? items() : [];
  const issues = files.flatMap((f) => f.r.issues);
  return (
    <div className="grid gap-6">
      <section className="a-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">1 · Choose the Word files</h2>
        <p className="mt-1 text-sm text-[var(--a-fg-muted)]">
          Any number at once: <code>amrta_samjna-sandhi.docx</code>, <code>amrta_nama.docx</code>, <code>bala_samasa.docx</code> … The file name tells the commentary (amrta / bala) and the
          prakaraṇa. They go into “Amṛta (Sanskrit)” and “Bāla-toṣaṇī (Sanskrit)”.
        </p>
        <input ref={input} type="file" multiple accept=".docx" className="hidden" onChange={(e) => read(e.target.files)} />
        <button type="button" disabled={!!busy} onClick={() => input.current?.click()} className="a-btn a-btn-primary mt-4 inline-flex items-center gap-2">
          {busy === "read" ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Choose files
        </button>
        {files.length > 0 && (
          <ul className="mt-4 grid gap-1 text-sm">
            {files.map((f) => (
              <li key={f.name} className="flex items-start gap-2">
                <FileText size={15} className="mt-0.5 shrink-0" />
                <span>
                  <b>{f.name}</b> — {f.r.kind === "amrta" ? "Amṛta" : f.r.kind === "bala" ? "Bāla-toṣaṇī" : "?"} · {f.r.prakarana || "?"} · {f.r.items.length} sūtras
                  {f.r.items.length > 0 && ` (${f.r.items[0].number} … ${f.r.items[f.r.items.length - 1].number})`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {issues.length > 0 && (
          <Box tone="warn" title={`${issues.length} note(s)`}>
            <ul className="grid gap-0.5 text-xs">
              {issues.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </Box>
        )}
      </section>

      {all.length > 0 && (
        <section className="a-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">2 · Preview, then import into the {editionName} edition</h2>
          <p className="mt-1 text-sm">{all.length.toLocaleString()} sūtras with a commentary.</p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> Replace a commentary that is already there (otherwise only empty ones are filled)
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={!!busy} onClick={() => run(true)} className="a-btn a-btn-outline">
              Preview changes
            </button>
            <button
              type="button"
              disabled={!!busy || !done}
              onClick={() => window.confirm(`Import the commentaries of ${all.length} sūtras?`) && run(false)}
              className="a-btn a-btn-primary"
              title={done ? "" : "Preview first"}
            >
              Import now
            </button>
          </div>
          {(busy === "check" || busy === "save") && (
            <div className="mt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--a-border)]">
                <div className="h-full bg-[var(--a-accent,var(--accent))]" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="mt-1 text-xs text-[var(--a-fg-muted)]">{busy === "check" ? "Checking" : "Importing"} … {Math.round(progress * 100)}%</p>
            </div>
          )}
          {error && <Box tone="warn" title="Stopped">{error}</Box>}
          {sum && (
            <Box tone="ok" title={done === "saved" ? "Imported" : "Preview — nothing written yet"}>
              <p className="text-sm">
                {sum.created} new sūtras · {sum.filled} commentaries added · {sum.replaced} replaced · {sum.same} unchanged · {sum.kept} kept as they were
              </p>
              {sum.errors.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs">{sum.errors.slice(0, 40).map((e, i) => <li key={i}>{e}</li>)}</ul>}
            </Box>
          )}
        </section>
      )}
      <LinkBrhat />
    </div>
  );
}

/** Madhyama ↔ Bṛhat by sūtra text: "Bṛhat N" on each Madhyama sūtra (and back). */
function LinkBrhat() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Awaited<ReturnType<typeof linkMadhyamaBrhat>> | null>(null);
  const go = async (dryRun: boolean) => {
    setBusy(true);
    setRes(await linkMadhyamaBrhat(dryRun).catch((e: Error) => ({ ok: false, message: e.message, linked: [] })));
    setBusy(false);
  };
  return (
    <section className="a-card p-5 sm:p-6">
      <h2 className="text-base font-semibold">Link Madhyama sūtras to the Bṛhat</h2>
      <p className="mt-1 text-sm text-[var(--a-fg-muted)]">
        Compares the sūtra texts (words in brackets ignored). Each matching Madhyama sūtra then shows “Bṛhat N” to read it there, and the Bṛhat sūtra shows “Madhyama N”. Run it again whenever more
        Bṛhat sūtra text is in; links already set are kept.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => go(true)} className="a-btn a-btn-outline">
          Preview links
        </button>
        <button type="button" disabled={busy || !res?.linked.length} onClick={() => go(false)} className="a-btn a-btn-primary">
          Save links
        </button>
        {busy && <Loader2 size={16} className="mt-2 animate-spin" />}
      </div>
      {res && (
        <Box tone={res.ok ? "ok" : "warn"} title={res.message}>
          <p className="text-xs">{res.linked.slice(0, 80).map((l) => `M ${l.m} → B ${l.b} (${l.score})`).join(" · ")}</p>
        </Box>
      )}
    </section>
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
