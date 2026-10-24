import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getTopicAdmin, madhyamaChapters } from "@/lib/data/practiceAdmin";
import { deleteTopic, saveTopic } from "@/lib/actions/practice";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { Crumbs, StatusBadge } from "@/components/admin/hnv/bits";
import { typeInfo } from "@/lib/practice/sections";
import TopicFields from "@/components/admin/practice/TopicFields";

export const metadata = { title: "Practice topic" };

const DIFF_COLOR: Record<string, string> = { easy: "#4caf7d", medium: "var(--color-saffron)", hard: "var(--color-vermillion)" };

export default async function TopicAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ added?: string }> }) {
  const user = await requireUser("viewer");
  const data = await getTopicAdmin(Number((await params).id));
  if (!data) notFound();
  const { added } = await searchParams;
  const { topic: t, chapter, questions } = data;
  const canEdit = hasRole(user, "editor");
  const canWrite = hasRole(user, "contributor");
  const chapters = canEdit ? await madhyamaChapters() : [];

  return (
    <>
      <Crumbs items={[{ label: "Practice", href: "/admin/practice" }, { label: chapter?.title ?? "" }, { label: t.title }]} />
      <PageHeader title={t.title} intro={`${t.subtitle} · ${questions.length} question${questions.length === 1 ? "" : "s"}`} />

      {added && (
        <p className="mb-6 rounded-xl border border-[var(--success)]/40 bg-[var(--success)]/5 p-4 text-sm">
          Question added.{" "}
          <Link href={`/admin/practice/questions/new?topic=${t.id}`} className="underline">Add another</Link>
        </p>
      )}

      <Panel
        title="Questions"
        aside={
          canWrite ? (
            <Link
              href={`/admin/practice/questions/new?topic=${t.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--accent-fg)]"
            >
              <Plus size={15} /> Add question
            </Link>
          ) : undefined
        }
      >
        {questions.length === 0 ? (
          <p className="text-[var(--fg-muted)]">No questions yet.</p>
        ) : (
          <ol className="divide-y divide-[var(--border)]">
            {questions.map((q) => (
              <li key={q.id}>
                <Link href={`/admin/practice/questions/${q.id}`} className="group flex items-center gap-3 py-3">
                  <span className="w-16 shrink-0 text-xs font-semibold uppercase" style={{ color: DIFF_COLOR[q.difficulty] }}>
                    {q.difficulty}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-devanagari text-lg group-hover:underline">{q.prompt}</span>
                    <span className="block truncate text-sm text-[var(--fg-muted)]">
                      {typeInfo(q.type).label} · answer: <span className="font-devanagari">{q.options[q.correctIndex]}</span> · {q.options.length} options · sūtra {q.sutraRefs.join(", ")}
                    </span>
                  </span>
                  <StatusBadge status={q.status} />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {canEdit && (
        <>
          <Panel title="Topic details">
            <ActionForm action={saveTopic} className="grid gap-4">
              <input type="hidden" name="id" value={t.id} />
              <TopicFields t={t} chapters={chapters} />
              <div>
                <SubmitButton>Save topic</SubmitButton>
              </div>
            </ActionForm>
          </Panel>
          <Panel title="Delete topic">
            <ActionForm action={deleteTopic} confirm={`Delete “${t.title}”${questions.length ? ` and its ${questions.length} questions` : ""}?`} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={t.id} />
              {questions.length > 0 && (
                <label>
                  <span className="mb-1 block text-xs">Type DELETE to also delete its {questions.length} questions</span>
                  <input name="confirm" autoComplete="off" className={inputCls} />
                </label>
              )}
              <SubmitButton variant="danger">Delete topic</SubmitButton>
            </ActionForm>
          </Panel>
        </>
      )}
    </>
  );
}
