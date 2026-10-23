"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { unzip } from "fflate";
import { FileArchive, FolderOpen, Files, Loader2, CheckCircle2, AlertCircle, UploadCloud } from "lucide-react";
import { addDictionary, type AddResult } from "@/lib/actions/dictionaries";

// Upload one or more StarDict dictionaries: pick the files, a whole folder,
// or a .zip. Each set (.ifo + .idx + .dict/.dict.dz [+ .syn]) becomes one
// dictionary. Files go straight from the browser to storage.

type Scheme = "iast" | "itrans" | "hk" | "slp1" | "velthuis" | "devanagari" | "english";
const SCHEMES: { v: Scheme; label: string }[] = [
  { v: "itrans", label: "ITRANS (kRShNa)" },
  { v: "iast", label: "IAST (kṛṣṇa)" },
  { v: "devanagari", label: "Devanagari (कृष्ण)" },
  { v: "hk", label: "Harvard-Kyoto (kRSNa)" },
  { v: "slp1", label: "SLP1 (kfzRa)" },
  { v: "velthuis", label: "Velthuis (k.r.s.na)" },
  { v: "english", label: "English / other" },
];

type DictSet = {
  base: string;
  ifo: File;
  idx: File;
  dict: File;
  syn?: File;
  name: string;
  words: number;
  sample: string[];
  scheme: Scheme;
  state: "ready" | "uploading" | "preparing" | "done" | "error";
  progress: number;
  result?: AddResult;
};

const EXT = /\.(ifo|idx|idx\.gz|idx\.dz|dict|dict\.dz|syn|syn\.dz)$/i;

function guessScheme(name: string, sample: string[]): Scheme {
  const s = sample.join(" ");
  if (/[ऀ-ॿ]/.test(s)) return "devanagari";
  if (/[āīūṛṝṅñṭḍṇśṣṃṁḥ]/.test(s)) return "iast";
  if (/itrans/i.test(name) || /(Sh|~N|~n|RRi|aa|A[a-z]|[a-z]A)/.test(s)) return "itrans";
  if (/\bhk\b|harvard/i.test(name)) return "hk";
  if (/slp/i.test(name)) return "slp1";
  if (/[a-z][A-Z]/.test(s)) return "itrans";
  return "english";
}

async function sampleWords(idx: File): Promise<string[]> {
  let buf = new Uint8Array(await idx.slice(0, 8192).arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    // gzipped .idx: read the whole thing (rare)
    const { gunzipSync } = await import("fflate");
    buf = gunzipSync(new Uint8Array(await idx.arrayBuffer())).slice(0, 8192);
  }
  const out: string[] = [];
  const dec = new TextDecoder();
  let p = 0;
  while (p < buf.length && out.length < 12) {
    const z = buf.indexOf(0, p);
    if (z < 0 || z + 9 > buf.length) break;
    out.push(dec.decode(buf.subarray(p, z)));
    p = z + 9;
  }
  // skip the first few (often symbols)
  return out.slice(Math.min(3, out.length - 6 > 0 ? 3 : 0));
}

function unzipFile(file: File): Promise<File[]> {
  return file.arrayBuffer().then(
    (ab) =>
      new Promise((resolve, reject) =>
        unzip(new Uint8Array(ab), (err, files) => {
          if (err) return reject(err);
          resolve(
            Object.entries(files)
              .filter(([path, data]) => data.length > 0 && !path.startsWith("__MACOSX"))
              .map(([path, data]) => new File([data as BlobPart], path.split("/").pop() ?? path))
          );
        })
      )
  );
}

