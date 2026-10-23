import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, ExternalLink, Plus } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getSutraAdmin } from "@/lib/data/hnvAdmin";
import { countFollowing, deleteSutra, publishSutraDrafts, saveSutra } from "@/lib/actions/hnv";
import { Panel } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Crumbs, EDITION_NAMES, PUBLIC_BASE } from "@/components/admin/hnv/bits";
import { CommentaryFields, SutraFields } from "@/components/admin/hnv/SutraFields";
import { nextNumber } from "@/lib/hnv/numbering";

export const metadata = { title: "Edit sūtra" };

export default async function EditSutra({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await requireUser("viewer");
  const { id } = await params;
  const { created } = await searchParams;
  const data = await getSutraAdmin(Number(id));
  if (!data) notFound();
  const { sutra: s, chapter: ch, edition, sections, types, entries, prev, next } = data;
  const ed = edition.slug;
  const canEdit = hasRole(user, "editor");
  const canWrite = hasRole(user, "contributor");
  const following = canEdit ? Math.max(0, (await countFollowing(edition.id, nextNumber(s.number)))) : 0;
  const drafts = entries.filter((e) => e.status === "draft").length;
  const word = ch.kind === "verses" ? "Verse" : "Sūtra";

  return (
    <>
      <Crumbs
        items={[
          { label: "Chapters & sūtras", href: `/admin/hnv/${ed}` },
          { label: EDITION_NAMES[ed] ?? edition.name, href: `/admin/hnv/${ed}` },
          { label: ch.titleEn || ch.title, href: `/admin/hnv/${ed}/chapters/${ch.id}#sec-${s.subchapterId}` },
          { label: `${word} ${s.number}` },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-semibold">
          {word} <span className="sutra-number">{s.number}</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {prev && (
            <Link href={`/admin/hnv/sutras/${prev.id}`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 hover:border-[var(--fg)]">
              <ChevronLeft size={15} /> {prev.number}
            </Link>
          )}
          {next && (
            <Link href={`/admin/hnv/sutras/${next.id}`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 hover:border-[var(--fg)]">
              {next.number} <ChevronRight size={15} />
            </Link>
          )}
          <a
            href={`${PUBLIC_BASE[ed]}/${ch.slug}#${encodeURIComponent(s.number)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            View on site <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {created && (
        <p className="mb-6 rounded-xl border border-[var(--success)]/40 bg-[var(--success)]/5 p-4 text-sm">
          {word} {s.number} was added. Keep editing below, or{" "}
          <Link href={`/admin/hnv/sutras/new?section=${s.subchapterId}&after=${s.id}`} className="underline">
            add the next one
          </Link>
          .
        </p>
      )}

      <ActionForm action={saveSutra} className="pb-24">
        <input type="hidden" name="id" value={s.id} />
        <Panel title={word}>
          <SutraFields
            values={s}
            sections={sections}
            coreLocked={!canEdit}
            numberHint="Changing it here does not renumber other sūtras."
          />
        </Panel>

        <Panel
          title="Commentaries"
          aside={
            canEdit ? (
              <Link href={`/admin/hnv/${ed}/commentaries`} className="text-sm underline">
                Add or rename commentaries
              </Link>
            ) : undefined
          }
        >
          {types.length === 0 ? (
            <p className="text-[var(--fg-muted)]">
              No commentaries are set up for the {EDITION_NAMES[ed]} edition yet.
              {canEdit && (
                <>
                  {" "}
                  <Link href={`/admin/hnv/${ed}/commentaries`} className="underline">Add one</Link> (e.g. “Notes”, a ṭīkā,
                  an English explanation) and it appears here on every sūtra.
                </>
              )}
            </p>
          ) : (
            <CommentaryFields types={types} entries={entries} canPublish={canEdit} />
          )}
        </Panel>

        {canWrite && (
          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur lg:left-[248px]">
            <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3">
              <SubmitButton>Save {word.toLowerCase()} {s.number}</SubmitButton>
              <span className="text-xs text-[var(--fg-muted)]">The public page updates as soon as you save.</span>
            </div>
          </div>
        )}
      </ActionForm>

      {canEdit && drafts > 0 && (
        <Panel title="Drafts waiting">
          <p className="mb-3 text-[var(--fg-muted)]">
            {drafts} commentar{drafts === 1 ? "y is" : "ies are"} saved as draft on this sūtra (not shown on the site).
          </p>
          <ActionForm action={publishSutraDrafts}>
            <input type="hidden" name="id" value={s.id} />
            <SubmitButton variant="ghost">Publish all drafts</SubmitButton>
          </ActionForm>
        </Panel>
      )}

      {canEdit && (
        <div className="grid gap-6 md:grid-cols-2">
          <Panel title="Insert">
            <p className="mb-3 text-[var(--fg-muted)]">Add a new {word.toLowerCase()} right after this one.</p>
            <Link
              href={`/admin/hnv/sutras/new?section=${s.subchapterId}&after=${s.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)]"
            >
              <Plus size={16} /> Insert after {s.number}
            </Link>
          </Panel>
          <Panel title="Delete">
            <ActionForm action={deleteSutra} confirm={`Delete ${word.toLowerCase()} ${s.number} and its commentaries? This can't be undone from the admin.`}>
              <input type="hidden" name="id" value={s.id} />
              <label className="mb-4 flex items-start gap-2 text-sm">
                <input type="checkbox" name="closeGap" defaultChecked className="mt-1" />
                <span>
                  Renumber the following {word.toLowerCase()}s (−1)
                  {following > 0 && <span className="text-[var(--fg-muted)]"> — {following} will change</span>}
                </span>
              </label>
              <SubmitButton variant="danger">Delete {s.number}</SubmitButton>
            </ActionForm>
          </Panel>
        </div>
      )}
    </>
  );
}
