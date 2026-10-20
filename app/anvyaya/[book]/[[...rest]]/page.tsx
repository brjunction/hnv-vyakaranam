// One page file serves every Anvyaya address:
//
//   /anvyaya/SB                → the book: all 12 cantos
//   /anvyaya/SB/1              → canto 1: all its chapters (expandable)
//   /anvyaya/SB/1/12           → canto 1 with chapter 12 opened
//   /anvyaya/SB/1/12/1         → verse 1.12.1
//   /anvyaya/BG                → the book: all 18 chapters
//   /anvyaya/BG/18             → chapter 18: all its verses
//   /anvyaya/BG/18/6           → verse 18.6
//
// (/Anvyaya/... with a capital A, and sb/SB, all work too.)

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBook, versePath, type BookConfig } from "@/lib/anvyayaBooks";
import { findVerse, loadDivision } from "@/lib/anvyayaData";
import type { ChapterSummary } from "@/lib/anvyayaTypes";
import Breadcrumbs from "@/components/anvyaya/Breadcrumbs";
import CreditBox from "@/components/anvyaya/CreditBox";
import DivisionView from "@/components/anvyaya/DivisionView";
import VerseDetail from "@/components/anvyaya/VerseDetail";
import VerseJump from "@/components/anvyaya/VerseJump";

type Route =
  | { kind: "book" }
  | { kind: "division"; n: number; chapter?: number }
  | { kind: "verse"; n: number; chapter: number; verse: string };

const isNum = (s: string) => /^\d+$/.test(s);
const isVerse = (s: string) => /^\d+(-\d+)?$/.test(s);

function resolve(book: BookConfig, rest: string[]): Route | null {
  if (rest.length === 0) return { kind: "book" };
  if (!isNum(rest[0])) return null;
  const n = parseInt(rest[0], 10);
  if (n < 1 || n > book.divisions.length) return null;

  if (book.hasChapters) {
    if (rest.length === 1) return { kind: "division", n };
    if (!isNum(rest[1])) return null;
    const chapter = parseInt(rest[1], 10);
    if (rest.length === 2) return { kind: "division", n, chapter };
    if (rest.length === 3 && isVerse(rest[2])) return { kind: "verse", n, chapter, verse: rest[2] };
    return null;
  }
  if (rest.length === 1) return { kind: "division", n };
  if (rest.length === 2 && isVerse(rest[1])) return { kind: "verse", n, chapter: n, verse: rest[1] };
  return null;
}

