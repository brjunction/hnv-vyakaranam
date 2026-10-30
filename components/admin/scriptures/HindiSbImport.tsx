"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { parseHindiSb, type HindiVerse } from "@/lib/scriptures/sb/hindi";
import { pdfLines } from "@/lib/scriptures/sb/hindi-extract";
import { ensureCommentaryKinds, importScriptureRows, listVerseNumbers } from "@/lib/actions/scriptures";

// Admin › Scriptures › Śrīmad-Bhāgavatam › Import e-books — the Hindi PDFs
// ("hindi-sb-canto-04-part-1.pdf" …). Read in the browser; the Hindi synonyms,
// translation and purport are attached to Śrīla Prabhupāda's verses (same
// numbering; a verse grouped differently goes to the verse that contains it).
// Nothing new is created; verses not found are listed.

const KINDS = [
  { key: "synonyms_hi", name: "शब्दार्थ (हिन्दी)", author: "Śrīla Prabhupāda", language: "english" as const, pane: "verse" as const },
  { key: "translation_hi", name: "अनुवाद (हिन्दी)", author: "Śrīla Prabhupāda", language: "english" as const, pane: "translation" as const },
  { key: "purport_hi", name: "तात्पर्य (हिन्दी)", author: "Śrīla Prabhupāda", language: "english" as const, pane: "commentary" as const },
];
type Row = { location: string; verse: string; c: Record<string, string> };

