"use client";

import { useState } from "react";
import { Check, ImageUp, Loader2, Pin, TriangleAlert, X } from "lucide-react";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { saveMoreItem } from "@/lib/actions/more";
import { KIND_INFO, parseYouTube, type MoreItem, type MoreKind } from "@/lib/more/core";

// One form for every kind of item; it shows only the fields that kind uses.

type F = "subtitle" | "body" | "url" | "image" | "person" | "badge" | "stage" | "date" | "linkLabel";
const FIELDS: Record<MoreKind, F[]> = {
  posts: ["subtitle", "date", "person", "image", "badge", "body"],
  progress: ["stage", "subtitle", "date", "body"],
  courses: ["person", "subtitle", "url", "linkLabel", "image", "badge", "body"],
  videos: ["url", "person", "subtitle", "badge", "image"],
  links: ["url", "subtitle", "badge", "person", "image", "body"],
};
const LABELS: Record<MoreKind, Partial<Record<F, [string, string?]>>> = {
  posts: { subtitle: ["Summary", "One or two lines shown on the card."], person: ["Author"], badge: ["Tag", "e.g. Announcement, Article"], image: ["Cover picture"], body: ["Article"] },
  progress: { subtitle: ["Short note"], date: ["Date", "When it was finished (or is expected)."], body: ["Details (optional)", "Write here only if it deserves its own page."] },
  courses: { person: ["Teacher", "e.g. HG Param Sundar Prabhu"], subtitle: ["Short description"], url: ["Course link", "Registration or course page."], linkLabel: ["Button text", "Default: View course"], badge: ["Label", "e.g. Free, English, Live online"], image: ["Picture"], body: ["Full details (optional)", "Syllabus, schedule… gives the course its own page."] },
  videos: { url: ["YouTube link", "Paste a playlist link (…list=…) or a video link."], person: ["Speaker"], subtitle: ["Short description"], badge: ["Label", "e.g. Hindi, 42 videos"], image: ["Custom thumbnail (optional)", "Playlists show this; otherwise a dark cover."] },
  links: { url: ["Link", "Website, PDF, or a page on this site (/chapters)."], subtitle: ["Short description"], badge: ["Type", "e.g. PDF, Book, Website, App"], person: ["Author / publisher"], image: ["Icon or picture (optional)"], body: ["Page text (optional)", "Gives the resource its own page on this site."] },
};
const DEFAULT_LABEL: Record<F, string> = { subtitle: "Subtitle", body: "Text", url: "Link", image: "Picture", person: "Person", badge: "Label", stage: "Stage", date: "Date", linkLabel: "Button text" };

