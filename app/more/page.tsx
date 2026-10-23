import type { Metadata } from "next";
import { getMoreSections } from "@/lib/data/more";
import PageHead from "@/components/PageHead";
import { SectionBody, SectionHeading } from "@/components/more/Sections";

export const metadata: Metadata = {
  title: "More",
  description: "Courses, YouTube playlists, resources, updates and the development progress of the Harināmāmṛta-Vyākaraṇam website.",
  alternates: { canonical: "/more" },
};

// Static; rebuilt when anything is changed in /admin/more.
export const revalidate = false;

export default async function More() {
  const sections = (await getMoreSections()).filter((s) => !s.key.startsWith("about-"));
  return (
    <>
      <PageHead title="More" intro="Courses, playlists, resources and news around Harināmāmṛta-Vyākaraṇam." />
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-6">
        {sections.length > 1 && (
          <nav aria-label="Sections" className="mb-8 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {sections.map((s) => (
              <a key={s.key} href={`#${s.key}`} className="ui-btn ui-btn-sm shrink-0">
                {s.title}
                {s.items.length > 0 && <span className="tabular-nums text-[var(--fg-muted)]">{s.items.length}</span>}
              </a>
            ))}
          </nav>
        )}
        {sections.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">Nothing here yet.</p>
        ) : (
          <div className="space-y-12">
            {sections.map((s) => (
              <section key={s.key} id={s.key} className="scroll-mt-24">
                <SectionHeading s={s} link={s.kind === "posts" && s.items.length > 5} />
                <SectionBody s={s} limit={s.kind === "posts" ? 5 : undefined} />
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
