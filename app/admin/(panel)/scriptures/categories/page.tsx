import { Plus } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { listCategoriesAdmin } from "@/lib/data/scripturesAdmin";
import { deleteCategory, moveCategory, saveCategory } from "@/lib/actions/scriptures";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Crumbs, MoveButtons } from "@/components/admin/hnv/bits";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";

export const metadata = { title: "Scripture categories" };
export const dynamic = "force-dynamic";

export default async function Categories() {
  const user = await requireUser("viewer");
  const cats = await listCategoriesAdmin();
  const canEdit = hasRole(user, "editor");
  const sections = [...new Set(cats.map((c) => c.section).filter(Boolean))];
  return (
    <>
      <Crumbs items={[{ label: "Scriptures", href: "/admin/scriptures" }, { label: "Categories" }]} />
      <PageHeader title="Categories" intro="How the library is organised on /scriptures: sections (Primary scriptures, Gauḍīya scriptures …) contain categories; each book belongs to one category (set in the book's settings)." />
      <datalist id="sections">
        {sections.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <div className="a-card mb-8 overflow-hidden">
        <ul className="divide-y divide-[var(--a-border)]">
          {cats.map((c, i) => (
            <li key={c.id}>
              {(i === 0 || cats[i - 1].section !== c.section) && (
                <p className="bg-[var(--a-muted)]/60 px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--a-fg-muted)]">{c.section || "No section"}</p>
              )}
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 hover:bg-[var(--a-muted)]/40">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{c.name}</span>
                    {c.description && <span className="block truncate text-xs text-[var(--a-fg-muted)]">{c.description}</span>}
                  </span>
                  <span className="text-xs tabular-nums text-[var(--a-fg-muted)]">{c.books} books</span>
                  {canEdit && <MoveButtons action={moveCategory} id={c.id} />}
                </summary>
                {canEdit && (
                  <div className="grid gap-4 border-t border-[var(--a-border)] bg-[var(--a-muted)]/30 px-5 py-4 md:grid-cols-[1fr_auto]">
                    <ActionForm action={saveCategory} className="grid gap-3 sm:grid-cols-3">
                      <input type="hidden" name="id" value={c.id} />
                      <Field label="Name">
                        <input name="name" defaultValue={c.name} required className={inputCls} />
                      </Field>
                      <Field label="Section">
                        <input name="section" list="sections" defaultValue={c.section} className={inputCls} />
                      </Field>
                      <Field label="Description">
                        <input name="description" defaultValue={c.description} className={inputCls} />
                      </Field>
                      <div>
                        <SubmitButton>Save</SubmitButton>
                      </div>
                    </ActionForm>
                    <ActionForm action={deleteCategory} confirm={`Delete “${c.name}”? Its ${c.books} books stay, without a category.`}>
                      <input type="hidden" name="id" value={c.id} />
                      <SubmitButton variant="danger">Delete</SubmitButton>
                    </ActionForm>
                  </div>
                )}
              </details>
            </li>
          ))}
        </ul>
      </div>
      {canEdit && (
        <Panel title="Add a category">
          <ActionForm action={saveCategory} resetOnSuccess className="grid gap-3 sm:grid-cols-3">
            <Field label="Name">
              <input name="name" required placeholder="e.g. Purāṇa commentaries" className={inputCls} />
            </Field>
            <Field label="Section">
              <input name="section" list="sections" placeholder="Gauḍīya scriptures" className={inputCls} />
            </Field>
            <Field label="Description">
              <input name="description" className={inputCls} />
            </Field>
            <div>
              <SubmitButton>
                <Plus size={15} /> Add category
              </SubmitButton>
            </div>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
