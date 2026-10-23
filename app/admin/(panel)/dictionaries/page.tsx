import { asc } from "drizzle-orm";
import { BookA, ExternalLink, Plus } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { dictSections, dictionaries } from "@/lib/db/schema";
import { saveDictSection } from "@/lib/actions/dictionaries";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import DictBoard from "@/components/admin/dict/DictBoard";
import DictionaryUploader from "@/components/admin/dict/DictionaryUploader";
import StorageCleanup from "@/components/admin/dict/StorageCleanup";

export const metadata = { title: "Dictionaries" };
// Adding a dictionary builds its search index (a few seconds for large ones).
export const maxDuration = 60;


export default async function DictionariesAdmin() {
  const user = await requireUser("viewer");
  const canEdit = hasRole(user, "editor");
  const [list, secs] = await Promise.all([
    getDb().select().from(dictionaries).orderBy(asc(dictionaries.sort), asc(dictionaries.id)),
    getDb().select().from(dictSections).orderBy(asc(dictSections.sort), asc(dictSections.id)),
  ]);

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

      {canEdit && (
        <Panel title="Storage">
          <StorageCleanup />
        </Panel>
      )}

      <Panel
        title="Sections & order"
        description={`How the dictionary is organised on the site: sections (Sanskrit → English, Sanskrit → Sanskrit …) and the dictionaries in each, in the order they are shown. Storage used: ${(list.reduce((n, d) => n + d.totalBytes, 0) / 1073741824).toFixed(2)} GB of 5 GB.`}
      >
        {list.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center text-[var(--a-fg-muted)]">
            <BookA size={28} strokeWidth={1.5} className="mb-3" />
            <p>No dictionaries yet.</p>
          </div>
        ) : (
          <DictBoard
            canEdit={canEdit}
            sections={secs.map((s) => ({ id: s.id, name: s.name, description: s.description }))}
            dicts={list.map((d) => ({
              id: d.id,
              name: d.name,
              shortName: d.shortName,
              category: d.category,
              source: d.source,
              description: d.description,
              isEnabled: d.isEnabled,
              wordCount: d.wordCount,
              totalBytes: d.totalBytes,
              headwordScheme: d.headwordScheme,
              sectionId: d.sectionId,
            }))}
          />
        )}
        {canEdit && (
          <div className="mt-5 border-t border-[var(--a-border)] pt-4">
            <p className="mb-2 text-sm font-medium">Add a section</p>
            <ActionForm action={saveDictSection} resetOnSuccess className="grid gap-2 sm:grid-cols-[16rem_1fr_auto] sm:items-end">
              <Field label="Name">
                <input name="name" required placeholder="e.g. Sanskrit → Bengali" className={inputCls} />
              </Field>
              <Field label="Description">
                <input name="description" className={inputCls} />
              </Field>
              <SubmitButton>
                <Plus size={15} /> Add section
              </SubmitButton>
            </ActionForm>
          </div>
        )}
      </Panel>
    </>
  );
}
