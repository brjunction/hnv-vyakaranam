"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { importSongRows } from "@/lib/actions/songs";

type Row = Record<string, string>;
const MAX_BYTES = 2_500_000;

/**
 * Reads the .xlsx in the browser, then sends whole songs to the server in
 * batches (a song is never split): a dry run first, then the real save.
 */
export default function SongSheetUpload() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<"idle" | "checking" | "checked" | "saving" | "saved">("idle");
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [lists, setLists] = useState<{ created: string[]; updated: string[]; unchanged: number }>({ created: [], updated: [], unchanged: 0 });

  async function read(f: File) {
    setName(f.name);
    setRows(null);
    setPhase("idle");
    setMsg("");
    setErrors([]);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames.find((n) => n.toLowerCase() === "songs") ?? wb.SheetNames[0]];
      setRows(XLSX.utils.sheet_to_json<Row>(ws, { raw: false, defval: "" }));
    } catch (e) {
      setMsg(`Couldn't read that file: ${(e as Error).message}`);
    }
  }

  function batches(all: Row[]): Row[][] {
    // keep each song's rows together
    const key = (r: Row) => (r.Slug || r.slug || r.Title || r.title || "").trim().toLowerCase();
    const groups: Row[][] = [];
    let last = "";
    for (const r of all) {
      const k = key(r);
      if (k && k !== last) groups.push([]);
      if (!groups.length) groups.push([]);
      groups[groups.length - 1].push(r);
      if (k) last = k;
    }
    const out: Row[][] = [];
    let cur: Row[] = [];
    let size = 0;
    for (const g of groups) {
      const s = JSON.stringify(g).length;
      if (cur.length && size + s > MAX_BYTES) {
        out.push(cur);
        cur = [];
        size = 0;
      }
      cur.push(...g);
      size += s;
    }
    if (cur.length) out.push(cur);
    return out;
  }

  async function run(dryRun: boolean) {
    if (!rows) return;
    setPhase(dryRun ? "checking" : "saving");
    setErrors([]);
    const sum = { created: [] as string[], updated: [] as string[], unchanged: 0 };
    const errs: string[] = [];
    for (const b of batches(rows)) {
      const r = await importSongRows({ rows: b, dryRun });
      sum.created.push(...r.created);
      sum.updated.push(...r.updated);
      sum.unchanged += r.unchanged;
      errs.push(...r.errors);
      if (!r.ok && !dryRun) break;
    }
    setLists(sum);
    setErrors(errs);
    setMsg(
      errs.length
        ? `${errs.length} problem${errs.length === 1 ? "" : "s"} — nothing will be saved until they are fixed.`
        : `${dryRun ? "Ready: will create" : "Done: created"} ${sum.created.length} and ${dryRun ? "update" : "updated"} ${sum.updated.length} song${sum.updated.length === 1 ? "" : "s"}; ${sum.unchanged} unchanged.`
    );
    setPhase(dryRun ? "checked" : "saved");
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <a href="/api/admin/songs-template" className="a-btn a-btn-outline">
          <Download size={15} /> Download all songs (.xlsx template)
        </a>
        <label className="a-btn a-btn-outline cursor-pointer">
          <FileSpreadsheet size={15} /> {name || "Choose a filled sheet…"}
          <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
        </label>
        {rows && (
          <>
            <button type="button" onClick={() => run(true)} disabled={phase === "checking" || phase === "saving"} className="a-btn a-btn-outline">
              {phase === "checking" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Dry run ({rows.length} rows)
            </button>
            <button type="button" onClick={() => run(false)} disabled={phase !== "checked" || errors.length > 0} className="a-btn a-btn-primary">
              {phase === "saving" ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Save
            </button>
          </>
        )}
      </div>
      {msg && (
        <p className={`rounded-lg border px-3 py-2 text-sm ${errors.length ? "border-[var(--a-danger)]/30 bg-[var(--a-danger)]/10 text-[var(--a-danger)]" : "border-[var(--a-success)]/30 bg-[var(--a-success)]/10"}`}>
          {errors.length > 0 && <AlertTriangle size={14} className="mr-1 inline" />}
          {msg}
        </p>
      )}
      {errors.length > 0 && (
        <ul className="max-h-48 list-disc overflow-auto pl-5 text-sm text-[var(--a-danger)]">
          {errors.slice(0, 100).map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      {(lists.created.length > 0 || lists.updated.length > 0) && (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {lists.created.length > 0 && (
            <div>
              <p className="mb-1 font-medium">New ({lists.created.length})</p>
              <p className="max-h-32 overflow-auto text-[var(--a-fg-muted)]">{lists.created.join(" · ")}</p>
            </div>
          )}
          {lists.updated.length > 0 && (
            <div>
              <p className="mb-1 font-medium">Updated ({lists.updated.length})</p>
              <p className="max-h-32 overflow-auto text-[var(--a-fg-muted)]">{lists.updated.join(" · ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