type Params = { book: string; rest?: string[] };

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { book: bookParam, rest = [] } = await params;
  const book = getBook(bookParam);
  if (!book) return {};
  const route = resolve(book, rest);
  if (!route) return {};

  if (route.kind === "book") {
    return {
      title: `${book.title} — Anvyaya & Translation`,
      description: `${book.description} Anvyayas by ${book.anvyayaBy}; translations by Śrīla Prabhupāda.`,
      alternates: { canonical: `/anvyaya/${book.code}` },
    };
  }

  if (route.kind === "division") {
    const d = book.divisions[route.n - 1];
    const path = `/anvyaya/${book.code}/${route.n}${route.chapter ? `/${route.chapter}` : ""}`;
    const label = route.chapter ? `${route.n}.${route.chapter}` : `${book.divisionLabel} ${route.n}`;
    return {
      title: `${book.title} ${label} — ${d.title}`,
      description: `Every verse of ${book.title} ${label} (${d.title}) with anvyaya (prose order), translation and Devanagari.`,
      alternates: { canonical: path },
    };
  }

  const chapters = loadDivision(book.code, route.n);
  const found = findVerse(chapters, route.chapter, route.verse);
  if (!found) return {};
  const v = chapters[found.chapterIdx].verses[found.verseIdx];
  const desc = (v.translation || v.anvyaya || v.iast.replace(/\s*\/\s*/g, " ")).slice(0, 158);
  return {
    title: `${book.title} ${v.verseNo} — Anvyaya & Translation`,
    description: desc,
    alternates: { canonical: versePath(book, v) },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function AnvyayaPage({ params }: { params: Promise<Params> }) {
  const { book: bookParam, rest = [] } = await params;
  const book = getBook(bookParam);
  if (!book) notFound();
  const route = resolve(book, rest);
  if (!route) notFound();

  if (route.kind === "book") return <BookOverview book={book} />;
  if (route.kind === "division") return <DivisionPage book={book} n={route.n} chapter={route.chapter} />;
  return <VersePage book={book} n={route.n} chapter={route.chapter} verseParam={route.verse} />;
}

// ---------------------------------------------------------------------------
// The book: all cantos / chapters as cards
// ---------------------------------------------------------------------------
function BookOverview({ book }: { book: BookConfig }) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="anv-hero-bg absolute inset-0" aria-hidden />
        <div className="relative max-w-5xl mx-auto px-5 pt-10 pb-16">
          <Breadcrumbs
            items={[{ label: "Scripture Anvyayas", href: "/anvyaya" }, { label: book.title }]}
          />
          <div className="text-center mt-12">
            <p className="font-devanagari text-4xl sm:text-6xl leading-tight mb-3">{book.titleDeva}</p>
            <h1 className="text-2xl sm:text-3xl font-semibold mb-3">{book.title}</h1>
            <p className="italic text-[var(--fg-muted)] mb-6">{book.tagline}</p>
            <div className="anv-ornament mb-6" aria-hidden>◆</div>
            <p className="max-w-2xl mx-auto leading-relaxed text-[var(--fg-muted)] mb-8">{book.description}</p>
            <VerseJump bookCode={book.code} hasChapters={book.hasChapters} />
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-5 py-14">
        <p className="anv-label mb-6 text-center">{book.divisionPlural}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {book.divisions.map((d) => (
            <Link key={d.number} href={`/anvyaya/${book.code}/${d.number}`} className="anv-card p-6 group">
              <span className="anv-numeral absolute -right-1 -top-2 text-[5.5rem] sutra-number select-none">
                {d.number}
              </span>
              <p className="anv-label mb-2">
                {book.divisionLabel} {d.number}
              </p>
              <h2 className="text-lg font-medium leading-snug pr-14 mb-2 group-hover:text-[var(--accent)] transition-colors">
                {d.title}
              </h2>
              {d.subtitle && <p className="text-sm italic text-[var(--fg-muted)] mb-3">{d.subtitle}</p>}
              <div className="flex flex-wrap gap-2 mt-4">
                {d.chapterCount && <span className="anv-pill">{d.chapterCount} chapters</span>}
                <span className="text-sm text-[var(--color-vermillion)]">Open →</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-14">
          <CreditBox book={book} />
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// A canto (SB) or a chapter (BG): the expandable verse lists
// ---------------------------------------------------------------------------
function DivisionPage({ book, n, chapter }: { book: BookConfig; n: number; chapter?: number }) {
  const d = book.divisions[n - 1];
  const chapters = loadDivision(book.code, n);

  if (chapter !== undefined && !chapters.some((c) => c.number === chapter)) notFound();

  const summaries: ChapterSummary[] = book.hasChapters
    ? chapters.map((c) => ({
        number: c.number,
        name: c.name,
        verseCount: c.verses.length,
        // Send the verses of the requested chapter right away; the rest load on demand.
        verses: c.number === chapter ? c.verses : undefined,
      }))
    : [{ number: n, name: d.title, verseCount: chapters[0]?.verses.length ?? 0, verses: chapters[0]?.verses ?? [] }];

  const hasData = summaries.some((s) => s.verseCount > 0);
  const prev = n > 1 ? book.divisions[n - 2] : null;
  const next = n < book.divisions.length ? book.divisions[n] : null;

  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="anv-hero-bg absolute inset-0" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-5 pt-10 pb-14">
          <Breadcrumbs
            items={[
              { label: "Scripture Anvyayas", href: "/anvyaya" },
              { label: book.title, href: `/anvyaya/${book.code}` },
              { label: `${book.divisionLabel} ${n}` },
            ]}
          />
          <div className="text-center mt-10">
            <p className="anv-numeral text-7xl sm:text-8xl sutra-number mb-1">{n}</p>
            <p className="anv-label mb-3">
              {book.title} · {book.divisionLabel} {n}
            </p>
            <h1 className="text-2xl sm:text-4xl font-semibold leading-tight">{d.title}</h1>
            {d.subtitle && <p className="italic text-[var(--fg-muted)] mt-2">{d.subtitle}</p>}
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-5 py-10">
        <div className="mb-8">
          <CreditBox book={book} />
        </div>

        {hasData ? (
          <DivisionView
            bookCode={book.code}
            divisionNo={n}
            hasChapters={book.hasChapters}
            chapters={summaries}
            initialOpenChapter={chapter}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--fg-muted)]">
            Verses for this {book.divisionLabel.toLowerCase()} will appear here.
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mt-14">
          {prev ? (
            <Link href={`/anvyaya/${book.code}/${prev.number}`} className="anv-card px-5 py-4">
              <span className="anv-label block mb-1">← {book.divisionLabel} {prev.number}</span>
              <span className="text-sm">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/anvyaya/${book.code}/${next.number}`} className="anv-card px-5 py-4 sm:text-right">
              <span className="anv-label block mb-1">{book.divisionLabel} {next.number} →</span>
              <span className="text-sm">{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// A single verse
// ---------------------------------------------------------------------------
function VersePage({
  book,
  n,
  chapter,
  verseParam,
}: {
  book: BookConfig;
  n: number;
  chapter: number;
  verseParam: string;
}) {
  const chapters = loadDivision(book.code, n);
  const found = findVerse(chapters, chapter, verseParam);
  if (!found) notFound();

  const verse = chapters[found.chapterIdx].verses[found.verseIdx];
  // "17" typed for a combined verse "16-18" → go to the real address.
  if (verse.verseKey !== verseParam) redirect(versePath(book, verse));

  const flat = chapters.flatMap((c) => c.verses);
  const idx = flat.indexOf(verse);
  const nav = (v: (typeof flat)[number] | undefined) =>
    v ? { label: `${book.code} ${v.verseNo}`, href: versePath(book, v) } : null;

  const chapterHref = book.hasChapters ? `/anvyaya/${book.code}/${n}/${chapter}` : `/anvyaya/${book.code}/${n}`;
  const chapterLabel = book.hasChapters ? `${book.divisionLabel} ${n}, Chapter ${chapter}` : `${book.divisionLabel} ${n}`;

  const crumbs = [
    { label: "Scripture Anvyayas", href: "/anvyaya" },
    { label: book.title, href: `/anvyaya/${book.code}` },
    { label: `${book.divisionLabel} ${n}`, href: `/anvyaya/${book.code}/${n}` },
    ...(book.hasChapters ? [{ label: `Chapter ${chapter}`, href: chapterHref }] : []),
    { label: `Verse ${verse.verseNo}` },
  ];

  return (
    <VerseDetail
      book={book}
      verse={verse}
      crumbs={crumbs}
      prev={nav(flat[idx - 1])}
      next={nav(flat[idx + 1])}
      chapterHref={chapterHref}
      chapterLabel={chapterLabel}
    />
  );
}
