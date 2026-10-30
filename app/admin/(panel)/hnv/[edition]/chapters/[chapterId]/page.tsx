import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getChapterAdmin } from "@/lib/data/hnvAdmin";
import { addSection, deleteChapter, deleteSection, moveSection, renameSection, saveChapter, saveChapterAudio } from "@/lib/actions/hnv";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { Crumbs, EDITION_NAMES, MoveButtons, PUBLIC_BASE, StatusBadge } from "@/components/admin/hnv/bits";

export const metadata = { title: "Chapter" };

export default async function ChapterAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ edition: string; chapterId: string }>;
  searchParams: Promise<{ deleted?: string }>;
}) {
  const user = await requireUser("viewer");
  const { chapterId } = await params;
  const { deleted } = await searchParams;
  const data = await getChapterAdmin(Number(chapterId));
  if (!data) notFound();
  const { chapter: ch, edition, sections, sutras } = data;
  const canEdit = hasRole(user, "editor");
  const ed = edition.slug;
  const loose = sutras.filter((s) => s.subchapterId === null || !sections.some((x) => x.id === s.subchapterId));

  return (
    <>
      <Crumbs
        items={[
          { label: "Chapters & sūtras", href: `/admin/hnv/${ed}` },
          { label: EDITION_NAMES[ed] ?? edition.name, href: `/admin/hnv/${ed}` },
          { label: ch.titleEn || ch.title },
        ]}
      />
      <PageHeader title={ch.title} intro={`${ch.titleEn}${ch.number !== null ? ` · Chapter ${ch.number}` : ""} · ${sutras.length} ${ch.kind === "verses" ? "verses" : "sūtras"} in ${sections.length} sections`} />
      <p className="-mt-5 mb-6 flex flex-wrap gap-4 text-sm">
        <a href={`${PUBLIC_BASE[ed]}/${ch.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline">
          View on site <ExternalLink size={14} />
        </a>
        {ch.status !== "published" && <StatusBadge status={ch.status} />}
      </p>

      {deleted && (
        <p className="mb-6 rounded-xl border border-[var(--success)]/40 bg-[var(--success)]/5 p-4 text-sm">Sūtra {deleted} was deleted.</p>
      )}

      {canEdit && (
        <details className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <summary className="cursor-pointer font-semibold">Chapter details</summary>
          <ActionForm action={saveChapter} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={ch.id} />
            <input type="hidden" name="editionId" value={ch.editionId} />
            <Field label="Title (Sanskrit / IAST)">
              <input name="title" required defaultValue={ch.title} className={inputCls} />
            </Field>
            <Field label="English title">
              <input name="titleEn" defaultValue={ch.titleEn} className={inputCls} />
            </Field>
            <Field label="Chapter number" hint="Empty for Maṅgalācaraṇa / Afterword.">
              <input name="number" inputMode="numeric" defaultValue={ch.number ?? ""} className={inputCls} />
            </Field>
            <Field label="Contains">
              <select name="kind" defaultValue={ch.kind} className={inputCls}>
                <option value="sutras">Sūtras</option>
                <option value="verses">Verses</option>
              </select>
            </Field>
            <Field
              label="Range label"
              hint="Only used for verse chapters (e.g. “2+4 Verses”). For sūtra chapters the range is calculated from the numbers automatically."
            >
              <input name="rangeLabel" defaultValue={ch.rangeLabel} className={inputCls} />
            </Field>
            <Field label="Status" hint="Draft and archived chapters are hidden from the site.">
              <select name="status" defaultValue={ch.status} className={inputCls}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Summary">
                <textarea name="summary" rows={3} defaultValue={ch.summary} className={inputCls} />
              </Field>
            </div>
            <p className="sm:col-span-2 text-xs text-[var(--fg-muted)]">
              Web address: <code>{PUBLIC_BASE[ed]}/{ch.slug}</code> (fixed, so existing links keep working).
            </p>
            <div className="sm:col-span-2">
              <SubmitButton>Save chapter</SubmitButton>
            </div>
          </ActionForm>
          {sutras.length === 0 && (
            <ActionForm action={deleteChapter} confirm="Delete this chapter and its (empty) sections?" className="mt-4 border-t border-[var(--border)] pt-4">
              <input type="hidden" name="id" value={ch.id} />
              <SubmitButton variant="danger">Delete chapter</SubmitButton>
            </ActionForm>
          )}
        </details>
      )}

      {sections.length === 0 && (
        <Panel>
          <p className="text-[var(--fg-muted)]">This chapter has no sections yet. Add one below, then add sūtras to it.</p>
        </Panel>
      )}

      {sections.map((sec, si) => {
        const list = sutras.filter((s) => s.subchapterId === sec.id);
        const last = list.at(-1);
        return (
          <section key={sec.id} id={`sec-${sec.id}`} className="mb-6 scroll-mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <header className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-5 py-3">
              <span className="text-xs font-semibold text-[var(--fg-muted)]">Section {si + 1}</span>
              <h2 className="font-devanagari text-xl flex-1 min-w-[12rem]">{sec.title}</h2>
              <span className="text-sm text-[var(--fg-muted)]">
                {list.length} {ch.kind === "verses" ? "verses" : "sūtras"}
                {list.length ? ` · ${list[0].number}–${last!.number}` : ""}
              </span>
              {canEdit && <MoveButtons action={moveSection} id={sec.id} />}
            </header>

            {canEdit && (
              <details className="border-b border-[var(--border)] px-5 py-2 text-sm">
                <summary className="cursor-pointer text-[var(--fg-muted)] hover:text-[var(--fg)]">Rename or delete section</summary>
                <div className="grid gap-4 py-3 md:grid-cols-2">
                  <ActionForm action={renameSection} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={sec.id} />
                    <label className="flex-1 min-w-[12rem]">
                      <span className="mb-1 block text-xs font-semibold">Title</span>
                      <input name="title" defaultValue={sec.title} className={inputCls} />
                    </label>
                    <SubmitButton variant="ghost">Rename</SubmitButton>
                  </ActionForm>
                  <ActionForm action={deleteSection} confirm={`Delete the section “${sec.title}”?`} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={sec.id} />
                    {list.length > 0 ? (
                      <label className="flex-1 min-w-[12rem]">
                        <span className="mb-1 block text-xs font-semibold">Its {list.length} sūtras go to</span>
                        <select name="mode" className={inputCls} defaultValue={si > 0 ? "prev" : "next"}>
                          {si > 0 && <option value="prev">the previous section</option>}
                          {si < sections.length - 1 && <option value="next">the next section</option>}
                        </select>
                      </label>
                    ) : (
                      <span className="flex-1 text-[var(--fg-muted)]">This section is empty.</span>
                    )}
                    <SubmitButton variant="danger">Delete section</SubmitButton>
                  </ActionForm>
                </div>
              </details>
            )}

            <ol className="divide-y divide-[var(--border)]">
              {list.map((s) => (
                <li key={s.id} className="group flex items-start gap-3 px-5 py-2.5">
                  <span className="sutra-number mt-0.5 shrink-0 rounded-full border border-[var(--accent)] px-2 py-0.5 text-xs text-[var(--accent)]">
                    {s.number}
                  </span>
                  <Link href={`/admin/hnv/sutras/${s.id}`} className="min-w-0 flex-1">
                    <span className="block font-devanagari leading-snug group-hover:underline">{s.sanskrit || <em className="text-[var(--fg-muted)]">no text yet</em>}</span>
                    <span className="block truncate text-sm italic text-[var(--fg-muted)]">{s.transliteration}</span>
                  </Link>
                  <span className="hidden shrink-0 items-center gap-1.5 text-[11px] text-[var(--fg-muted)] sm:flex">
                    <span title="Vṛtti" className={s.hasVrtti ? "text-[var(--success)]" : "opacity-40"}>V</span>
                    <span title="Translation" className={s.hasTranslation ? "text-[var(--success)]" : "opacity-40"}>T</span>
                    {s.commentaries > 0 && <span title="Commentaries">· {s.commentaries} comm.</span>}
                    {s.drafts > 0 && <span className="rounded-full bg-[var(--highlight)] px-1.5 text-[var(--fg)]">{s.drafts} draft</span>}
                    <StatusBadge status={s.status} />
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <Link
                      href={`/admin/hnv/sutras/${s.id}`}
                      title="Edit"
                      aria-label={`Edit sūtra ${s.number}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] hover:border-[var(--fg)]"
                    >
                      <Pencil size={13} />
                    </Link>
                    {canEdit && (
                      <Link
                        href={`/admin/hnv/sutras/new?section=${sec.id}&after=${s.id}`}
                        title="Insert a sūtra after this one"
                        aria-label={`Insert a sūtra after ${s.number}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] hover:border-[var(--fg)]"
                      >
                        <Plus size={14} />
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ol>

            {canEdit && (
              <div className="flex flex-wrap gap-3 px-5 py-3 text-sm">
                <Link
                  href={`/admin/hnv/sutras/new?section=${sec.id}${last ? `&after=${last.id}` : ""}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-1.5 hover:border-[var(--fg)]"
                >
                  <Plus size={14} /> Add {ch.kind === "verses" ? "verse" : "sūtra"} at the end
                </Link>
                {list.length > 0 && (
                  <Link
                    href={`/admin/hnv/sutras/new?section=${sec.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  >
                    <Plus size={14} /> at the start
                  </Link>
                )}
              </div>
            )}
          </section>
        );
      })}

      {loose.length > 0 && (
        <Panel title="Sūtras without a section">
          <ul className="space-y-1">
            {loose.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/hnv/sutras/${s.id}`} className="underline">
                  {s.number} {s.sanskrit}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {canEdit && (
        <Panel title="Add a section">
          <ActionForm action={addSection} resetOnSuccess className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <input type="hidden" name="chapterId" value={ch.id} />
            <Field label="Section title">
              <input name="title" required className={inputCls} placeholder="Viṣṇujana-sandhi" />
            </Field>
            <Field label="Position">
              <select name="after" className={inputCls} defaultValue="end">
                <option value="end">At the end</option>
                <option value="start">At the start</option>
                {sections.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    After {i + 1}. {s.title}
                  </option>
                ))}
              </select>
            </Field>
            <SubmitButton>Add section</SubmitButton>
          </ActionForm>
        </Panel>
      )}
      {canEdit && (
        <Panel title="Recitation audio">
          <p className="text-sm text-[var(--fg-muted)]">
            Links only (one per line, played in order) — e.g. from Google Drive, archive.org or SoundCloud. Readers can play the whole chapter (the chapter links, then every section&apos;s, in
            order) or one section.
          </p>
          <ActionForm action={saveChapterAudio} className="mt-4 grid gap-4">
            <input type="hidden" name="chapterId" value={ch.id} />
            <Field label="Whole chapter">
              <textarea name="audio" defaultValue={ch.audio} rows={2} className={inputCls} placeholder="https://…" />
            </Field>
            {sections.map((s, i) => (
              <Field key={s.id} label={`${i + 1}. ${s.title}`}>
                <textarea name={`sec-${s.id}`} defaultValue={s.audio} rows={1} className={inputCls} placeholder="https://…" />
              </Field>
            ))}
            <SubmitButton>Save audio links</SubmitButton>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
