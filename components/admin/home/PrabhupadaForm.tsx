"use client";

import { useState } from "react";
import { ImageUp, Loader2, X } from "lucide-react";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { savePrabhupadaBlock } from "@/lib/actions/home";

export default function PrabhupadaForm({ v }: { v: { author: string; imageUrl: string; quotes: { text: string; source: string }[] } }) {
  const [image, setImage] = useState(v.imageUrl);
  const [quotes, setQuotes] = useState(v.quotes.length ? v.quotes : [{ text: "", source: "" }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function upload(f: File) {
    setBusy(true);
    setErr("");
    try {
      const body = new FormData();
      body.append("file", f);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed.");
      setImage(data.url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ActionForm action={savePrabhupadaBlock} className="grid gap-5 lg:grid-cols-[16rem_1fr]">
      <input type="hidden" name="imageUrl" value={image} />
      <div>
        <span className="mb-1.5 block text-sm font-medium">Photo of Śrīla Prabhupāda</span>
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--a-border)] bg-[var(--a-muted)]">
          {image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setImage("")} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white" aria-label="Remove picture">
                <X size={14} />
              </button>
            </>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-1 p-4 text-center text-xs text-[var(--a-fg-muted)]">
              {busy ? <Loader2 size={22} className="animate-spin" /> : <ImageUp size={22} />}
              {busy ? "Uploading…" : "Upload a photo (portrait works best)"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
          )}
        </div>
        {err && <p className="mt-1 text-xs text-[var(--a-danger)]">{err}</p>}
        <p className="mt-2 text-xs text-[var(--a-fg-muted)]">Use a photo you have permission to use.</p>
      </div>
      <div className="grid content-start gap-4">
        <Field label="Spoken / written by">
          <input name="author" defaultValue={v.author} className={inputCls} />
        </Field>
        {quotes.map((q, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-[var(--a-border)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quote {i + 1}</span>
              {quotes.length > 1 && (
                <button type="button" onClick={() => setQuotes((x) => x.filter((_, j) => j !== i))} className="text-xs text-[var(--a-danger)]">
                  Remove
                </button>
              )}
            </div>
            <textarea name="qtext" rows={5} value={q.text} onChange={(e) => setQuotes((x) => x.map((y, j) => (j === i ? { ...y, text: e.target.value } : y)))} className={inputCls} />
            <input name="qsource" value={q.source} onChange={(e) => setQuotes((x) => x.map((y, j) => (j === i ? { ...y, source: e.target.value } : y)))} placeholder="Reference, e.g. Śrī Caitanya-caritāmṛta, Ādi-līlā 13.29, purport" className={inputCls} />
          </div>
        ))}
        <button type="button" onClick={() => setQuotes((x) => [...x, { text: "", source: "" }])} className="a-btn a-btn-outline w-fit">
          Add a quote
        </button>
        <div>
          <SubmitButton>Save</SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}
