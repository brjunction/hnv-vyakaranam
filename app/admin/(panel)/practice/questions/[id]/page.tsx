import { notFound } from "next/navigation";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getQuestionAdmin } from "@/lib/data/practiceAdmin";
import { deleteQuestion, saveQuestion } from "@/lib/actions/practice";
import { Panel } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Crumbs } from "@/components/admin/hnv/bits";
import QuestionFields from "@/components/admin/practice/QuestionFields";

export const metadata = { title: "Practice question" };

export default async function EditQuestion({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("viewer");
  const data = await getQuestionAdmin(Number((await params).id));
  if (!data) notFound();
  const { question: q, topic } = data;
  return (
    <>
      <Crumbs items={[{ label: "Practice", href: "/admin/practice" }, { label: topic.title, href: `/admin/practice/topics/${topic.id}` }, { label: `Question ${q.code}` }]} />
      <h1 className="mb-6 text-4xl font-semibold">Edit question</h1>
      <ActionForm action={saveQuestion}>
        <input type="hidden" name="id" value={q.id} />
        <input type="hidden" name="topicId" value={q.topicId} />
        <Panel>
          <QuestionFields q={q} canPublish={hasRole(user, "editor")} />
        </Panel>
        {hasRole(user, "contributor") && <SubmitButton>Save question</SubmitButton>}
      </ActionForm>
      {hasRole(user, "editor") && (
        <ActionForm action={deleteQuestion} confirm="Delete this question?" className="mt-10 border-t border-[var(--border)] pt-6">
          <input type="hidden" name="id" value={q.id} />
          <SubmitButton variant="danger">Delete question</SubmitButton>
        </ActionForm>
      )}
    </>
  );
}
