import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { practiceTopics } from "@/lib/db/schema";
import { saveQuestion } from "@/lib/actions/practice";
import { Panel } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Crumbs } from "@/components/admin/hnv/bits";
import QuestionFields from "@/components/admin/practice/QuestionFields";

export const metadata = { title: "New practice question" };

export default async function NewQuestion({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const user = await requireUser("contributor");
  const [topic] = await getDb().select().from(practiceTopics).where(eq(practiceTopics.id, Number((await searchParams).topic))).limit(1);
  if (!topic) notFound();
  return (
    <>
      <Crumbs items={[{ label: "Practice", href: "/admin/practice" }, { label: topic.title, href: `/admin/practice/topics/${topic.id}` }, { label: "New question" }]} />
      <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">New question</h1>
      <ActionForm action={saveQuestion}>
        <input type="hidden" name="topicId" value={topic.id} />
        <Panel>
          <QuestionFields
            q={{ difficulty: "easy", type: "sandhi", prompt: "", promptSub: "", options: ["", "", "", ""], correctIndex: 0, explanation: "", sutraRefs: topic.sutraFrom ? [] : [], status: "published" }}
            canPublish={hasRole(user, "editor")}
          />
        </Panel>
        <SubmitButton>Add question</SubmitButton>
      </ActionForm>
    </>
  );
}
