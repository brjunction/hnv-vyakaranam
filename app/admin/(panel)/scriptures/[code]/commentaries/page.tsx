import { notFound } from "next/navigation";
import { Eye, EyeOff, Plus } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getBookAdmin } from "@/lib/data/scripturesAdmin";
import { deleteCommentaryType, moveCommentaryType, saveCommentaryType } from "@/lib/actions/scriptures";
import { Panel } from "@/components/admin/ui";
import { Crumbs, MoveButtons } from "@/components/admin/hnv/bits";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { BookTabs } from "@/components/admin/scriptures/bits";

export const metadata = { title: "Commentaries" };
export const dynamic = "force-dynamic";

type T = {
  id?: number;
  name?: string;
  nameDeva?: string;
  author?: string;
  description?: string;
  language?: string;
  appliesTo?: string;
  pane?: string;
  isVisible?: boolean;
};

function TypeFields({ t, bookId }: { t: T; bookId: number }) {
  return (
    <div className="grid gap-4">
      <input type="hidden" name="bookId" value={bookId} />
      {t.id && <input type="hidden" name="id" value={t.id} />}
      <input type="hidden" name="visibleField" value="1" />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <input name="name" required defaultValue={t.name} placeholder="Sārārtha-varṣiṇī" className={inputCls} />
        </Field>
        <Field label="Name in Devanagari (optional)">
          <input name="nameDeva" defaultValue={t.nameDeva} className={`${inputCls} font-devanagari`} />
        </Field>
        <Field label="Author">
          <input name="author" defaultValue={t.author} placeholder="Śrīla Viśvanātha Cakravartī Ṭhākura" className={inputCls} />
        </Field>
        <Field label="Language" hint="Everything follows the reader’s script (Devanagari / IAST / Bengali / Odia) — except English, which is never converted. Inside any text, a part can be marked English in the editor.">
          <select name="language" defaultValue={t.language ?? "english"} className={inputCls}>
            <option value="sanskrit">Sanskrit</option>
            <option value="english">English — never converted</option>
            <option value="bengali">Bengali</option>
            <option value="hindi">Hindi</option>
            <option value="nepali">Nepali</option>
            <option value="odia">Odia</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Written for">
          <select name="appliesTo" defaultValue={t.appliesTo ?? "verse"} className={inputCls}>
            <option value="verse">Each verse</option>
            <option value="division">Each chapter / division (e.g. a chapter summary)</option>
            <option value="both">Both</option>
          </select>
        </Field>
        <Field label="What it is" hint="Anvaya and Translation belong to the verse and have their own design; commentaries go to the commentary pane.">
          <select name="pane" defaultValue={t.pane ?? "commentary"} className={inputCls}>
            <option value="anvaya">Anvaya (prose order) — own block under the verse</option>
            <option value="translation">Translation — own block under the verse</option>
            <option value="verse">Word-for-word / synonyms — under the verse</option>
            <option value="commentary">Commentary (purport, ṭīkā …) — commentary pane</option>
          </select>
        </Field>
      </div>
      <Field label="Note for editors (optional)">
        <input name="description" defaultValue={t.description} placeholder="What goes here" className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isVisible" defaultChecked={t.isVisible ?? true} /> Shown on the site
      </label>
    </div>
  );
}

const ROLE: Record<string, string> = { anvaya: "Anvaya", translation: "Translation", verse: "Word-for-word", commentary: "Commentary" };
const TARGET: Record<string, string> = { verse: "Verses", division: "Chapters", both: "Verses & chapters" };

export default async function Commentaries({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser("viewer");
  const { code } = await params;
  const data = await getBookAdmin(code);
  if (!data) notFound();
  const { book, types } = data;
  const canEdit = hasRole(user, "editor");

  return (
    <>
      <Crumbs items={[{ label: "Scriptures", href: "/admin/scriptures" }, { label: book.title, href: `/admin/scriptures/${book.code}` }, { label: "Commentaries" }]} />
      <h1 className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl">{book.title}</h1>
      <BookTabs code={book.code} active="commentaries" />
      <p className="mb-6 max-w-3xl text-sm text-[var(--a-fg-muted)]">
        Every kind of text that accompanies the verses. The Anvaya and the Translation belong to the verse itself (own design, under the verse); purports and
        any number of ṭīkās are commentaries (the commentary pane). Each kind gets its own rich-text
        editor (tables and pictures allowed) on every verse, and its own tab in the reader. The order here is the order in the reader.
      </p>

      <div className="a-card mb-8 overflow-hidden">
        {types.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--a-fg-muted)]">No commentaries yet — add the first one below.</p>
        ) : (
          <ul>
            {types.map((t) => (
              <li key={t.id} className="border-b border-[var(--a-border)] last:border-0">
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-[var(--a-muted)]/50">
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{t.name}</span>
                      {t.nameDeva && <span className="ml-2 font-devanagari text-sm text-[var(--a-fg-muted)]">{t.nameDeva}</span>}
                      {t.author && <span className="block text-xs text-[var(--a-fg-muted)]">{t.author}</span>}
                    </span>
                    <span className="rounded-full bg-[var(--a-muted)] px-2 py-0.5 text-xs">{TARGET[t.appliesTo]}</span>
                    <span className="rounded-full bg-[var(--a-muted)] px-2 py-0.5 text-xs capitalize">{t.language}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.pane === "commentary" ? "bg-[var(--a-muted)]" : "bg-amber-500/15 text-amber-800 dark:text-amber-200"}`}>{ROLE[t.pane]}</span>
                    <span className="text-xs tabular-nums text-[var(--a-fg-muted)]">{t.entries.toLocaleString()} entries</span>
                    {t.isVisible ? <Eye size={15} className="text-[var(--a-fg-muted)]" /> : <EyeOff size={15} className="text-[var(--a-danger)]" aria-label="Hidden" />}
                    {canEdit && <MoveButtons action={moveCommentaryType} id={t.id} />}
                  </summary>
                  {canEdit && (
                    <div className="grid gap-6 border-t border-[var(--a-border)] bg-[var(--a-muted)]/30 px-5 py-5 lg:grid-cols-[1fr_16rem]">
                      <ActionForm action={saveCommentaryType}>
                        <TypeFields t={t} bookId={book.id} />
                        <div className="mt-4">
                          <SubmitButton>Save</SubmitButton>
                        </div>
                      </ActionForm>
                      <ActionForm action={deleteCommentaryType} confirm={`Delete “${t.name}”?`}>
                        <input type="hidden" name="id" value={t.id} />
                        <p className="mb-2 text-sm font-medium">Delete</p>
                        {t.entries > 0 && (
                          <>
                            <p className="mb-2 text-xs text-[var(--a-fg-muted)]">Its {t.entries} entries are deleted too. Type the name to confirm:</p>
                            <input name="confirm" className={`${inputCls} mb-2`} autoComplete="off" />
                          </>
                        )}
                        <SubmitButton variant="danger">Delete “{t.name}”</SubmitButton>
                      </ActionForm>
                    </div>
                  )}
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canEdit && (
        <Panel title="Add a commentary" description="Anvaya, a translation, word-for-word, a ṭīkā, a purport, a summary for each chapter …">
          <ActionForm action={saveCommentaryType} resetOnSuccess>
            <TypeFields t={{}} bookId={book.id} />
            <div className="mt-4">
              <SubmitButton>
                <Plus size={15} /> Add commentary
              </SubmitButton>
            </div>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
