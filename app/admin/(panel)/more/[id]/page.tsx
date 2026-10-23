import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Eye, EyeOff, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getMoreSectionAdmin } from "@/lib/data/more";
import { deleteMoreItem, deleteMoreSection, flagMoreItem, moveMoreItem, saveMoreSection } from "@/lib/actions/more";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Crumbs, MoveButtons } from "@/components/admin/hnv/bits";
import { StatusPill } from "@/components/admin/scriptures/bits";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import SectionFields from "@/components/admin/more/SectionFields";
import { KIND_INFO, STAGE_INFO, formatDate } from "@/lib/more/core";

export const metadata = { title: "More — section" };
export const dynamic = "force-dynamic";

function Flag({ id, what, title, children }: { id: number; what: string; title: string; children: React.ReactNode }) {
  return (
    <ActionForm action={flagMoreItem} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="what" value={what} />
      <button type="submit" title={title} aria-label={title} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--a-border)] hover:bg-[var(--a-muted)]">
        {children}
      </button>
    </ActionForm>
  );
}

export default async function SectionAdmin({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("viewer");
  const canEdit = hasRole(user, "editor");
  const s = await getMoreSectionAdmin(Number((await params).id));
  if (!s) notFound();
  const k = KIND_INFO[s.kind];
  return (
    <>
      <Crumbs items={[{ label: "More page", href: "/admin/more" }, { label: s.title }]} />
      <PageHeader
        title={s.title}
        intro={`${k.label} — ${k.hint}`}
        actions={
          <>
            <a href={`/more/${s.key}`} target="_blank" rel="noreferrer" className="a-btn a-btn-outline">
              View <ExternalLink size={14} />
            </a>
            {canEdit && (
              <Link href={`/admin/more/${s.id}/new`} className="a-btn a-btn-primary">
                <Plus size={15} /> Add {k.noun}
              </Link>
            )}
          </>
        }
      />

      <div className="a-card mb-6 overflow-hidden">
        {s.items.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--a-fg-muted)]">Nothing in this section yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--a-border)]">
            {s.items.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-[var(--a-muted)]/40">
                {i.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.imageUrl} alt="" className="h-10 w-14 shrink-0 rounded object-cover" />
                ) : null}
                <Link href={`/admin/more/i/${i.id}`} className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    {i.pinned && <Pin size={13} className="text-[var(--a-brand)]" />}
                    <span className="font-medium">{i.title}</span>
                    <StatusPill status={i.status} />
                    {i.stage && <span className="rounded-full border border-[var(--a-border)] px-2 py-0.5 text-[11px]">{STAGE_INFO[i.stage].label}</span>}
                  </span>
                  <span className="block truncate text-xs text-[var(--a-fg-muted)]">
                    {[formatDate(i.date), i.person, i.badge, i.url].filter(Boolean).join(" · ") || i.subtitle}
                  </span>
                </Link>
                {canEdit && (
                  <span className="flex items-center gap-1">
                    {i.pinned ? (
                      <Flag id={i.id} what="unpin" title="Unpin">
                        <PinOff size={14} />
                      </Flag>
                    ) : (
                      <Flag id={i.id} what="pin" title="Pin to the top">
                        <Pin size={14} />
                      </Flag>
                    )}
                    {i.status === "published" ? (
                      <Flag id={i.id} what="draft" title="Hide (make draft)">
                        <EyeOff size={14} />
                      </Flag>
                    ) : (
                      <Flag id={i.id} what="publish" title="Publish">
                        <Eye size={14} />
                      </Flag>
                    )}
                    <Link href={`/admin/more/i/${i.id}`} title="Edit" aria-label="Edit" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--a-border)] hover:bg-[var(--a-muted)]">
                      <Pencil size={14} />
                    </Link>
                    <MoveButtons action={moveMoreItem} id={i.id} />
                    <ActionForm action={deleteMoreItem} confirm={`Delete “${i.title}”?`} className="inline">
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" title="Delete" aria-label="Delete" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--a-border)] text-[var(--a-danger)] hover:bg-[var(--a-muted)]">
                        <Trash2 size={14} />
                      </button>
                    </ActionForm>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {s.kind === "posts" && <p className="-mt-3 mb-6 text-xs text-[var(--a-fg-muted)]">On the site, posts show pinned first, then newest first by date.</p>}

      {canEdit && (
        <Panel title="Section settings">
          <ActionForm action={saveMoreSection} className="grid gap-4">
            <input type="hidden" name="id" value={s.id} />
            <SectionFields s={s} />
            <div>
              <SubmitButton>Save section</SubmitButton>
            </div>
          </ActionForm>
          <div className="mt-6 border-t border-[var(--a-border)] pt-4">
            <ActionForm action={deleteMoreSection} confirm={`Delete the section “${s.title}” and all ${s.items.length} of its items? This cannot be undone.`}>
              <input type="hidden" name="id" value={s.id} />
              <SubmitButton variant="danger">Delete section</SubmitButton>
            </ActionForm>
          </div>
        </Panel>
      )}
    </>
  );
}
