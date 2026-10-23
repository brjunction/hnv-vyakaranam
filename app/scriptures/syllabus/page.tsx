import type { Metadata } from "next";
import Link from "next/link";
import { getBooks, getSyllabus } from "@/lib/data/scriptures";
import PageHead from "@/components/PageHead";
import SyllabusView from "@/components/scriptures/SyllabusView";

export const metadata: Metadata = {
  title: "Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura’s order of study",
  description: "The Sārvabhauma examination syllabus of the Śrī Navadvīpa Māyāpura Para-vidyāpīṭha — śāstra in ten subjects, principal and secondary.",
  alternates: { canonical: "/scriptures/syllabus" },
};
export const revalidate = false;

export default async function SyllabusPage() {
  const [data, books] = await Promise.all([getSyllabus(), getBooks()]);
  return (
    <>
      <PageHead
        eyebrow="Scriptures"
        title="Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura’s order"
        intro="How the śāstra was arranged for study at the Para-vidyāpīṭha in Śrī Māyāpura: ten subjects, each with its principal and secondary works."
      />
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-6">
        {data ? (
          <SyllabusView data={data} books={books.map((b) => ({ code: b.code, titleDeva: b.titleDeva, title: b.title, ready: b.verses > 0 }))} />
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">Not available right now.</p>
        )}
        <p className="mt-8">
          <Link href="/scriptures" className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]">
            ← The library
          </Link>
        </p>
      </div>
    </>
  );
}