export default function DictionaryUploader() {
  const router = useRouter();
  const [sets, setSets] = useState<DictSet[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  async function accept(list: FileList | null) {
    if (!list?.length) return;
    setNote("Reading files…");
    let files: File[] = [];
    for (const f of Array.from(list)) {
      if (/\.zip$/i.test(f.name)) {
        try {
          files = files.concat(await unzipFile(f));
        } catch {
          setNote(`Could not open ${f.name} as a zip file.`);
          return;
        }
      } else files.push(f);
    }
    const groups = new Map<string, Partial<DictSet>>();
    for (const f of files) {
      const m = f.name.match(EXT);
      if (!m) continue;
      const base = f.name.slice(0, -m[0].length);
      const g = groups.get(base) ?? { base };
      const ext = m[1].toLowerCase();
      if (ext === "ifo") g.ifo = f;
      else if (ext.startsWith("idx")) g.idx = f;
      else if (ext.startsWith("dict")) g.dict = f;
      else if (ext.startsWith("syn")) g.syn = f;
      groups.set(base, g);
    }
    const found: DictSet[] = [];
    const incomplete: string[] = [];
    for (const g of groups.values()) {
      if (!g.ifo || !g.idx || !g.dict) {
        incomplete.push(g.base!);
        continue;
      }
      const ifo = await g.ifo.text();
      const info = Object.fromEntries(
        ifo.split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
      );
      const sample = await sampleWords(g.idx);
      found.push({
        ...(g as DictSet),
        name: info.bookname || g.base!,
        words: Number(info.wordcount) || 0,
        sample,
        scheme: guessScheme(`${g.base} ${info.bookname ?? ""}`, sample),
        state: "ready",
        progress: 0,
      });
    }
    setSets(found);
    setNote(
      found.length
        ? incomplete.length
          ? `Skipped ${incomplete.join(", ")}: a dictionary needs its .ifo, .idx and .dict (or .dict.dz) files together.`
          : null
        : "No StarDict dictionary found. Choose the folder (or zip) that contains the .ifo, .idx and .dict.dz files."
    );
  }

  function patch(i: number, p: Partial<DictSet>) {
    setSets((s) => s.map((x, k) => (k === i ? { ...x, ...p } : x)));
  }

  async function addAll() {
    setBusy(true);
    for (let i = 0; i < sets.length; i++) {
      const s = sets[i];
      if (s.state === "done") continue;
      try {
        patch(i, { state: "uploading", progress: 0 });
        const folder = `dict/${s.base.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`;
        const parts = [s.ifo, s.idx, s.dict, ...(s.syn ? [s.syn] : [])];
        const total = parts.reduce((n, f) => n + f.size, 0);
        let done = 0;
        const urls: string[] = [];
        for (const f of parts) {
          const r = await upload(`${folder}/${f.name}`, f, {
            access: "public",
            handleUploadUrl: "/api/admin/dict-upload",
            contentType: "application/octet-stream",
            multipart: f.size > 8 * 1024 * 1024,
            onUploadProgress: (e) => patch(i, { progress: Math.round(((done + e.loaded) / total) * 100) }),
          });
          done += f.size;
          urls.push(r.url);
        }
        patch(i, { state: "preparing", progress: 100 });
        const res = await addDictionary({
          name: s.name,
          scheme: s.scheme,
          files: { ifo: urls[0], idx: urls[1], dict: urls[2], ...(s.syn ? { syn: urls[3] } : {}) },
          totalBytes: total,
        });
        patch(i, { state: res?.ok ? "done" : "error", result: res });
      } catch (err) {
        patch(i, { state: "error", result: { ok: false, message: (err as Error).message || "Upload failed." } });
      }
    }
    setBusy(false);
    router.refresh();
  }

  const pickBtn =
    "inline-flex items-center gap-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-card)] px-3.5 py-2 text-sm font-medium shadow-sm transition hover:bg-[var(--a-muted)]";

  return (
    <div>
      <div
        className="rounded-xl border-2 border-dashed border-[var(--a-border)] bg-[var(--a-muted)]/40 p-6 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void accept(e.dataTransfer.files);
        }}
      >
        <UploadCloud className="mx-auto mb-3 text-[var(--a-fg-muted)]" size={30} strokeWidth={1.5} />
        <p className="mb-1 font-medium">Drop dictionary files, a folder, or a .zip here</p>
        <p className="mb-4 text-sm text-[var(--a-fg-muted)]">StarDict format (as used by GoldenDict): .ifo + .idx + .dict.dz (+ .syn)</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className={pickBtn} onClick={() => folderRef.current?.click()}>
            <FolderOpen size={16} /> Choose folder
          </button>
          <button type="button" className={pickBtn} onClick={() => zipRef.current?.click()}>
            <FileArchive size={16} /> Choose .zip
          </button>
          <button type="button" className={pickBtn} onClick={() => filesRef.current?.click()}>
            <Files size={16} /> Choose files
          </button>
        </div>
        <input ref={filesRef} type="file" multiple hidden onChange={(e) => void accept(e.target.files)} />
        <input ref={zipRef} type="file" accept=".zip" multiple hidden onChange={(e) => void accept(e.target.files)} />
        <input
          ref={folderRef}
          type="file"
          hidden
          multiple
          {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
          onChange={(e) => void accept(e.target.files)}
        />
      </div>

      {note && <p className="mt-4 text-sm text-[var(--a-fg-muted)]">{note}</p>}

      {sets.length > 0 && (
        <div className="mt-6 grid gap-4">
          {sets.map((s, i) => (
            <div key={s.base} className="rounded-xl border border-[var(--a-border)] bg-[var(--a-card)] p-4 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[1fr_15rem]">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[var(--a-fg-muted)]">Name</span>
                  <input
                    value={s.name}
                    disabled={s.state !== "ready"}
                    onChange={(e) => patch(i, { name: e.target.value })}
                    className="a-input"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[var(--a-fg-muted)]">Headwords are written in</span>
                  <select value={s.scheme} disabled={s.state !== "ready"} onChange={(e) => patch(i, { scheme: e.target.value as Scheme })} className="a-input">
                    {SCHEMES.map((x) => (
                      <option key={x.v} value={x.v}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-3 text-xs text-[var(--a-fg-muted)]">
                {s.words ? `${s.words.toLocaleString()} words · ` : ""}
                {((s.ifo.size + s.idx.size + s.dict.size + (s.syn?.size ?? 0)) / 1048576).toFixed(1)} MB · first headwords:{" "}
                <span className="font-mono text-[var(--a-fg)]">{s.sample.slice(0, 6).join(", ")}</span>
              </p>
              {s.state !== "ready" && (
                <div className="mt-3">
                  {(s.state === "uploading" || s.state === "preparing") && (
                    <div className="flex items-center gap-3 text-sm">
                      <Loader2 size={16} className="animate-spin" />
                      {s.state === "uploading" ? `Uploading… ${s.progress}%` : "Building the search index…"}
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--a-muted)]">
                        <span className="block h-full bg-[var(--a-primary)] transition-all" style={{ width: `${s.progress}%` }} />
                      </span>
                    </div>
                  )}
                  {s.result && (
                    <div className={`flex items-start gap-2 text-sm ${s.result.ok ? "text-[var(--a-success)]" : "text-[var(--a-danger)]"}`}>
                      {s.result.ok ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
                      <span>
                        {s.result.message}
                        {s.result.preview && (
                          <span className="mt-1 block font-mono text-xs text-[var(--a-fg-muted)]">
                            {s.result.preview.slice(0, 6).map((p) => `${p.raw} → ${p.iast}`).join("   ")}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div>
            <button type="button" onClick={addAll} disabled={busy || sets.every((s) => s.state === "done")} className="a-btn a-btn-primary">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              Add {sets.filter((s) => s.state !== "done").length || ""} dictionar{sets.length === 1 ? "y" : "ies"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
