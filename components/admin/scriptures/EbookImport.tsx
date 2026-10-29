"use client";

import { useRef, useState } from "react";
import { AlertTriangle, BookOpen, CheckCircle2, Loader2, Upload } from "lucide-react";
import { unzipSync, strFromU8 } from "fflate";
import { epubCss, epubDocuments } from "@/lib/scriptures/sb/epub";
import { parseBbtGita } from "@/lib/scriptures/bg/bbt";
import { GITA_KINDS } from "@/lib/scriptures/bg/kinds";
import { parseBbt, type BbtResult } from "@/lib/scriptures/sb/bbt";
import { parseVerseCollection, type VcResult } from "@/lib/scriptures/sb/vc";
import { parseCommentaries, repairSequence, type CommentaryVerse } from "@/lib/scriptures/sb/commentaries";
import { buildSb, type SbBuild } from "@/lib/scriptures/sb/build";
import { ensureCommentaryKinds, importScriptureRows, type ImportReport } from "@/lib/actions/scriptures";

// Admin › Scriptures › (book) › Import e-books — Śrīmad-Bhāgavatam or Bhagavad-gītā.
// Choose any of: Śrīla Prabhupāda's Bhāgavatam (BBT e-book), the BBT verse
// collection, the ācāryas' commentaries (.zip of e-books or single e-books).
// Everything is read here in the browser. Numbering and text follow Śrīla
// Prabhupāda; each ācārya's commentary is attached to the verse it explains
// (matched by the verse text). Preview first (nothing is written), then import.

type Found = { name: string; kind: "bbt" | "collection" | "commentary" | "ignored"; note: string };
type Phase = "idle" | "reading" | "ready" | "checking" | "checked" | "saving" | "saved";
type Total = Omit<ImportReport, "ok" | "message">;
const empty = (): Total => ({ created: 0, updated: 0, unchanged: 0, divisionsCreated: 0, errors: [] });

const MAX_ROWS = 120;
const MAX_BYTES = 2_400_000;

function classify(docs: { path: string; xhtml: string }[], book: "sb" | "bg"): Found["kind"] {
  const sample = docs.slice(0, 80).map((d) => d.xhtml).join("\n");
  if (book === "bg") {
    const text = sample.replace(/<[^>]+>/g, "");
    // Śrīla Prabhupāda's Gītā (Balarama letters: "uväca"), the commentaries "(3.1)"
    if (/\bTEXTS?\s+\d+/.test(text) && /uväca|Kåñëa/.test(text)) return "bbt";
    if (/^\s*\(\s*\d+\s*\.\s*\d+\s*\)\s*$/m.test(text)) return "commentary";
    return "ignored";
  }
  if (/verse-number-heading|class="text">TEXTS?\s/.test(sample) || /class="synonyms"/.test(sample)) return "bbt";
  if (/\|\|\s*\d+\.\d+\.\d+/.test(sample)) return "commentary";
  if (/class_sk[^>]*>\s*Texts?\s+\d/.test(sample) || /Canto\s+\d+\s*:/.test(sample)) return "collection";
  return "ignored";
}

