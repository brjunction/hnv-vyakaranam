import type { Metadata } from "next";
import PracticeApp from "./PracticeApp";
import { getPracticeData } from "@/lib/data/practice";
import PageHead, { MetaChip } from "@/components/PageHead";

export const revalidate = 86400; // admin saves refresh it immediately

export const metadata: Metadata = {
  alternates: { canonical: "/practice" },
  title: "Practice",
  description: "Practice Sandhi and Sandhi-viccheda from Hari-nāmāmṛta Vyākaraṇa — choose a chapter, topic, and difficulty, then test yourself.",
};

export default async function PracticePage() {
  const data = await getPracticeData();
  const topicCount = data.chapters.reduce((n, c) => n + c.topics.length, 0);
  return (
    <>
      <PageHead
        deva="अभ्यासः"
        title="Practice"
        width="max-w-5xl"
        intro="Test yourself chapter by chapter — every answer shows the sūtra behind it."
        meta={
          <>
            <MetaChip n={data.questions.length} label="questions" />
            <MetaChip n={topicCount} label={topicCount === 1 ? "topic" : "topics"} />
            <MetaChip n={data.sutraSpan || "—"} label="sūtras" />
          </>
        }
      />
      <PracticeApp chapters={data.chapters} questions={data.questions} />
    </>
  );
}
