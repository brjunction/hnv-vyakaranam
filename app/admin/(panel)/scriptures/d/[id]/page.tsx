import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, ClipboardPaste, ExternalLink, FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getDivisionAdmin } from "@/lib/data/scripturesAdmin";
import { bulkAddVerses, createVerse, deleteDivision, moveDivision, moveVerse, publishDrafts, saveDivision, setVersesStatus } from "@/lib/actions/scriptures";
import { Panel } from "@/components/admin/ui";
import { Crumbs, MoveButtons } from "@/components/admin/hnv/bits";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { Coverage, Progress, StatusPill } from "@/components/admin/scriptures/bits";
import { AddDivisionForm, GenerateForm } from "@/components/admin/scriptures/DivisionForms";

export const metadata = { title: "Division" };
export const dynamic = "force-dynamic";

export default async function DivisionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("viewer");
  const { id } = await params;
  const data = await getDivisionAdmin(Number(id));
  if (!data) notFound();
  const { book, division: d, node, ancestors, children, types, verses, divComm, prev, next } = data;
  const canEdit = hasRole(user, "editor");
  const canWrite = hasRole(user, "contributor");
  const level = book.levels[d.depth] ?? "Division";
  const childLevel = book.levels[d.depth + 1];
  const isLast = d.depth >= book.levels.length - 1;
  const showVerses = isLast || verses.length > 0;
  const verseTypes = types.filter((t) => t.appliesTo !== "division");
  const divTypes = types.filter((t) => t.appliesTo !== "verse");
  const path = node?.path ?? [d.key];
  const label = `${level} ${d.number || d.key}`;
  const drafts = verses.reduce((n, v) => n + Object.values(v.cov).filter((s) => s === "draft").length, 0) + divComm.filter((c) => c.status === "draft").length;
  const filled = verses.reduce((n, v) => n + verseTypes.filter((t) => v.cov[t.id]).length, 0);

  return (
    <>
      <Crumbs
        items={[
          { label: "Scriptures", href: "/admin/scriptures" },
          { label: book.title, href: `/admin/scriptures/${book.code}` },
          ...ancestors.map((a) => ({ label: `${book.levels[a.depth] ?? ""} ${a.number}`, href: `/admin/scriptures/d/${a.id}` })),
          { label },
        ]}
      />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {label}
            {d.title && <span className="font-normal text-[var(--a-fg-muted)]">· {d.title}</span>}
            <StatusPill status={d.status} />
          </h1>
          {d.titleDeva && <p className="mt-1 font-devanagari text-lg text-[var(--a-fg-muted)]">{d.titleDeva}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {prev && (
            <Link href={`/admin/scriptures/d/${prev.id}`} className="a-btn a-btn-outline">
              <ChevronLeft size={15} /> {prev.path.join(".")}
            </Link>
          )}
          {next && (
            <Link href={`/admin/scriptures/d/${next.id}`} className="a-btn a-btn-outline">
              {next.path.join(".")} <ChevronRight size={15} />
            </Link>
          )}
          <a href={`/scriptures/${book.code}/${path.join("/")}`} target="_blank" rel="noreferrer" className="a-btn a-btn-outline">
            View on site <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_21rem]">
        <div className="min-w-0">
          {/* ------------------------------------------------ sub-divisions */}
          {childLevel && (children.length > 0 || canEdit) && (
            <Panel
              title={`${childLevel}s`}
              description={d.expectedChildren ? `${children.length} of ${d.expectedChildren} entered` : `${children.length} entered`}
              aside={d.expectedChildren ? <Progress value={children.length} max={d.expectedChildren} /> : undefined}
            >
              {children.length ? (
                <ul className="-my-2 divide-y divide-[var(--a-border)]">
                  {children.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 py-2.5">
                      <Link href={`/admin/scriptures/d/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-[var(--a-border)] px-1.5 text-xs font-semibold tabular-nums">{c.number}</span>
                        <span className="truncate font-medium">{c.title || `${childLevel} ${c.number}`}</span>
                        <StatusPill status={c.status} />
                      </Link>
                      <span className="text-xs tabular-nums text-[var(--a-fg-muted)]">
                        {c.verses} {book.verseLabel.toLowerCase()}s{c.expected ? ` / ${c.expected}` : ""}
                      </span>
                      {canEdit && <MoveButtons action={moveDivision} id={c.id} />}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--a-fg-muted)]">No {childLevel.toLowerCase()}s yet — add them on the right.</p>
              )}
            </Panel>
          )}

          {/* ------------------------------------------------------ verses */}
          {showVerses && (
            <Panel
              title={book.verseLabelPlural}
              description={`${verses.length}${d.expectedChildren && isLast ? ` of ${d.expectedChildren}` : ""} entered${verseTypes.length && verses.length ? ` · commentaries ${Math.round((filled / (verses.length * verseTypes.length)) * 100)}% filled` : ""}`}
              aside={
                canEdit ? (
                  <ActionForm action={createVerse}>
                    <input type="hidden" name="divisionId" value={d.id} />
                    <SubmitButton>
                      <Plus size={15} /> Add {book.verseLabel.toLowerCase()}
                    </SubmitButton>
                  </ActionForm>
                ) : undefined
              }
            >
              {verseTypes.length > 0 && verses.length > 0 && (
                <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--a-fg-muted)]">
                  <span>Dots:</span>
                  {verseTypes.map((t, i) => (
                    <span key={t.id}>
                      {i + 1}. {t.name}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--a-success)]" /> added
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-amber-500" /> draft
                  </span>
                </p>
              )}
              {verses.length === 0 ? (
                <p className="text-sm text-[var(--a-fg-muted)]">
                  No {book.verseLabelPlural.toLowerCase()} yet. Add one, paste many at once (right), or use the{" "}
                  <Link className="underline" href={`/admin/scriptures/${book.code}/spreadsheet`}>
                    spreadsheet
                  </Link>
                  .
                </p>
              ) : (
                <>
                  <div className="-mx-5 overflow-x-auto sm:-mx-6">
                    <table className="w-full min-w-[40rem] text-sm">
                      <thead>
                        <tr className="border-y border-[var(--a-border)] bg-[var(--a-muted)]/50 text-left text-xs text-[var(--a-fg-muted)]">
                          {canEdit && <th className="w-10 py-2 pl-5 sm:pl-6"></th>}
                          <th className="py-2 pl-2 pr-3 font-medium">No.</th>
                          <th className="py-2 pr-3 font-medium">Text</th>
                          {verseTypes.length > 0 && <th className="py-2 pr-3 font-medium">Commentaries</th>}
                          <th className="py-2 pr-5 text-right font-medium sm:pr-6"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {verses.map((v) => {
                          const first = (v.devanagari || v.iast).split(/\s*\/\s*/)[0];
                          return (
                            <tr key={v.id} className="group border-b border-[var(--a-border)] last:border-0 hover:bg-[var(--a-muted)]/40">
                              {canEdit && (
                                <td className="py-2 pl-5 sm:pl-6">
                                  <input type="checkbox" name="ids" value={v.id} form="bulk-verses" aria-label={`Select ${v.key}`} />
                                </td>
                              )}
                              <td className="whitespace-nowrap py-2 pl-2 pr-3">
                                <Link href={`/admin/scriptures/v/${v.id}`} className="font-semibold tabular-nums hover:underline">
                                  {v.verseNo}
                                </Link>
                              </td>
                              <td className="max-w-[26rem] py-2 pr-3">
                                <Link href={`/admin/scriptures/v/${v.id}`} className="flex items-center gap-2">
                                  <span className={`truncate ${v.devanagari ? "font-devanagari" : "italic"} ${first ? "" : "text-[var(--a-fg-muted)]"}`}>{first || "— no text yet —"}</span>
                                  <StatusPill status={v.status} />
                                </Link>
                              </td>
                              {verseTypes.length > 0 && (
                                <td className="py-2 pr-3">
                                  <Coverage types={verseTypes} cov={v.cov} />
                                </td>
                              )}
                              <td className="whitespace-nowrap py-2 pr-5 text-right sm:pr-6">
                                <span className="inline-flex items-center gap-1">
                                  <Link href={`/admin/scriptures/v/${v.id}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--a-border)] hover:bg-[var(--a-muted)]" aria-label="Edit">
                                    <Pencil size={13} />
                                  </Link>
                                  {canEdit && (
                                    <>
                                      <ActionForm action={createVerse} className="inline">
                                        <input type="hidden" name="divisionId" value={d.id} />
                                        <input type="hidden" name="after" value={v.id} />
                                        <input type="hidden" name="renumber" value="on" />
                                        <button
                                          type="submit"
                                          title={`Insert a new ${book.verseLabel.toLowerCase()} after ${v.key} (the following move up by one)`}
                                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--a-border)] hover:bg-[var(--a-muted)]"
                                        >
                                          <Plus size={13} />
                                        </button>
                                      </ActionForm>
                                      <MoveButtons action={moveVerse} id={v.id} />
                                    </>
                                  )}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {canEdit && (
                    <ActionForm id="bulk-verses" action={setVersesStatus} className="mt-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-[var(--a-fg-muted)]">With the ticked:</span>
                        <SubmitButton variant="ghost" name="status" value="published">
                          Publish
                        </SubmitButton>
                        <SubmitButton variant="ghost" name="status" value="draft">
                          Hide (draft)
                        </SubmitButton>
                      </div>
                    </ActionForm>
                  )}
                </>
              )}
            </Panel>
          )}

          {/* ------------------------------------------- details + prose */}
          <ActionForm action={saveDivision}>
            <input type="hidden" name="id" value={d.id} />
            <input type="hidden" name="bookId" value={book.id} />
            {d.parentId && <input type="hidden" name="parentId" value={d.parentId} />}
            <Panel title={`${level} details`}>
              <fieldset disabled={!canEdit} className="grid gap-4 disabled:opacity-70">
                <div className="grid gap-4 sm:grid-cols-[7rem_7rem_1fr]">
                  <Field label="Number (URL)" hint="Used in the address.">
                    <input name="key" required defaultValue={d.key} className={inputCls} />
                  </Field>
                  <Field label="Shown as">
                    <input name="number" defaultValue={d.number} className={inputCls} />
                  </Field>
                  <Field label="Status">
                    <select name="status" defaultValue={d.status} className={inputCls}>
                      <option value="published">Published</option>
                      <option value="draft">Draft (hidden, with everything inside)</option>
                      <option value="archived">Archived (hidden)</option>
                    </select>
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Title">
                    <input name="title" defaultValue={d.title} className={inputCls} />
                  </Field>
                  <Field label="Title in Devanagari">
                    <input name="titleDeva" defaultValue={d.titleDeva} className={`${inputCls} font-devanagari`} />
                  </Field>
                  <Field label="Subtitle">
                    <input name="subtitle" defaultValue={d.subtitle} placeholder="e.g. Arjuna-viṣāda-yoga" className={inputCls} />
                  </Field>
                  <Field label={`Expected number of ${(childLevel ?? book.verseLabel).toLowerCase()}s`} hint="Optional — shows progress.">
                    <input name="expected" type="number" min={0} defaultValue={d.expectedChildren ?? ""} className={inputCls} />
                  </Field>
                </div>
              </fieldset>
            </Panel>

            <Panel title="Text of this division" description={`Prose shown at the top of the ${level.toLowerCase()} — or the whole content, if it has no ${book.verseLabelPlural.toLowerCase()}.`}>
              {canEdit ? (
                <RichTextEditor name="bodyHtml" defaultValue={d.bodyHtml} placeholder="Introduction, summary, or the chapter’s full text…" minHeight={120} />
              ) : (
                <>
                  <input type="hidden" name="bodyHtml" value={d.bodyHtml} />
                  <div className="rich-content text-sm" dangerouslySetInnerHTML={{ __html: d.bodyHtml || "<p>—</p>" }} />
                </>
              )}
            </Panel>

            {divTypes.length > 0 && (
              <Panel title={`${level} commentaries`}>
                <div className="grid gap-6">
                  {divTypes.map((t) => {
                    const e = divComm.find((c) => c.typeId === t.id);
                    return (
                      <div key={t.id}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold">
                            {t.name}
                            {t.author && <span className="font-normal text-[var(--a-fg-muted)]"> · {t.author}</span>}
                          </span>
                          {canEdit && (
                            <select name={`cs_${t.id}`} defaultValue={e?.status ?? "published"} className="rounded-md border border-[var(--a-border)] bg-[var(--a-card)] px-2 py-1 text-xs">
                              <option value="published">Published</option>
                              <option value="draft">Draft</option>
                            </select>
                          )}
                        </div>
                        <RichTextEditor name={`c_${t.id}`} defaultValue={e?.html ?? ""} devanagari={t.language === "sanskrit"} placeholder={t.description || `${t.name}…`} />
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}


            {canWrite && (
              <div className="sticky bottom-4 z-20">
                <div className="a-card flex items-center gap-4 px-4 py-3 shadow-[var(--a-shadow-lg)]">
                  <SubmitButton>Save {label.toLowerCase()}</SubmitButton>
                  <span className="text-xs text-[var(--a-fg-muted)]">{canEdit ? "The public page updates as soon as you save." : "Your changes are saved as drafts."}</span>
                </div>
              </div>
            )}
          </ActionForm>
        </div>

        {/* ------------------------------------------------------- side */}
        <aside className="grid content-start gap-6">
          {canEdit && drafts > 0 && (
            <Panel title="Drafts waiting" description={`${drafts} commentary entr${drafts === 1 ? "y is" : "ies are"} saved as draft here.`}>
              <ActionForm action={publishDrafts}>
                <input type="hidden" name="divisionId" value={d.id} />
                <SubmitButton>Publish all drafts</SubmitButton>
              </ActionForm>
            </Panel>
          )}
          {canEdit && childLevel && (
            <>
              <Panel title={`Add a ${childLevel.toLowerCase()}`}>
                <AddDivisionForm bookId={book.id} parentId={d.id} level={childLevel} />
              </Panel>
              <Panel title={`Create many ${childLevel.toLowerCase()}s`}>
                <GenerateForm bookId={book.id} parentId={d.id} level={childLevel} suggestTo={d.expectedChildren} />
              </Panel>
            </>
          )}
          {canEdit && showVerses && (
            <Panel title={`Paste ${book.verseLabelPlural.toLowerCase()}`} description="Paste a whole chapter: one verse per block, separated by an empty line (lines inside a verse are kept). Devanagari and IAST are recognised.">
              <ActionForm action={bulkAddVerses} resetOnSuccess>
                <input type="hidden" name="divisionId" value={d.id} />
                <textarea name="text" rows={8} className={`${inputCls} font-devanagari text-sm`} placeholder={"धर्मक्षेत्रे कुरुक्षेत्रे\nसमवेता युयुत्सवः ।\n…॥ १ ॥\n\nदृष्ट्वा तु पाण्डवानीकं…"} />
                <div className="mt-3 grid gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="useMarkers" defaultChecked /> Take numbers from “॥ 12 ॥” markers
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="draft" /> Add as drafts (hidden)
                  </label>
                  <label className="flex items-center gap-2">
                    Otherwise start numbering at <input name="start" type="number" min={1} placeholder="next" className={`${inputCls} h-8 w-20`} />
                  </label>
                </div>
                <div className="mt-3">
                  <SubmitButton>
                    <ClipboardPaste size={15} /> Add them
                  </SubmitButton>
                </div>
              </ActionForm>
            </Panel>
          )}
          {canEdit && (
            <Panel title="Spreadsheet">
              <p className="mb-3 text-sm text-[var(--a-fg-muted)]">Fill many {book.verseLabelPlural.toLowerCase()} and commentaries in Excel.</p>
              <div className="flex flex-wrap gap-2">
                <a href={`/api/admin/scripture-template?book=${book.code}&division=${d.id}`} className="a-btn a-btn-outline">
                  <FileSpreadsheet size={15} /> Download this {level.toLowerCase()}
                </a>
                <Link href={`/admin/scriptures/${book.code}/spreadsheet`} className="a-btn a-btn-outline">
                  Upload
                </Link>
              </div>
            </Panel>
          )}
          {canEdit && (
            <Panel title={`Delete ${label.toLowerCase()}`}>
              <ActionForm action={deleteDivision} confirm={`Delete ${label}${verses.length || children.length ? " and everything in it" : ""}?`}>
                <input type="hidden" name="id" value={d.id} />
                {(verses.length > 0 || children.length > 0) && (
                  <label className="mb-3 flex items-start gap-2 text-sm">
                    <input type="checkbox" name="confirm" className="mt-1" />
                    <span>
                      Also delete what&apos;s inside ({children.length} {childLevel?.toLowerCase() ?? "division"}s, {verses.length} {book.verseLabelPlural.toLowerCase()})
                    </span>
                  </label>
                )}
                <SubmitButton variant="danger">
                  <Trash2 size={15} /> Delete
                </SubmitButton>
              </ActionForm>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}
