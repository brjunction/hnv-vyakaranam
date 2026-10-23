import { asc } from "drizzle-orm";
import { BookA, ExternalLink } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { dictionaries } from "@/lib/db/schema";
import { deleteDictionary, moveDictionary, reprocessDictionary, updateDictionary } from "@/lib/actions/dictionaries";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { MoveButtons } from "@/components/admin/hnv/bits";
import DictionaryUploader from "@/components/admin/dict/DictionaryUploader";

export const metadata = { title: "Dictionaries" };
// Adding a dictionary builds its search index (a few seconds for large ones).
export const maxDuration = 60;

const SCHEME_LABEL: Record<string, string> = {
  itrans: "ITRANS",
  iast: "IAST",
  devanagari: "Devanagari",
  hk: "Harvard-Kyoto",
  slp1: "SLP1",
  velthuis: "Velthuis",
  english: "English / other",
};

export default async function DictionariesAdmin() {
  const user = await requireUser("viewer");
  const canEdit = hasRole(user, "editor");
  const list = await getDb().select().from(dictionaries).orderBy(asc(dictionaries.sort), asc(dictionaries.id));

  return (
    <>
      <PageHeader
        title="Dictionaries"
        intro="Add dictionaries in StarDict format (the same files GoldenDict uses) — one, or hundreds at once from folders or archives. The files are kept as they are in Neon Object Storage and read directly; only their details are in the database. Searching works in Devanagari, IAST, ITRANS, Harvard-Kyoto or plain letters."
        actions={
          <a href="/tools/dictionary/search" target="_blank" rel="noreferrer" className="a-btn a-btn-outline">
            <ExternalLink size={15} /> Open the dictionary
          </a>
        }
      />

      {canEdit && (
        <Panel title="Add dictionaries" description="Choose the folder that contains the files, a .zip of it, or the files themselves. Several dictionaries can be added at once.">
          <DictionaryUploader />
        </Panel>
      )}

      <Panel
        title={`Installed (${list.length})`}
        description={`Searched in this order. Switch one off to hide it without deleting. Storage used: ${(list.reduce((n, d) => n + d.totalBytes, 0) / 1073741824).toFixed(2)} GB of 5 GB.`}
      >
        {list.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center text-[var(--a-fg-muted)]">
            <BookA size={28} strokeWidth={1.5} className="mb-3" />
            <p>No dictionaries yet.</p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {list.map((d) => (
              <li key={d.id} className="rounded-xl border border-[var(--a-border)] bg-[var(--a-bg)] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--a-card)] ring-1 ring-[var(--a-border)]">
                    <BookA size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {d.name}
                      {!d.isEnabled && <span className="ml-2 rounded-full bg-[var(--a-muted)] px-2 py-0.5 text-xs text-[var(--a-fg-muted)]">off</span>}
                    </p>
                    <p className="text-xs text-[var(--a-fg-muted)]">
                      {d.wordCount.toLocaleString()} headwords · {(d.totalBytes / 1048576).toFixed(1)} MB · headwords in {SCHEME_LABEL[d.headwordScheme]} · short name “{d.shortName}”
                    </p>
                  </div>
                  {canEdit && <MoveButtons action={moveDictionary} id={d.id} />}
                </div>
                {canEdit && (
                  <details className="mt-3 border-t border-[var(--a-border)] pt-3">
                    <summary className="cursor-pointer text-sm text-[var(--a-fg-muted)] hover:text-[var(--a-fg)]">Settings</summary>
                    <div className="mt-4 grid gap-6 lg:grid-cols-2">
                      <ActionForm action={updateDictionary} className="grid gap-3">
                        <input type="hidden" name="id" value={d.id} />
                        <Field label="Name">
                          <input name="name" defaultValue={d.name} required className={inputCls} />
                        </Field>
                        <Field label="Short name" hint="Shown on results, e.g. MW, Apte.">
                          <input name="shortName" defaultValue={d.shortName} className={inputCls} />
                        </Field>
                        <Field label="Source / licence">
                          <input name="source" defaultValue={d.source} className={inputCls} placeholder="e.g. Cologne Digital Sanskrit Dictionaries" />
                        </Field>
                        <Field label="Description">
                          <textarea name="description" rows={2} defaultValue={d.description} className={inputCls} />
                        </Field>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="isEnabled" defaultChecked={d.isEnabled} /> Searchable on the site
                        </label>
                        <div>
                          <SubmitButton>Save</SubmitButton>
                        </div>
                      </ActionForm>
                      <div className="grid content-start gap-6">
                        <ActionForm action={reprocessDictionary} className="grid gap-3">
                          <input type="hidden" name="id" value={d.id} />
                          <Field label="Headwords are written in" hint="If search results look wrong (e.g. ṟ instead of ṛ), change this and prepare again.">
                            <select name="scheme" defaultValue={d.headwordScheme} className={inputCls}>
                              {Object.entries(SCHEME_LABEL).map(([v, l]) => (
                                <option key={v} value={v}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <div>
                            <SubmitButton variant="ghost">Prepare search again</SubmitButton>
                          </div>
                        </ActionForm>
                        <ActionForm action={deleteDictionary} confirm={`Delete “${d.name}” and its files?`}>
                          <input type="hidden" name="id" value={d.id} />
                          <SubmitButton variant="danger">Delete dictionary</SubmitButton>
                        </ActionForm>
                      </div>
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