export default function ItemForm({ kind, sectionId, item }: { kind: MoreKind; sectionId: number; item?: MoreItem }) {
  const has = (f: F) => FIELDS[kind].includes(f);
  const lab = (f: F) => LABELS[kind][f]?.[0] ?? DEFAULT_LABEL[f];
  const hint = (f: F) => LABELS[kind][f]?.[1];
  const [image, setImage] = useState(item?.imageUrl ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [busy, setBusy] = useState(false);
  const [upErr, setUpErr] = useState("");
  const yt = kind === "videos" && url ? parseYouTube(url) : null;

  async function upload(f: File) {
    setBusy(true);
    setUpErr("");
    try {
      const body = new FormData();
      body.append("file", f);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed.");
      setImage(data.url);
    } catch (e) {
      setUpErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionForm action={saveMoreItem} className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="imageUrl" value={image} />

      <div className="a-card grid gap-4 p-5 sm:p-6">
        <Field label="Title">
          <input name="title" required defaultValue={item?.title} className={`${inputCls} text-base font-medium`} placeholder={`The ${KIND_INFO[kind].noun}’s title`} />
        </Field>

        {has("stage") && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Stage</legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["done", "Done"],
                  ["doing", "In progress"],
                  ["planned", "Planned"],
                ] as const
              ).map(([v, l]) => (
                <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--a-border)] px-3 py-2 text-sm has-[:checked]:border-[var(--a-primary)] has-[:checked]:bg-[var(--a-muted)]">
                  <input type="radio" name="stage" value={v} defaultChecked={(item?.stage || "planned") === v} className="accent-[var(--a-primary)]" /> {l}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {has("url") && (
          <Field label={lab("url")} hint={hint("url")}>
            <input name="url" value={url} onChange={(e) => setUrl(e.target.value)} type="text" inputMode="url" required={kind === "videos" || kind === "links"} placeholder="https://" className={inputCls} />
            {kind === "videos" && url && (
              <span className={`mt-1.5 flex items-center gap-1 text-xs ${yt ? "text-[var(--a-success)]" : "text-[var(--a-danger)]"}`}>
                {yt ? <Check size={13} /> : <TriangleAlert size={13} />}
                {yt ? (yt.list ? "YouTube playlist recognised — it will play on the page." : "YouTube video recognised.") : "This is not a YouTube link; it will open in a new tab."}
              </span>
            )}
          </Field>
        )}

        {has("person") && (
          <Field label={lab("person")} hint={hint("person")}>
            <input name="person" defaultValue={item?.person} className={inputCls} />
          </Field>
        )}
        {has("subtitle") && (
          <Field label={lab("subtitle")} hint={hint("subtitle")}>
            <textarea name="subtitle" rows={2} defaultValue={item?.subtitle} className={inputCls} />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {has("linkLabel") && (
            <Field label={lab("linkLabel")} hint={hint("linkLabel")}>
              <input name="linkLabel" defaultValue={item?.linkLabel} className={inputCls} />
            </Field>
          )}
          {has("badge") && (
            <Field label={lab("badge")} hint={hint("badge")}>
              <input name="badge" defaultValue={item?.badge} maxLength={40} className={inputCls} />
            </Field>
          )}
          {has("date") && (
            <Field label={lab("date")} hint={hint("date")}>
              <input name="date" type="date" defaultValue={item?.date ?? (kind === "posts" ? new Date().toISOString().slice(0, 10) : "")} className={inputCls} />
            </Field>
          )}
        </div>
        {has("body") && (
          <div>
            <span className="mb-1.5 block text-sm font-medium">{lab("body")}</span>
            {hint("body") && <span className="mb-1.5 block text-xs text-[var(--a-fg-muted)]">{hint("body")}</span>}
            <RichTextEditor name="bodyHtml" defaultValue={item?.bodyHtml ?? ""} placeholder="Write…" minHeight={kind === "posts" ? 320 : 140} />
          </div>
        )}
      </div>

      <aside className="grid content-start gap-4">
        <div className="a-card grid gap-3 p-5">
          <Field label="Visibility">
            <select name="status" defaultValue={item?.status ?? "published"} className={inputCls}>
              <option value="published">Published</option>
              <option value="draft">Draft (hidden)</option>
              <option value="archived">Archived (hidden)</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="pinned" defaultChecked={item?.pinned} className="accent-[var(--a-primary)]" />
            <Pin size={14} /> Pin to the top
          </label>
          <Field label="Address" hint="Leave empty to make it from the title.">
            <input name="slug" defaultValue={item?.slug} placeholder="auto" className={`${inputCls} font-mono text-xs`} />
          </Field>
          <SubmitButton className="w-full">{item ? "Save" : `Add ${KIND_INFO[kind].noun}`}</SubmitButton>
        </div>

        {has("image") && (
          <div className="a-card p-5">
            <span className="mb-1.5 block text-sm font-medium">{lab("image")}</span>
            {hint("image") && <span className="mb-2 block text-xs text-[var(--a-fg-muted)]">{hint("image")}</span>}
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--a-border)] bg-[var(--a-muted)]">
              {image ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setImage("")} className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white" aria-label="Remove picture">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-1 p-3 text-center text-xs text-[var(--a-fg-muted)]">
                  {busy ? <Loader2 size={20} className="animate-spin" /> : <ImageUp size={20} />}
                  {busy ? "Uploading…" : "Upload a picture"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
              )}
            </div>
            <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="…or paste a picture link" className={`${inputCls} mt-2 text-xs`} />
            {upErr && <p className="mt-1 text-xs text-[var(--a-danger)]">{upErr}</p>}
          </div>
        )}
      </aside>
    </ActionForm>
  );
}
