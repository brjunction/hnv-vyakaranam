import type { Metadata } from "next";
import { NotebookBody } from "@/components/notebook/Notebook";

export const metadata: Metadata = { title: "Notebook", robots: { index: false }, alternates: { canonical: "/notes" } };

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6">
      <p className="mb-1 text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)]">Notebook</p>
      <h1 className="mb-1 text-2xl font-semibold sm:text-3xl">My notes</h1>
      <p className="mb-6 text-sm text-[var(--fg-muted)]">Sections and pages, rich text and drawings — from anywhere on the site (the notebook button at the top). Signed in, it is saved online; otherwise it stays on this device (make a backup to move it).</p>
      <NotebookBody page />
    </div>
  );
}
