"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileArchive, FolderOpen, Files, Loader2, CheckCircle2, AlertCircle, UploadCloud, MinusCircle } from "lucide-react";
import { addDictionary, discardUploads, finishMultipart, startUploads, type UploadPlan } from "@/lib/actions/dictionaries";
import { isArchive, readArchive } from "@/lib/dict/archive";

// Adds any number of StarDict dictionaries at once: pick files, a folder
// (with sub-folders), or archives (.zip / .tar.gz, also nested). Archives are
// read as streams, files go straight from the browser to Neon Object Storage,
// and each complete set (.ifo + .idx + .dict[.dz] [+ .syn]) is registered.

type Scheme = "auto" | "iast" | "itrans" | "hk" | "slp1" | "velthuis" | "devanagari" | "english";
const SCHEMES: { v: Scheme; label: string }[] = [
  { v: "auto", label: "Detect automatically" },
  { v: "itrans", label: "ITRANS (kRShNa)" },
  { v: "iast", label: "IAST (kṛṣṇa)" },
  { v: "devanagari", label: "Devanagari (कृष्ण)" },
  { v: "hk", label: "Harvard-Kyoto (kRSNa)" },
  { v: "slp1", label: "SLP1 (kfzRa)" },
  { v: "velthuis", label: "Velthuis (k.r.s.na)" },
  { v: "english", label: "English / other" },
];

const DICT_FILE = /\.(ifo|idx|idx\.gz|idx\.dz|dict|dict\.dz|syn|syn\.dz)$/i;
const CONCURRENCY = 3;

type Part = "ifo" | "idx" | "dict" | "syn";
type Group = {
  key: string;
  dir: string;
  base: string;
  refs: Partial<Record<Part, string>>;
  bytes: number;
  name?: string;
  words?: number;
  sample?: string[];
  status: "uploading" | "waiting" | "adding" | "done" | "duplicate" | "error" | "incomplete";
  message?: string;
};

function guessScheme(name: string, sample: string[]): Exclude<Scheme, "auto"> {
  const s = sample.join(" ");
  if (/[ऀ-ॿ]/.test(s)) return "devanagari";
  if (/[āīūṛṝṅñṭḍṇśṣṃṁḥ]/.test(s)) return "iast";
  if (/itrans/i.test(name) || /(Sh|~N|~n|RRi|[a-z]A|A[a-z])/.test(s)) return "itrans";
  if (/slp/i.test(name)) return "slp1";
  if (/\bhk\b|harvard/i.test(name)) return "hk";
  if (/[a-z][A-Z]/.test(s)) return "hk";
  if (/sanskrit|sa-|-sa\b|monier|apte|vacaspat|amara|shabda|kosha|kosa/i.test(name)) return "itrans";
  return "english";
}

async function sampleIdx(blob: Blob): Promise<string[]> {
  const buf = new Uint8Array(await blob.slice(0, 16384).arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) return [];
  const out: string[] = [];
  const dec = new TextDecoder();
  let p = 0;
  while (p < buf.length && out.length < 40) {
    const z = buf.indexOf(0, p);
    if (z < 0 || z + 9 > buf.length) break;
    out.push(dec.decode(buf.subarray(p, z)));
    p = z + 9;
  }
  return out.filter((w) => /^\p{L}/u.test(w)).slice(5, 25);
}

function put(url: string, body: Blob, onProgress: (n: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.getResponseHeader("ETag") ?? "") : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(body);
  });
}

async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let err: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      err = e;
      await new Promise((r) => setTimeout(r, 800 * 2 ** i));
    }
  }
  throw err;
}