export default function EbookImport({ bookId, bookTitle, book = "sb" }: { bookId: number; bookTitle: string; book?: "sb" | "bg" }) {
  const gita = book === "bg";
  const prabhupada = gita ? "Śrīla Prabhupāda’s Bhagavad-gītā As It Is" : "Śrīla Prabhupāda’s Bhāgavatam";
  const [found, setFound] = useState<Found[]>([]);
  const [build, setBuild] = useState<SbBuild | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState<Total>(empty());
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);

  async function read(files: FileList | null) {
    if (!files?.length) return;
    setPhase("reading");
    setError("");
    setBuild(null);
    setTotal(empty());
    const list: Found[] = [];
    let bbt: BbtResult | null = null;
    let vc: VcResult | null = null;
    const comm: CommentaryVerse[] = [];
    const repairs: string[] = [];
    const take = (name: string, bytes: Uint8Array) => {
      const files = unzipSync(bytes);
      const docs = epubDocuments(files, strFromU8);
      const kind = classify(docs, book);
      if (kind === "bbt") {
        bbt = gita ? parseBbtGita(docs, epubCss(files, strFromU8)) : parseBbt(docs);
        if (bbt.issues.length) repairs.push(...bbt.issues);
        list.push({ name, kind, note: `${bbt.verses.length} verses, ${bbt.chapters.length} chapters` });
      } else if (kind === "collection") {
        vc = parseVerseCollection(docs);
        list.push({ name, kind, note: `${vc.verses.length} verses` });
      } else if (kind === "commentary") {
        const vs = parseCommentaries(docs);
        if (gita) repairs.push(...repairSequence(vs).map((x) => `${name}: verse number ${x}`));
        comm.push(...vs);
        list.push({ name, kind: vs.length ? "commentary" : "ignored", note: vs.length ? `${vs.length} verses (${vs[0].ref} … ${vs[vs.length - 1].ref})` : "no verses found" });
      } else list.push({ name, kind, note: `not a ${gita ? "Gītā" : "Bhāgavatam"} e-book this import knows` });
      setFound([...list]);
    };
    try {
      for (const f of [...files]) {
        setStatus(`Reading ${f.name}…`);
        await new Promise((r) => setTimeout(r, 20)); // let the page repaint
        const bytes = new Uint8Array(await f.arrayBuffer());
        if (/\.zip$/i.test(f.name)) {
          const inner = unzipSync(bytes, { filter: (x) => /\.epub$/i.test(x.name) });
          for (const [n, b] of Object.entries(inner)) {
            setStatus(`Reading ${n.split("/").pop()}…`);
            await new Promise((r) => setTimeout(r, 10));
            take(n.split("/").pop() ?? n, b);
          }
        } else take(f.name, bytes);
      }
      setStatus("Matching the commentaries to Śrīla Prabhupāda’s verses…");
      await new Promise((r) => setTimeout(r, 20));
      if (!bbt && !vc) {
        setError(`Add ${prabhupada}${gita ? "" : " (or the verse collection)"} too: the verses and their numbering come from it.`);
        setPhase("idle");
        return;
      }
      setBuild(gita ? buildSb({ bbt, comm }, { location: (_c, ch) => String(ch), kinds: GITA_KINDS }) : buildSb({ bbt, vc, comm }));
      setNotes(repairs);
      setPhase("ready");
    } catch (e) {
      setError(`Could not read the files: ${(e as Error).message}`);
      setPhase("idle");
    } finally {
      setStatus("");
    }
  }

  async function run(dryRun: boolean) {
    if (!build) return;
    setError("");
    setPhase(dryRun ? "checking" : "saving");
    setProgress(0);
    const sum = empty();
    // the kinds of commentary must exist before rows can refer to them
    const k = await ensureCommentaryKinds(bookId, build.kinds).catch((e: Error) => ({ ok: false, message: e.message, created: [] as string[] }));
    if (!k.ok) {
      setError(k.message);
      setPhase("ready");
      return;
    }
    const batches: (typeof build.rows)[] = [];
    let cur: typeof build.rows = [];
    let bytes = 0;
    for (const r of build.rows) {
      const size = JSON.stringify(r).length;
      if (cur.length && (cur.length >= MAX_ROWS || bytes + size > MAX_BYTES)) {
        batches.push(cur);
        cur = [];
        bytes = 0;
      }
      cur.push(r);
      bytes += size;
    }
    if (cur.length) batches.push(cur);
    for (let i = 0; i < batches.length; i++) {
      const call = () =>
        importScriptureRows({ bookId, rows: batches[i], divisions: i === 0 ? build.divisions : [], dryRun, createDivisions: true }).catch(
          (e: Error) => ({ ok: false, message: e.message, ...empty() }) as ImportReport
        );
      let r = await call();
      if (!r.ok && !r.errors.length) r = await call(); // one retry after a network hiccup
      sum.created += r.created;
      sum.updated += r.updated;
      sum.unchanged += r.unchanged;
      sum.divisionsCreated += r.divisionsCreated;
      sum.errors.push(...r.errors);
      setTotal({ ...sum });
      setProgress((i + 1) / batches.length);
      if (!r.ok) {
        const first = batches[i][0];
        setError(`Stopped at ${first.location}.${first.verse}: ${r.message}${dryRun ? "" : " Everything before it was saved; run the import again to continue."}`);
        setPhase(dryRun ? "ready" : "checked");
        return;
      }
    }
    setPhase(dryRun ? "checked" : "saved");
  }

  const busy = phase === "reading" || phase === "checking" || phase === "saving";
  const r = build?.report;
  return (
    <div className="grid gap-6">
      <section className="a-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">1 · Choose the e-books</h2>
        <p className="mt-1 text-sm text-[var(--a-fg-muted)]">
          Choose all at once: {prabhupada} (.epub){gita ? "" : ", the verse collection (.epub)"} and the commentaries (.zip, or single .epub files). Verses, numbering,
          synonyms, translation and purport come from Śrīla Prabhupāda’s edition; the ācāryas’ commentaries are attached to the verse they explain. Reading takes{" "}
          {gita ? "a few seconds" : "about half a minute"}; nothing is uploaded.
        </p>
        <input ref={input} type="file" multiple accept=".epub,.zip,application/epub+zip,application/zip" className="hidden" onChange={(e) => read(e.target.files)} />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="a-btn a-btn-primary mt-4 inline-flex items-center gap-2">
          <Upload size={16} /> Choose files
        </button>
        {status && (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--a-fg-muted)]">
            <Loader2 size={14} className="animate-spin" /> {status}
          </p>
        )}
        {found.length > 0 && (
          <ul className="mt-4 grid gap-1 text-sm">
            {found.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <BookOpen size={15} className="mt-0.5 shrink-0" />
                <span>
                  <b>{f.name}</b> — {{ bbt: prabhupada, collection: "verse collection", commentary: "commentaries", ignored: "skipped" }[f.kind]}: {f.note}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {build && r && (
        <section className="a-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">2 · What was found</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["Verses", r.verses],
                ["Chapters", r.chapters],
                ["Commentated verses matched", r.commentaries.matched],
                ["Kinds of commentary", build.kinds.length],
              ] as [string, number][]
            ).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-[var(--a-border)] px-3 py-2">
                <dt className="text-xs text-[var(--a-fg-muted)]">{k}</dt>
                <dd className="text-lg font-semibold">{v.toLocaleString()}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm">
            Commentaries: {r.commentaries.byText.toLocaleString()} matched by the verse text, {r.commentaries.byNumberOnly.toLocaleString()} by the verse number only.
          </p>
          <p className="mt-1 text-xs text-[var(--a-fg-muted)]">
            {build.kinds.map((k) => `${k.name}${r.perKind[k.key] ? ` (${r.perKind[k.key].toLocaleString()})` : ""}`).join(" · ")}
          </p>
          {r.commentaries.unmatched.length > 0 && (
            <Box tone="warn" title={`${r.commentaries.unmatched.length} commentated verse(s) could not be matched — not imported`}>
              <ul className="grid gap-1 text-xs">
                {r.commentaries.unmatched.map((u) => (
                  <li key={u.ref}>
                    <b>{u.ref}</b> {u.text}
                  </li>
                ))}
              </ul>
            </Box>
          )}
          {notes.length > 0 && (
            <Box tone="warn" title={`${notes.length} note(s) on the e-books`}>
              <ul className="grid gap-1 text-xs">
                {notes.slice(0, 60).map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </Box>
          )}
          {r.textDiffers.length > 0 && (
            <Box tone="warn" title={`${r.textDiffers.length} verse(s) read differently in the e-book and the verse collection`}>
              <p className="text-xs">The verse collection's text is used when it is clearly the same verse; otherwise the e-book's.</p>
              <details className="mt-1">
                <summary className="cursor-pointer text-xs">Show them</summary>
                <ul className="mt-2 grid gap-2 text-xs">
                  {r.textDiffers.map((d) => (
                    <li key={d.ref}>
                      <b>{gita ? "Bg" : "SB"} {d.ref}</b>
                      <br />
                      e-book: {d.bbt}
                      <br />
                      collection: {d.collection}
                    </li>
                  ))}
                </ul>
              </details>
            </Box>
          )}
        </section>
      )}

      {build && (
        <section className="a-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">3 · Preview, then import into {bookTitle}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => run(true)} className="a-btn a-btn-outline">
              Preview changes
            </button>
            <button
              type="button"
              disabled={busy || (phase !== "checked" && phase !== "saved")}
              onClick={() => {
                if (window.confirm(`Import ${build.rows.length.toLocaleString()} verses into ${bookTitle}? Existing text is updated; nothing is deleted.`)) run(false);
              }}
              className="a-btn a-btn-primary"
              title={phase === "checked" || phase === "saved" ? "" : "Preview first"}
            >
              Import now
            </button>
          </div>
          {(phase === "checking" || phase === "saving") && (
            <div className="mt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--a-border)]">
                <div className="h-full bg-[var(--a-accent,var(--accent))]" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="mt-1 text-xs text-[var(--a-fg-muted)]">
                {phase === "checking" ? "Checking" : "Importing"} … {Math.round(progress * 100)}% (a full import takes a while — keep this page open)
              </p>
            </div>
          )}
          {error && <Box tone="warn" title="Stopped">{error}</Box>}
          {(phase === "checked" || phase === "saved" || total.created + total.updated + total.unchanged > 0) && (
            <Box tone="ok" title={phase === "saved" ? "Imported" : "Preview — nothing written yet"}>
              <p className="text-sm">
                {total.created.toLocaleString()} new verses · {total.updated.toLocaleString()} updated · {total.unchanged.toLocaleString()} unchanged · {total.divisionsCreated.toLocaleString()} new chapters
              </p>
              {total.errors.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs">{total.errors.slice(0, 40).map((e, i) => <li key={i}>{e}</li>)}</ul>}
            </Box>
          )}
        </section>
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
