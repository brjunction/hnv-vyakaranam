"use client";

import { Unzip, UnzipInflate } from "fflate";

// Streaming archive readers for the browser (no whole-archive buffering):
//   .zip               via fflate's streaming Unzip
//   .tar / .tar.gz/.tgz via DecompressionStream + a small tar parser
// Each regular file found is handed to `onFile(path, blob)` (awaited, so the
// caller can apply back-pressure). `want(path)` decides which files to keep;
// everything else is skipped without being stored.

export type OnFile = (path: string, blob: Blob) => Promise<void> | void;
export type Want = (path: string) => boolean;
export type OnProgress = (bytesRead: number) => void;

export const isArchive = (name: string) => /\.(zip|tar|tar\.gz|tgz)$/i.test(name);

export async function readArchive(file: Blob, name: string, want: Want, onFile: OnFile, onProgress?: OnProgress) {
  if (/\.zip$/i.test(name)) return readZip(file, want, onFile, onProgress);
  const gz = /\.(tar\.gz|tgz)$/i.test(name);
  let stream: ReadableStream<Uint8Array> = counted(file.stream(), onProgress);
  if (gz) stream = stream.pipeThrough(new DecompressionStream("gzip") as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  return readTar(stream, want, onFile);
}

function counted(stream: ReadableStream<Uint8Array>, onProgress?: OnProgress): ReadableStream<Uint8Array> {
  if (!onProgress) return stream;
  let n = 0;
  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctl) {
        n += chunk.length;
        onProgress(n);
        ctl.enqueue(chunk);
      },
    })
  );
}

// ------------------------------------------------------------------- zip
async function readZip(file: Blob, want: Want, onFile: OnFile, onProgress?: OnProgress) {
  const ready: { path: string; blob: Blob }[] = [];
  const errors: string[] = [];
  const uz = new Unzip();
  uz.register(UnzipInflate);
  uz.onfile = (f) => {
    if (f.name.endsWith("/") || !want(f.name)) return; // not started → skipped
    const chunks: Uint8Array[] = [];
    f.ondata = (err, data, final) => {
      if (err) {
        errors.push(`${f.name}: ${err.message}`);
        return;
      }
      chunks.push(data);
      if (final) ready.push({ path: f.name, blob: new Blob(chunks as BlobPart[]) });
    };
    f.start();
  };
  const reader = file.stream().getReader();
  let read = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      uz.push(new Uint8Array(0), true);
    } else {
      uz.push(value, false);
      read += value.length;
      onProgress?.(read);
    }
    while (ready.length) {
      const r = ready.shift()!;
      await onFile(r.path, r.blob);
    }
    if (done) break;
  }
  if (errors.length) throw new Error(errors.slice(0, 3).join("; "));
}

// ------------------------------------------------------------------- tar
async function readTar(stream: ReadableStream<Uint8Array>, want: Want, onFile: OnFile) {
  const reader = stream.getReader();
  const queue: Uint8Array[] = [];
  let queued = 0;
  let ended = false;

  async function fill(n: number) {
    while (queued < n && !ended) {
      const { value, done } = await reader.read();
      if (done) ended = true;
      else {
        queue.push(value);
        queued += value.length;
      }
    }
    return queued >= n;
  }
  function take(n: number): Uint8Array {
    const out = new Uint8Array(n);
    let o = 0;
    while (o < n) {
      const head = queue[0];
      const k = Math.min(head.length, n - o);
      out.set(head.subarray(0, k), o);
      o += k;
      if (k === head.length) queue.shift();
      else queue[0] = head.subarray(k);
    }
    queued -= n;
    return out;
  }
  async function takeChunks(n: number, keep: boolean): Promise<Uint8Array[]> {
    const parts: Uint8Array[] = [];
    let left = n;
    while (left > 0) {
      if (!(await fill(1))) throw new Error("The archive ended unexpectedly.");
      const head = queue[0];
      const k = Math.min(head.length, left);
      if (keep) parts.push(head.subarray(0, k));
      if (k === head.length) queue.shift();
      else queue[0] = head.subarray(k);
      queued -= k;
      left -= k;
    }
    return parts;
  }
  const dec = new TextDecoder();
  const str = (b: Uint8Array, s: number, l: number) => {
    const sub = b.subarray(s, s + l);
    const z = sub.indexOf(0);
    return dec.decode(z < 0 ? sub : sub.subarray(0, z));
  };

  let longName: string | null = null;
  let paxPath: string | null = null;
  let empty = 0;
  for (;;) {
    if (!(await fill(512))) break;
    const h = take(512);
    if (h.every((x) => x === 0)) {
      if (++empty >= 2) break;
      continue;
    }
    empty = 0;
    const type = String.fromCharCode(h[156] || 48);
    const size = parseInt(str(h, 124, 12).trim() || "0", 8) || 0;
    let name = str(h, 0, 100);
    if (str(h, 257, 5) === "ustar") {
      const prefix = str(h, 345, 155);
      if (prefix) name = `${prefix}/${name}`;
    }
    if (longName) {
      name = longName;
      longName = null;
    }
    if (paxPath) {
      name = paxPath;
      paxPath = null;
    }
    const pad = (512 - (size % 512)) % 512;
    if (type === "L" || type === "x") {
      const body = new Blob((await takeChunks(size, true)) as BlobPart[]);
      const text = await body.text();
      if (type === "L") longName = text.replace(/\0+$/, "");
      else paxPath = text.match(/\d+ path=([^\n]*)\n/)?.[1] ?? null;
    } else if ((type === "0" || type === "\0" || type === "7") && want(name)) {
      const parts = await takeChunks(size, true);
      await onFile(name, new Blob(parts as BlobPart[]));
    } else {
      await takeChunks(size, false);
    }
    if (pad) await takeChunks(pad, false);
  }
}
