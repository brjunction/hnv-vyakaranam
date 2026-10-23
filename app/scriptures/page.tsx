import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Columns2, NotebookPen } from "lucide-react";
import { getBooks, getCategories, type BookCard } from "@/lib/data/scriptures";
import Shelf from "@/components/scriptures/Shelf";
import ScriptureSearch from "@/components/scriptures/ScriptureSearch";
import LibraryBrowser from "@/components/scriptures/LibraryBrowser";
import PageHead, { MetaChip } from "@/components/PageHead";

export const metadata: Metadata = {
  title: "Scriptures",
  description:
    "The scripture library: Śrīmad-Bhāgavatam, Bhagavad-gītā, the Upaniṣads and the Gauḍīya granthas — verse by verse in Devanagari, IAST, Bengali or Odia, with anvaya, translation and commentaries.",
  alternates: { canonical: "/scriptures" },
};

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function BookRow({ b }: { b: BookCard }) {
  const ready = b.verses > 0;
  return (
    <li>
      <Link href={`/scriptures/${b.code}`} className={`group flex items-center gap-3 rounded-xl px-3 py-1.5 transition-colors hover:bg-[var(--bg-2)] ${ready ? "" : "opacity-80"}`}>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className={`font-medium ${ready ? "" : "text-[var(--fg)]/85"}`}>{b.title}</span>
            {b.titleDeva && <span className="font-devanagari text-sm text-[var(--fg-muted)]">{b.titleDeva}</span>}
          </span>
          {b.author && <span className="block truncate text-xs text-[var(--fg-muted)]">{b.author}</span>}
        </span>
        {ready ? (
          <span className="shrink-0 rounded-full bg-[var(--accent)]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--fg)] ring-1 ring-[var(--accent)]/40">
            {b.verses.toLocaleString()} {b.verses === 1 ? b.verseLabel.toLowerCase() : b.verseLabelPlural.toLowerCase()}
          </span>
        ) : (
          <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] text-[var(--fg-muted)] ring-1 ring-[var(--border)]">Coming soon</span>
        )}
        <ArrowRight size={14} className="shrink-0 text-[var(--fg-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    </li>
  );
}

export default async function ScripturesHome() {
  const [books, cats] = await Promise.all([getBooks(), getCategories()]);
  const ready = books.filter((b) => b.verses > 0);
  const byCat = new Map<number | null, BookCard[]>();
  for (const b of books) {
    const k = cats.some((c) => c.id === b.categoryId) ? b.categoryId : null;
    byCat.set(k, [...(byCat.get(k) ?? []), b]);
  }
  const sections: { name: string; cats: { key: string; name: string; description: string; books: BookCard[] }[] }[] = [];
  for (const c of cats) {
    const list = byCat.get(c.id) ?? [];
    if (!list.length) continue;
    let s = sections.find((x) => x.name === (c.section || "Library"));
    if (!s) sections.push((s = { name: c.section || "Library", cats: [] }));
    s.cats.push({ key: c.key, name: c.name, description: c.description, books: list });
  }
  const loose = byCat.get(null) ?? [];
  if (loose.length) sections.push({ name: "More", cats: [{ key: "more", name: "More scriptures", description: "", books: loose }] });

  return (
    <>
      <PageHead
        deva="शास्त्राणि"
        title="Scriptures"
        intro="Verse by verse, with anvaya, translation and the ācāryas’ commentaries."
        meta={
          <>
            <MetaChip n={books.length} label="scriptures" />
            <MetaChip n={ready.length} label="ready to read" />
          </>
        }
      >
        <div className="max-w-2xl">
          <ScriptureSearch books={ready.map((b) => ({ code: b.code, title: b.title }))} compact />
        </div>
      </PageHead>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <Shelf />

        {ready.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-saffron)]">Ready to read</h2>
            <div className={`grid gap-4 ${ready.length > 2 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2"}`}>
              {ready.map((b) => (
                <Link key={b.code} href={`/scriptures/${b.code}`} className="anv-card group p-4 sm:p-5">
                  <div className="flex gap-4">
                    {b.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.coverUrl} alt="" className="h-20 w-14 shrink-0 rounded-lg border border-[var(--border)] object-cover shadow-sm" />
                    )}
                    <div className="min-w-0">
                      {b.abbrev && <p className="anv-label mb-1.5">{b.abbrev}</p>}
                      {b.titleDeva && <p className="mb-0.5 font-devanagari text-xl leading-snug transition-colors group-hover:text-[var(--accent)]">{b.titleDeva}</p>}
                      <h3 className="text-base font-semibold">{b.title}</h3>
                      {b.tagline && <p className="mt-0.5 line-clamp-1 text-sm italic text-[var(--fg-muted)]">{b.tagline}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="anv-pill">
                      {b.divisions} {b.levels[0]}
                      {b.divisions === 1 ? "" : "s"}
                    </span>
                    <span className="anv-pill">
                      {b.verses.toLocaleString()} {b.verses === 1 ? b.verseLabel.toLowerCase() : b.verseLabelPlural.toLowerCase()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <LibraryBrowser
          books={books.map((b) => {
            const ci = cats.findIndex((x) => x.id === b.categoryId);
            const c = cats[ci];
            return { code: b.code, title: b.title, titleDeva: b.titleDeva, author: b.author, verses: b.verses, verseLabelPlural: b.verseLabelPlural, category: c?.name ?? "", section: c?.section ?? "", order: ci < 0 ? 9999 : ci };
          })}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href="/scriptures/read" className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 transition-colors hover:border-[var(--accent)]">
            <Columns2 className="shrink-0 text-[var(--accent)]" />
            <span>
              <span className="block font-semibold">Dual reading</span>
              <span className="text-sm text-[var(--fg-muted)]">Two places side by side — two books, or two verses of one.</span>
            </span>
          </Link>
          <Link href="/notes" className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 transition-colors hover:border-[var(--accent)]">
            <NotebookPen className="shrink-0 text-[var(--accent)]" />
            <span>
              <span className="block font-semibold">Notebook</span>
              <span className="text-sm text-[var(--fg-muted)]">Write your own notes while you read — on any page.</span>
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}
