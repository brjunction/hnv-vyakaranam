import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { chapters, getChapter } from "@/lib/content";
import ChapterView, { type ChapterWithNotes } from "@/components/ChapterView";
import { getSutraNotes, lookupNotes } from "@/lib/sutraNotesDoc";

export function generateStaticParams() {
  return chapters.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const chapter = getChapter(slug);
  if (!chapter) return {};
  return {
    title: `${chapter.title} — ${chapter.titleEnglish}`,
    description: `${chapter.summary} Sūtras ${chapter.sutraRange} of Hari-nāmāmṛta Vyākaraṇa.`,
  };
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapter(slug);
  if (!chapter) notFound();

  // Sūtra text (Sanskrit/vṛtti/translation) comes from the local .xlsx —
  // it's static. Notes are fetched live from the Google Doc configured in
  // lib/config.ts and merged in here by sūtra number.
  const notes = await getSutraNotes();

  const chapterWithNotes: ChapterWithNotes = {
    ...chapter,
    sections: chapter.sections.map((section) => ({
      ...section,
      sutras: section.sutras.map((sutra) => ({
        ...sutra,
        notesHtml: lookupNotes(notes, sutra.number),
      })),
    })),
  };

  return (
    <div className="max-w-4xl mx-auto px-5 py-16">
      {notes.styleCss && <style dangerouslySetInnerHTML={{ __html: notes.styleCss }} />}

      <Link href="/chapters" className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]">
        ← Table of contents
      </Link>

      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mt-6 mb-3">
        {chapter.number === 0 || chapter.number === 8 ? "" : `Chapter ${chapter.number}`}
      </p>
      <h1 className="font-devanagari text-3xl sm:text-4xl mb-2">{chapter.title}</h1>
      <p className="text-lg text-[var(--fg-muted)] mb-4">{chapter.titleEnglish}</p>
      <p className="text-[var(--fg-muted)] max-w-2xl leading-relaxed mb-4">{chapter.summary}</p>
      <p className="sutra-number text-sm text-[var(--accent)] mb-12">Sūtras {chapter.sutraRange}</p>

      <ChapterView chapter={chapterWithNotes} notesScopeClass={notes.scopeClass} />
    </div>
  );
}
