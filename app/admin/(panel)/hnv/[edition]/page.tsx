import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquareText, Search } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { countDrafts, getEdition, listChaptersAdmin, listCommentaryTypesAdmin, listEditions } from "@/lib/data/hnvAdmin";
import { moveChapter, saveChapter } from "@/lib/actions/hnv";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { EDITION_NAMES, EditionSwitch, MoveButtons, PUBLIC_BASE, StatusBadge } from "@/components/admin/hnv/bits";

export const metadata = { title: "Chapters & sūtras" };

export default async function EditionAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ edition: string }>;
  searchParams: Promise<{ missing?: string }>;
}) {
  const user = await requireUser("viewer");
  const { edition: slug } = await params;
  const { missing } = await searchParams;
  const edition = await getEdition(slug);
  if (!edition) notFound();
  const [editions, list, types, drafts] = await Promise.all([
    listEditions(),
    listChaptersAdmin(edition.id),
    listCommentaryTypesAdmin(edition.id),
    countDrafts(edition.id),
  ]);
  const canEdit = hasRole(user, "editor");
  const total = list.reduce((n, c) => n + c.sutras, 0);

  return (
    <>
      <PageHeader
        title="Chapters & sūtras"
        intro="Everything in the Harināmāmṛta-vyākaraṇa: chapters, their sections, every sūtra with its vṛtti and translation, and any number of commentaries."
      />
      <EditionSwitch active={edition.slug} editions={editions.map((e) => ({ slug: e.slug, name: EDITION_NAMES[e.slug] ?? e.name }))} />

      <div className="grid gap-4 md:grid-cols-[1fr_auto] mb-6">
        <form action="/admin/hnv/find" className="flex gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <input type="hidden" name="edition" value={edition.slug} />
          <label className="sr-only" htmlFor="find-n">Sūtra number</label>
          <input id="find-n" name="n" placeholder="Go to sūtra number, e.g. 42" className={inputCls} inputMode="numeric" />
          <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-fg)]">
            <Search size={16} /> Open
          </button>
        </form>
        <Link
          href={`/admin/hnv/${edition.slug}/commentaries`}
          className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 hover:border-[var(--fg)]"
        >
          <MessageSquareText size={20} className="text-[var(--accent)]" />
          <span>
            <span className="block font-semibold">Commentaries</span>
            <span className="block text-sm text-[var(--fg-muted)]">
              {types.length} kind{types.length === 1 ? "" : "s"}
              {drafts ? ` · ${drafts} draft${drafts === 1 ? "" : "s"} to review` : ""}
            </span>
          </span>
        </Link>
      </div>

      {missing && (
        <p className="mb-6 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 p-4 text-sm">
          There is no sūtra numbered “{missing}” in the {EDITION_NAMES[edition.slug]} edition.
        </p>
      )}

      <Panel
        title={`${EDITION_NAMES[edition.slug] ?? edition.name} chapters`}
        aside={
          <span className="text-sm text-[var(--fg-muted)]">
            {total} sūtras ·{" "}
            <a href={PUBLIC_BASE[edition.slug]} target="_blank" rel="noreferrer" className="underline">
              view on site
            </a>
          </span>
        }
      >
        {list.length === 0 ? (
          <p className="text-[var(--fg-muted)]">No chapters yet. Add the first one below.</p>
        ) : (
          <ol className="divide-y divide-[var(--border)]">
            {list.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <span className="sutra-number w-8 shrink-0 text-center text-sm text-[var(--fg-muted)]">{c.number ?? "—"}</span>
                <Link href={`/admin/hnv/${edition.slug}/chapters/${c.id}`} className="min-w-0 flex-1 group">
                  <span className="block font-devanagari text-lg leading-snug group-hover:underline">{c.title}</span>
                  <span className="block text-sm text-[var(--fg-muted)]">
                    {c.titleEn} · {c.sections} section{c.sections === 1 ? "" : "s"} · {c.sutras} {c.kind === "verses" ? "verses" : "sūtras"}
                    {c.first && c.last ? ` (${c.first}–${c.last})` : ""}
                  </span>
                </Link>
                <StatusBadge status={c.status} />
                {canEdit && <MoveButtons action={moveChapter} id={c.id} />}
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {canEdit && (
        <Panel title="Add a chapter">
          <ActionForm action={saveChapter} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="editionId" value={edition.id} />
            <Field label="Title (Sanskrit / IAST)">
              <input name="title" required className={inputCls} placeholder="Nāma-prakaraṇa" />
            </Field>
            <Field label="English title">
              <input name="titleEn" className={inputCls} placeholder="Noun Declension" />
            </Field>
            <Field label="Chapter number" hint="Leave empty for Maṅgalācaraṇa, Afterword and similar.">
              <input name="number" inputMode="numeric" className={inputCls} />
            </Field>
            <Field label="Contains">
              <select name="kind" className={inputCls} defaultValue="sutras">
                <option value="sutras">Sūtras</option>
                <option value="verses">Verses (invocation, afterword…)</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Summary">
                <textarea name="summary" rows={2} className={inputCls} />
              </Field>
            </div>
            <input type="hidden" name="status" value="published" />
            <div className="sm:col-span-2">
              <SubmitButton>Add chapter</SubmitButton>
            </div>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