/** Files of a dropped folder (drag & drop), with their relative paths. */
async function filesFromDrop(items: DataTransferItemList): Promise<{ path: string; file: File }[]> {
  type Entry = { isFile: boolean; isDirectory: boolean; name: string; fullPath: string; file?: (cb: (f: File) => void, err: (e: unknown) => void) => void; createReader?: () => { readEntries: (cb: (e: Entry[]) => void, err: (e: unknown) => void) => void } };
  const out: { path: string; file: File }[] = [];
  async function walk(e: Entry) {
    if (e.isFile && e.file) {
      const f = await new Promise<File>((res, rej) => e.file!(res, rej));
      out.push({ path: e.fullPath.replace(/^\//, ""), file: f });
    } else if (e.isDirectory && e.createReader) {
      const r = e.createReader();
      for (;;) {
        const batch = await new Promise<Entry[]>((res, rej) => r.readEntries(res, rej));
        if (!batch.length) break;
        for (const c of batch) await walk(c);
      }
    }
  }
  const roots = Array.from(items)
    .map((i) => i.webkitGetAsEntry?.() as unknown as Entry | null)
    .filter((e): e is Entry => Boolean(e));
  for (const r of roots) await walk(r);
  return out;
}

export default function DictionaryUploader() {
  const router = useRouter();
  const [scheme, setScheme] = useState<Scheme>("auto");
  const [groups, setGroups] = useState<Group[]>([]);
  const [phase, setPhase] = useState<"idle" | "reading" | "adding" | "done">("idle");
  const [stats, setStats] = useState({ archiveRead: 0, archiveTotal: 0, uploaded: 0, files: 0, skipped: 0 });
  const [error, setError] = useState<string | null>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  async function run(inputs: { path: string; file: Blob; name: string }[]) {
    if (!inputs.length) return;
    setError(null);
    setPhase("reading");
    setGroups([]);
    const batch = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const groupMap = new Map<string, Group>();
    const sync = () => setGroups([...groupMap.values()]);
    const s = { archiveRead: 0, archiveTotal: inputs.filter((i) => isArchive(i.name)).reduce((n, i) => n + i.file.size, 0), uploaded: 0, files: 0, skipped: 0 };
    let doneArchives = 0;
    const tick = () => setStats({ ...s });

    // --- upload queue with limited concurrency
    let active = 0;
    const waiters: (() => void)[] = [];
    const slot = async () => {
      while (active >= CONCURRENCY) await new Promise<void>((r) => waiters.push(r));
      active++;
    };
    const release = () => {
      active--;
      waiters.shift()?.();
    };
    const inflight: Promise<void>[] = [];

    async function uploadOne(path: string, blob: Blob): Promise<string> {
      const res = await withRetry(() => startUploads(batch, [{ path, size: blob.size }]));
      if (!res.ok || !res.plans) throw new Error(res.message ?? "Could not start upload");
      const plan: UploadPlan = res.plans[0];
      let sent = 0;
      if (plan.mode === "single") {
        await withRetry(() => put(plan.url, blob, (n) => ((s.uploaded += n - sent), (sent = n), tick())));
        s.uploaded += blob.size - sent;
      } else {
        const etags: { n: number; etag: string }[] = [];
        for (let i = 0; i < plan.urls.length; i += 3) {
          await Promise.all(
            plan.urls.slice(i, i + 3).map(async (url, k) => {
              const n = i + k + 1;
              const part = blob.slice((n - 1) * plan.partSize, n * plan.partSize);
              let partSent = 0;
              const etag = await withRetry(() => put(url, part, (x) => ((s.uploaded += x - partSent), (partSent = x), tick())));
              s.uploaded += part.size - partSent;
              etags.push({ n, etag });
            })
          );
        }
        const fin = await finishMultipart(plan.key, plan.uploadId, etags);
        if (!fin.ok) throw new Error(fin.message);
      }
      tick();
      return `s3:${plan.key}`;
    }

    async function accept(path: string, blob: Blob) {
      const m = path.match(DICT_FILE);
      if (!m) {
        s.skipped++;
        return;
      }
      const slash = path.lastIndexOf("/");
      const dir = slash >= 0 ? path.slice(0, slash) : "";
      const fileName = path.slice(slash + 1);
      const base = fileName.slice(0, -m[0].length);
      const ext = m[1].toLowerCase();
      const part: Part = ext === "ifo" ? "ifo" : ext.startsWith("idx") ? "idx" : ext.startsWith("dict") ? "dict" : "syn";
      const gk = `${dir}/${base}`.toLowerCase();
      let g = groupMap.get(gk);
      if (!g) {
        g = { key: gk, dir, base, refs: {}, bytes: 0, status: "uploading" };
        groupMap.set(gk, g);
      }
      g.bytes += blob.size;
      if (part === "ifo") {
        const info = Object.fromEntries(
          (await blob.text())
            .split(/\r?\n/)
            .filter((l) => l.includes("="))
            .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
        );
        g.name = info.bookname || base;
        g.words = Number(info.wordcount) || undefined;
      }
      if (part === "idx") g.sample = await sampleIdx(blob);
      sync();
      await slot();
      const group = g;
      const p = uploadOne(path, blob)
        .then((ref) => {
          group.refs[part] = ref;
          s.files++;
        })
        .catch((e) => {
          group.status = "error";
          group.message = (e as Error).message;
        })
        .finally(() => {
          release();
          sync();
          tick();
        });
      inflight.push(p);
    }

    try {
      // nested archives are processed after the outer ones (queue)
      const queue = [...inputs];
      while (queue.length) {
        const item = queue.shift()!;
        if (isArchive(item.name)) {
          const prefix = item.path.replace(/\.(zip|tar|tar\.gz|tgz)$/i, "");
          const before = s.archiveRead;
          const top = inputs.includes(item);
          await readArchive(
            item.file,
            item.name,
            (p) => DICT_FILE.test(p) || isArchive(p),
            async (p, blob) => {
              const full = `${prefix}/${p}`;
              if (isArchive(p)) queue.push({ path: full, file: blob, name: p });
              else await accept(full, blob);
            },
            top ? (n) => ((s.archiveRead = before + n), tick()) : undefined
          );
          if (top) doneArchives++;
        } else await accept(item.path, item.file);
      }
      await Promise.all(inflight);
    } catch (e) {
      setError(`Reading stopped: ${(e as Error).message}`);
      await Promise.all(inflight);
    }
    void doneArchives;

    // --- register every complete dictionary, one by one
    setPhase("adding");
    const all = [...groupMap.values()];
    for (const g of all) {
      if (g.status === "error") continue;
      if (!g.refs.ifo || !g.refs.idx || !g.refs.dict) {
        g.status = "incomplete";
        g.message = "Needs .ifo, .idx and .dict (or .dict.dz) together — skipped.";
        await discardUploads(Object.values(g.refs).filter(Boolean) as string[]);
        continue;
      }
      g.status = "waiting";
    }
    sync();
    for (const g of all) {
      if (g.status !== "waiting") continue;
      g.status = "adding";
      sync();
      const sch = scheme === "auto" ? guessScheme(`${g.dir} ${g.base} ${g.name ?? ""}`, g.sample ?? []) : scheme;
      try {
        const res = await addDictionary({
          name: g.name || g.base,
          scheme: sch,
          files: { ifo: g.refs.ifo!, idx: g.refs.idx!, dict: g.refs.dict!, ...(g.refs.syn ? { syn: g.refs.syn } : {}) },
          totalBytes: g.bytes,
        });
        g.status = res?.duplicate ? "duplicate" : res?.ok ? "done" : "error";
        g.message = res?.message;
      } catch (e) {
        g.status = "error";
        g.message = (e as Error).message;
      }
      sync();
    }
    setPhase("done");
    router.refresh();
  }

  const fromInput = (list: FileList | null) =>
    run(
      Array.from(list ?? []).map((f) => ({
        path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
        file: f,
        name: f.name,
      }))
    );

  const busy = phase === "reading" || phase === "adding";
  const counts = {
    done: groups.filter((g) => g.status === "done").length,
    dup: groups.filter((g) => g.status === "duplicate").length,
    err: groups.filter((g) => g.status === "error" || g.status === "incomplete").length,
  };
  const pickBtn = "a-btn a-btn-outline";

  return (
    <div>
      <div
        className={`rounded-xl border-2 border-dashed border-[var(--a-border)] bg-[var(--a-muted)]/40 p-6 text-center ${busy ? "pointer-events-none opacity-60" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          const files = await filesFromDrop(e.dataTransfer.items);
          if (files.length) void run(files.map((f) => ({ path: f.path, file: f.file, name: f.file.name })));
        }}
      >
        <UploadCloud className="mx-auto mb-3 text-[var(--a-fg-muted)]" size={30} strokeWidth={1.5} />
        <p className="mb-1 font-medium">Drop folders, archives or dictionary files here</p>
        <p className="mb-4 text-sm text-[var(--a-fg-muted)]">
          StarDict (as used by GoldenDict). Folders with sub-folders, .zip and .tar.gz — even very large ones — are fine; every dictionary inside is found.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className={pickBtn} onClick={() => folderRef.current?.click()}>
            <FolderOpen size={16} /> Choose folder
          </button>
          <button type="button" className={pickBtn} onClick={() => zipRef.current?.click()}>
            <FileArchive size={16} /> Choose .zip / .tar.gz
          </button>
          <button type="button" className={pickBtn} onClick={() => filesRef.current?.click()}>
            <Files size={16} /> Choose files
          </button>
        </div>
        <div className="mx-auto mt-4 flex max-w-xs items-center gap-2 text-left">
          <label className="shrink-0 text-xs text-[var(--a-fg-muted)]" htmlFor="dict-scheme">
            Headwords
          </label>
          <select id="dict-scheme" value={scheme} onChange={(e) => setScheme(e.target.value as Scheme)} className="a-input">
            {SCHEMES.map((x) => (
              <option key={x.v} value={x.v}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
        <input ref={filesRef} type="file" multiple hidden onChange={(e) => void fromInput(e.target.files)} />
        <input ref={zipRef} type="file" accept=".zip,.tar,.gz,.tgz" multiple hidden onChange={(e) => void fromInput(e.target.files)} />
        <input ref={folderRef} type="file" hidden multiple {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} onChange={(e) => void fromInput(e.target.files)} />
      </div>

      {phase !== "idle" && (
        <div className="mt-5 rounded-xl border border-[var(--a-border)] bg-[var(--a-card)] p-4 shadow-[var(--a-shadow-sm)]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            {busy && <Loader2 size={16} className="animate-spin" />}
            <span className="font-medium">
              {phase === "reading" ? "Reading and uploading…" : phase === "adding" ? "Preparing the dictionaries for search…" : "Finished"}
            </span>
            {stats.archiveTotal > 0 && (
              <span className="text-[var(--a-fg-muted)]">
                archive {Math.min(100, Math.round((stats.archiveRead / stats.archiveTotal) * 100))}%
              </span>
            )}
            <span className="text-[var(--a-fg-muted)]">
              {stats.files} files · {(stats.uploaded / 1048576).toFixed(1)} MB uploaded
            </span>
            {groups.length > 0 && (
              <span className="text-[var(--a-fg-muted)]">
                {groups.length} dictionaries found · {counts.done} added{counts.dup ? ` · ${counts.dup} already installed` : ""}
                {counts.err ? ` · ${counts.err} problems` : ""}
              </span>
            )}
          </div>
          {stats.archiveTotal > 0 && phase === "reading" && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--a-muted)]">
              <div className="h-full bg-[var(--a-primary)] transition-all" style={{ width: `${Math.min(100, (stats.archiveRead / stats.archiveTotal) * 100)}%` }} />
            </div>
          )}
          {busy && <p className="mt-2 text-xs text-[var(--a-fg-muted)]">Keep this tab open until it finishes.</p>}
          {error && <p className="mt-2 text-sm text-[var(--a-danger)]">{error}</p>}

          {groups.length > 0 && (
            <ul className="mt-4 max-h-[28rem] divide-y divide-[var(--a-border)] overflow-y-auto rounded-lg border border-[var(--a-border)]">
              {groups.map((g) => (
                <li key={g.key} className="flex items-start gap-3 px-3 py-2 text-sm">
                  <span className="mt-0.5">
                    {g.status === "done" ? (
                      <CheckCircle2 size={16} className="text-[var(--a-success)]" />
                    ) : g.status === "error" || g.status === "incomplete" ? (
                      <AlertCircle size={16} className="text-[var(--a-danger)]" />
                    ) : g.status === "duplicate" ? (
                      <MinusCircle size={16} className="text-[var(--a-fg-muted)]" />
                    ) : (
                      <Loader2 size={16} className="animate-spin text-[var(--a-fg-muted)]" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{g.name || g.base}</span>
                    <span className="block truncate text-xs text-[var(--a-fg-muted)]">
                      {g.dir || "(top folder)"} · {(g.bytes / 1048576).toFixed(1)} MB{g.words ? ` · ${g.words.toLocaleString()} words` : ""}
                      {g.message ? ` — ${g.message}` : g.status === "uploading" ? " — uploading" : g.status === "waiting" ? " — waiting" : g.status === "adding" ? " — preparing search" : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
