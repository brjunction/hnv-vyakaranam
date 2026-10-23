"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { importScriptureRows, type ImportReport } from "@/lib/actions/scriptures";
import { parseSheets, type ParsedSheet } from "@/lib/scriptures/sheet";

const CHUNK = 250;

type Total = Omit<ImportReport, "ok" | "message">;
const empty = (): Total => ({ created: 0, updated: 0, unchanged: 0, divisionsCreated: 0, errors: [] });

/**
 * Reads the .xlsx in the browser (any size), then sends the rows to the
 * server in small batches: first a dry run over everything, then — only if
 * the dry run found no problem — the real save.
 */
export default function SheetUpload({ bookId, levels, typeNames }: { bookId: number; levels: string[]; typeNames: string[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [reading, setReading] = useState(false);
  const [createDivisions, setCreateDivisions] = useState(true);
  const [phase, setPhase] = useState<"idle" | "checking" | "checked" | "saving" | "saved">("idle");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState<Total>(empty());
  const [error, setError] = useState("");

  async function read(f: File) {
    setFile(f);
    setParsed(null);
    setPhase("idle");
    setError("");
    setReading(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array", cellText: true, cellDates: false });
      const sheet = (name: string) => {
        const ws = wb.Sheets[wb.SheetNames.find((n) => n.toLowerCase() === name.toLowerCase()) ?? ""];
        return ws ? (XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "" }) as string[][]) : [];
      };
      const verses = sheet("Verses").length ? sheet("Verses") : (XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" }) as string[][]);
      const p = parseSheets(levels, verses, sheet("Divisions"));
      setParsed(p);
      if (p.problems.length) setError(p.problems.join(" "));
    } catch (e) {
      setError(`Couldn't read that file: ${(e as Error).message}`);
    } finally {
      setReading(false);
    }
  }

  async function run(dryRun: boolean) {
    if (!parsed) return;
    setPhase(dryRun ? "checking" : "saving");
    setError("");
    setProgress(0);
    const sum = empty();
    // batches of ≤ CHUNK rows and ≤ ~2.5 MB (server requests are limited to 4 MB)
    const batches: { start: number; rows: ParsedSheet["rows"] }[] = [];
    let cur: ParsedSheet["rows"] = [];
    let size = 0;
    let start = 0;
    parsed.rows.forEach((r, idx) => {
      const n = JSON.stringify(r).length * 2;
      if (cur.length && (cur.length >= CHUNK || size + n > 2_500_000)) {
        batches.push({ start, rows: cur });
        cur = [];
        size = 0;
        start = idx;
      }
      cur.push(r);
      size += n;
    });
    batches.push({ start, rows: cur });
    const chunks = batches.length;
    for (let i = 0; i < chunks; i++) {
      const res = await importScriptureRows({
        bookId,
        rows: batches[i].rows,
        divisions: i === 0 ? parsed.divisions : [],
        dryRun,
        createDivisions,
      }).catch((e: Error) => ({ ok: false, message: e.message, ...empty() }) as ImportReport);
      // error line numbers are per chunk: shift them to sheet rows
      const shifted = res.errors.map((e) => e.replace(/^Row (\d+)/, (_, n) => `Row ${Number(n) + batches[i].start}`));
      sum.created += res.created;
      sum.updated += res.updated;
      sum.unchanged += res.unchanged;
      sum.divisionsCreated += res.divisionsCreated;
      sum.errors.push(...shifted);
      setProgress(Math.round(((i + 1) / chunks) * 100));
      setTotal({ ...sum, errors: [...sum.errors] });
      if (!res.ok) {
        setError(res.message);
        setPhase("idle");
        return;
      }
    }
    setPhase(dryRun ? "checked" : "saved");
  }

  const unknown = parsed?.commentaryColumns.filter((c) => !typeNames.some((t) => t.toLowerCase() === c.toLowerCase())) ?? [];
  const busy = phase === "checking" || phase === "saving";

  return (
    <div className="grid gap-5">
      <label
        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--a-border)] bg-[var(--a-muted)]/40 p-8 text-center transition-colors hover:border-[var(--a-ring)]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) void read(f);
        }}
      >
        {reading ? <Loader2 className="animate-spin" /> : <FileSpreadsheet size={28} className="text-[var(--a-fg-muted)]" />}
        <span className="font-medium">{file ? file.name : "Choose or drop the filled .xlsx"}</span>
        <span className="text-xs text-[var(--a-fg-muted)]">Read in your browser — big files are fine.</span>
        <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
      </label>

      {parsed && !parsed.problems.length && (
        <div className="rounded-xl border border-[var(--a-border)] p-4 text-sm">
          <p>
            Found <strong>{parsed.rows.length.toLocaleString()}</strong> verse rows and <strong>{parsed.divisions.length.toLocaleString()}</strong> division rows.
            {parsed.commentaryColumns.length > 0 && <> Commentary columns: {parsed.commentaryColumns.join(", ")}.</>}
          </p>
          {unknown.length > 0 && (
            <p className="mt-2 flex items-start gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" /> Unknown column{unknown.length > 1 ? "s" : ""}: {unknown.join(", ")} — add {unknown.length > 1 ? "them" : "it"} under Commentaries first (same name), or remove the column.
            </p>
          )}
          <label className="mt-3 flex items-center gap-2">
            <input type="checkbox" checked={createDivisions} onChange={(e) => setCreateDivisions(e.target.checked)} /> Create missing {levels.join(" / ").toLowerCase()}s automatically
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="a-btn a-btn-outline" disabled={busy || unknown.length > 0} onClick={() => run(true)}>
              {phase === "checking" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} 1. Check (nothing is saved)
            </button>
            <button type="button" className="a-btn a-btn-primary" disabled={busy || phase !== "checked" || total.errors.length > 0} onClick={() => run(false)}>
              {phase === "saving" ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} 2. Apply
            </button>
          </div>
        </div>
      )}

      {(busy || phase === "checked" || phase === "saved") && (
        <div className="rounded-xl border border-[var(--a-border)] p-4">
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-[var(--a-muted)]">
            <div className="h-full rounded-full bg-[var(--a-primary)] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {(
              [
                ["New verses", total.created],
                ["Changed", total.updated],
                ["Unchanged", total.unchanged],
                ["New divisions", total.divisionsCreated],
              ] as const
            ).map(([l, n]) => (
              <div key={l} className="rounded-lg bg-[var(--a-muted)]/60 p-3">
                <p className="text-xs text-[var(--a-fg-muted)]">{l}</p>
                <p className="text-xl font-semibold tabular-nums">{n.toLocaleString()}</p>
              </div>
            ))}
          </div>
          {phase === "checked" && !total.errors.length && <p className="mt-3 text-sm text-[var(--a-success)]">Looks good — press Apply to save.</p>}
          {phase === "saved" && <p className="mt-3 text-sm font-medium text-[var(--a-success)]">Saved. The site shows the changes now.</p>}
        </div>
      )}

      {(error || total.errors.length > 0) && (
        <div className="rounded-xl border border-[var(--a-danger)]/30 bg-[var(--a-danger)]/5 p-4 text-sm text-[var(--a-danger)]">
          {error && <p className="font-medium">{error}</p>}
          {total.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {total.errors.slice(0, 40).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
