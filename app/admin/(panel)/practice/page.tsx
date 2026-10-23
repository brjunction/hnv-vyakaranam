import Link from "next/link";
import { hasRole, requireUser } from "@/lib/auth/session";
import { listTopicsAdmin, madhyamaChapters } from "@/lib/data/practiceAdmin";
import { moveTopic, saveTopic } from "@/lib/actions/practice";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { MoveButtons, StatusBadge } from "@/components/admin/hnv/bits";
import TopicFields from "@/components/admin/practice/TopicFields";

export const metadata = { title: "Practice" };

export default async function PracticeAdmin() {
  const user = await requireUser("viewer");
  const [chapters, topics] = await Promise.all([madhyamaChapters(), listTopicsAdmin()]);
  const canEdit = hasRole(user, "editor");
  const total = topics.reduce((n, t) => n + t.total, 0);

  return (
    <>
      <PageHeader
        title="Practice"
        intro={`Topics and questions for the Practice page — ${topics.length} topics, ${total} questions. A chapter appears as “ready” on the site as soon as it has a published topic with published questions.`}
      />
      <p className="-mt-4 mb-6 text-sm">
        <a href="/practice" target="_blank" rel="noreferrer" className="underline">Open Practice on the site</a>
      </p>

      {chapters.map((c) => {
        const list = topics.filter((t) => t.chapterId === c.id);
        if (!list.length) return null;
        return (
          <Panel key={c.id} title={c.title} aside={<span className="text-sm text-[var(--fg-muted)]">{c.titleEn}</span>}>
            <ol className="divide-y divide-[var(--border)]">
              {list.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <Link href={`/admin/practice/topics/${t.id}`} className="min-w-0 flex-1 group">
                    <span className="block font-devanagari text-lg group-hover:underline">{t.title}</span>
                    <span className="block text-sm text-[var(--fg-muted)]">
                      {t.subtitle} · {t.published} published{t.total !== t.published ? ` · ${t.total - t.published} hidden/draft` : ""}
                    </span>
                  </Link>
                  <StatusBadge status={t.status} />
                  {canEdit && <MoveButtons action={moveTopic} id={t.id} />}
                </li>
              ))}
            </ol>
          </Panel>
        );
      })}

      {canEdit && (
        <Panel title="Add a topic">
          <ActionForm action={saveTopic} className="grid gap-4">
            <TopicFields
              t={{ chapterId: chapters.find((c) => c.slug === "nama-prakarana")?.id ?? chapters[0]?.id ?? 0, title: "", subtitle: "", sutraFrom: "", sutraTo: "", status: "published" }}
              chapters={chapters}
            />
            <div>
              <SubmitButton>Add topic</SubmitButton>
            </div>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
