import { notFound } from "next/navigation";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getEdition, listCommentaryTypesAdmin } from "@/lib/data/hnvAdmin";
import { deleteCommentaryType, moveCommentaryType, saveCommentaryType } from "@/lib/actions/hnv";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { Crumbs, EDITION_NAMES, MoveButtons } from "@/components/admin/hnv/bits";

export const metadata = { title: "Commentaries" };

export default async function Commentaries({ params }: { params: Promise<{ edition: string }> }) {
  const user = await requireUser("viewer");
  const { edition: slug } = await params;
  const edition = await getEdition(slug);
  if (!edition) notFound();
  const types = await listCommentaryTypesAdmin(edition.id);
  const canEdit = hasRole(user, "editor");
  const name = EDITION_NAMES[edition.slug] ?? edition.name;

  return (
    <>
      <Crumbs items={[{ label: "Chapters & sūtras", href: `/admin/hnv/${edition.slug}` }, { label: name, href: `/admin/hnv/${edition.slug}` }, { label: "Commentaries" }]} />
      <PageHeader
        title="Commentaries"
        intro={`Each kind of commentary you add here (Notes, a ṭīkā, an English explanation…) gets its own rich-text box on every ${name} sūtra. On the site they appear under the vṛtti and translation, in this order.`}
      />

      {types.length === 0 && (
        <Panel>
          <p className="text-[var(--fg-muted)]">No commentaries yet.{canEdit ? " Add the first one below." : ""}</p>
        </Panel>
      )}

      {types.map((t) => (
        <Panel
          key={t.id}
          title={t.name}
          aside={
            <span className="flex items-center gap-3 text-sm text-[var(--fg-muted)]">
              on {t.entries} sūtra{t.entries === 1 ? "" : "s"}
              {!t.isVisible && " · hidden"}
              {canEdit && <MoveButtons action={moveCommentaryType} id={t.id} />}
            </span>
          }
        >
          {canEdit ? (
            <>
              <ActionForm action={saveCommentaryType} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="editionId" value={edition.id} />
                <Field label="Name">
                  <input name="name" required defaultValue={t.name} className={inputCls} />
                </Field>
                <Field label="Author" hint="Optional, shown next to the name.">
                  <input name="author" defaultValue={t.author} className={inputCls} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Description" hint="Optional; shown to editors as the placeholder.">
                    <input name="description" defaultValue={t.description} className={inputCls} />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" name="isVisible" defaultChecked={t.isVisible} /> Show on the public site
                </label>
                <div className="sm:col-span-2">
                  <SubmitButton variant="ghost">Save</SubmitButton>
                </div>
              </ActionForm>
              <details className="mt-4 border-t border-[var(--border)] pt-3 text-sm">
                <summary className="cursor-pointer text-[var(--fg-muted)] hover:text-[var(--fg)]">Delete this commentary</summary>
                <ActionForm action={deleteCommentaryType} confirm={`Delete “${t.name}”${t.entries ? ` and its text on ${t.entries} sūtras` : ""}?`} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  {t.entries > 0 && (
                    <label>
                      <span className="mb-1 block text-xs">Type DELETE to confirm ({t.entries} sūtras have text)</span>
                      <input name="confirm" className={inputCls} autoComplete="off" />
                    </label>
                  )}
                  <SubmitButton variant="danger">Delete</SubmitButton>
                </ActionForm>
              </details>
            </>
          ) : (
            <p className="text-[var(--fg-muted)]">{t.author || t.description || "—"}</p>
          )}
        </Panel>
      ))}

      {canEdit && (
        <Panel title="Add a commentary">
          <ActionForm action={saveCommentaryType} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="editionId" value={edition.id} />
            <Field label="Name">
              <input name="name" required className={inputCls} placeholder="Notes, Bālabodhinī-ṭīkā, Explanation…" />
            </Field>
            <Field label="Author" hint="Optional.">
              <input name="author" className={inputCls} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description" hint="Optional.">
                <input name="description" className={inputCls} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="isVisible" defaultChecked /> Show on the public site
            </label>
            <div className="sm:col-span-2">
              <SubmitButton>Add commentary</SubmitButton>
            </div>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