export default function HindiSbImport({ bookId }: { bookId: number }) {
  const [files, setFiles] = useState<{ name: string; canto: number; verses: number; issues: string[] }[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [divisions, setDivisions] = useState<{ location: string; titleDeva: string }[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"" | "checked" | "saved">("");
  const [report, setReport] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function read(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setDone("");
    setReport("");
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      setStatus("Reading the verse numbers of the Bhāgavatam…");
      const nos = await listVerseNumbers(bookId);
      // location "4.12" → its verses [from, to, key]
      const byLoc = new Map<string, { from: number; to: number; key: string }[]>();
      for (const n of nos) {
        const m = /^(\d+\.\d+)\.(\d+)(?:-(\d+))?$/.exec(n);
        if (!m) continue;
        const a = byLoc.get(m[1]) ?? [];
        a.push({ from: Number(m[2]), to: Number(m[3] ?? m[2]), key: m[3] ? `${m[2]}-${m[3]}` : m[2] });
        byLoc.set(m[1], a);
      }
      const info: typeof files = [];
      const merged = new Map<string, Row>();
      const divs: { location: string; titleDeva: string }[] = [];
      const miss: string[] = [];
      for (const f of [...list]) {
        const canto = Number(/canto[-_ ]?0*(\d+)/i.exec(f.name)?.[1] ?? 0);
        if (!canto) {
          info.push({ name: f.name, canto: 0, verses: 0, issues: ["The file name does not say the canto (…canto-04…)."] });
          continue;
        }
        const doc = await pdfjs.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
        const lines = await pdfLines(doc as never, (n) => n % 20 === 0 && setStatus(`${f.name}: page ${n} of ${doc.numPages}…`));
        const r = parseHindiSb(lines, canto);
        info.push({ name: f.name, canto, verses: r.verses.length, issues: r.issues });
        for (const [ch, t] of Object.entries(r.titles)) if (byLoc.has(`${canto}.${ch}`)) divs.push({ location: `${canto}.${ch}`, titleDeva: t });
        for (const v of r.verses as HindiVerse[]) {
          const loc = `${canto}.${v.chapter}`;
          const target = (byLoc.get(loc) ?? []).find((e) => e.from <= v.from && v.from <= e.to);
          if (!target) {
            miss.push(`${loc}.${v.key}`);
            continue;
          }
          const id = `${loc}|${target.key}`;
          const row = merged.get(id) ?? { location: loc, verse: target.key, c: {} };
          const add = (k: string, h: string) => h && (row.c[k] = (row.c[k] ?? "") + h);
          add("synonyms_hi", v.synonyms);
          add("translation_hi", v.translation);
          add("purport_hi", v.purport);
          merged.set(id, row);
        }
        setFiles([...info]);
      }
      setFiles(info);
      setRows([...merged.values()]);
      setDivisions(divs);
      setMissing(miss);
    } catch (e) {
      setReport(`Could not read the files: ${(e as Error).message}`);
    } finally {
      setStatus("");
      setBusy(false);
    }
  }

  async function run(dryRun: boolean) {
    setBusy(true);
    setReport("");
    const k = await ensureCommentaryKinds(bookId, KINDS).catch((e: Error) => ({ ok: false, message: e.message, created: [] as string[] }));
    if (!k.ok) {
      setReport(k.message);
      setBusy(false);
      return;
    }
    let created = 0,
      updated = 0,
      unchanged = 0;
    const errors: string[] = [];
    const batches: Row[][] = [];
    let cur: Row[] = [];
    let bytes = 0;
    for (const r of rows) {
      const s = JSON.stringify(r).length;
      if (cur.length && (cur.length >= 120 || bytes + s > 2_400_000)) (batches.push(cur), (cur = []), (bytes = 0));
      cur.push(r);
      bytes += s;
    }
    if (cur.length) batches.push(cur);
    for (let i = 0; i < batches.length; i++) {
      setStatus(`${dryRun ? "Checking" : "Importing"} … ${Math.round((i / batches.length) * 100)}%`);
      let r = await importScriptureRows({ bookId, rows: batches[i], divisions: i === 0 ? divisions : [], dryRun, createDivisions: false }).catch((e: Error) => ({ ok: false, message: e.message, created: 0, updated: 0, unchanged: 0, divisionsCreated: 0, errors: [] }));
      if (!r.ok && !r.errors.length) r = await importScriptureRows({ bookId, rows: batches[i], divisions: i === 0 ? divisions : [], dryRun, createDivisions: false }).catch((e: Error) => ({ ok: false, message: e.message, created: 0, updated: 0, unchanged: 0, divisionsCreated: 0, errors: [] }));
      created += r.created;
      updated += r.updated;
      unchanged += r.unchanged;
      errors.push(...r.errors);
      if (!r.ok) {
        setReport(`Stopped at ${batches[i][0].location}.${batches[i][0].verse}: ${r.message}`);
        setBusy(false);
        setStatus("");
        return;
      }
    }
    setReport(`${dryRun ? "Preview — nothing written yet: " : "Imported: "}${updated} verses get Hindi text, ${unchanged} unchanged${created ? `, ${created} new (should be 0)` : ""}.${errors.length ? ` ${errors.slice(0, 5).join(" · ")}` : ""}`);
    setDone(dryRun ? "checked" : "saved");
    setStatus("");
    setBusy(false);
  }

  return (
    <section className="a-card mt-6 p-5 sm:p-6">
      <h2 className="text-base font-semibold">Hindi Bhāgavatam (PDFs)</h2>
      <p className="mt-1 text-sm text-[var(--a-fg-muted)]">
        Choose all the Hindi PDFs at once (<code>hindi-sb-canto-04-part-1.pdf</code> …; the canto is read from the file name). The Hindi synonyms (शब्दार्थ), translation (अनुवाद) and purport
        (तात्पर्य) are attached to Śrīla Prabhupāda&apos;s verses. Reading takes a few seconds per file; nothing is uploaded.
      </p>
      <input ref={input} type="file" multiple accept=".pdf,application/pdf" className="hidden" onChange={(e) => read(e.target.files)} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="a-btn a-btn-primary mt-4 inline-flex items-center gap-2">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Choose Hindi PDFs
      </button>
      {status && <p className="mt-3 text-sm text-[var(--a-fg-muted)]">{status}</p>}
      {files.length > 0 && (
        <ul className="mt-4 grid gap-1 text-sm">
          {files.map((f) => (
            <li key={f.name} className="flex items-start gap-2">
              <FileText size={15} className="mt-0.5 shrink-0" />
              <span>
                <b>{f.name}</b> — Canto {f.canto || "?"} · {f.verses} verses{f.issues.length ? ` · ${f.issues.length} note(s): ${f.issues.slice(0, 3).join(" ")}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 0 && (
        <>
          <p className="mt-3 text-sm">
            {rows.length.toLocaleString()} of Śrīla Prabhupāda&apos;s verses get Hindi text; {divisions.length} chapters get their Hindi title. Text imported before is replaced.
          </p>
          {missing.length > 0 && (
            <p className="mt-2 flex items-start gap-2 text-xs text-amber-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Not found in the Bhāgavatam (skipped): {missing.slice(0, 40).join(", ")}
              {missing.length > 40 ? " …" : ""}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => run(true)} className="a-btn a-btn-outline">
              Preview changes
            </button>
            <button type="button" disabled={busy || !done} onClick={() => window.confirm(`Add Hindi text to ${rows.length} verses?`) && run(false)} className="a-btn a-btn-primary">
              Import now
            </button>
          </div>
        </>
      )}
      {report && (
        <p className="mt-3 flex items-start gap-2 text-sm">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" /> {report}
        </p>
      )}
    </section>
  );
}
