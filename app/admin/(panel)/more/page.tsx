import Link from "next/link";
import { ChevronRight, ExternalLink, EyeOff, Plus } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { listMoreAdmin } from "@/lib/data/more";
import { moveMoreSection, saveMoreSection } from "@/lib/actions/more";
import { PageHeader, Panel } from "@/components/admin/ui";
import { MoveButtons } from "@/components/admin/hnv/bits";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import SectionFields from "@/components/admin/more/SectionFields";
import { KIND_INFO } from "@/lib/more/core";

export const metadata = { title: "More page" };
export const dynamic = "force-dynamic";

export default async function MoreAdmin() {
  const user = await requireUser("viewer");
  const canEdit = hasRole(user, "editor");
  const sections = await listMoreAdmin();
  return (
    <>
      <PageHeader
        title="More page"
        intro="Sections of the public /more page — blog posts, development progress, courses, YouTube playlists, resources. Add as many sections and items as you like; the order here is the order on the site."
        actions={
          <a href="/more" target="_blank" rel="noreferrer" className="a-btn a-btn-outline">
            View page <ExternalLink size={14} />
          </a>
        }
      />
      <div className="a-card mb-8 overflow-hidden">
        {sections.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--a-fg-muted)]">No sections yet — add the first one below.</p>
        ) : (
          <ul className="divide-y divide-[var(--a-border)]">
            {sections.map((s) => {
              const live = s.items.filter((i) => i.status === "published").length;
              const drafts = s.items.length - live;
              return (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--a-muted)]/40">
                  <Link href={`/admin/more/${s.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{s.title}</span>
                        <span className="rounded-full border border-[var(--a-border)] px-2 py-0.5 text-[11px] text-[var(--a-fg-muted)]">{KIND_INFO[s.kind].label}</span>
                        {!s.isVisible && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                            <EyeOff size={11} /> Hidden
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-[var(--a-fg-muted)]">
                        /more/{s.key} · {live} published{drafts ? ` · ${drafts} hidden` : ""}
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-[var(--a-fg-muted)]" />
                  </Link>
                  {canEdit && <MoveButtons action={moveMoreSection} id={s.id} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {canEdit && (
        <Panel title="Add a section">
          <ActionForm action={saveMoreSection} className="grid gap-4">
            <SectionFields />
            <div>
              <SubmitButton>
                <Plus size={15} /> Add section
              </SubmitButton>
            </div>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
