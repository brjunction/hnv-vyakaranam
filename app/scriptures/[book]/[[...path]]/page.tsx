import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { getBook, getBooks, getDivisionData, getTree, resolvePath } from "@/lib/data/scriptures";
import {
  childrenOf, divisionPath, levelName, readingOrder, versePath, verseRef,
  type BookInfo, type TreeNode,
} from "@/lib/scriptures/core";
import ChapterView from "@/components/scriptures/ChapterView";
import LangSwitch from "@/components/scriptures/LangSwitch";
import { hasHindi } from "@/lib/scriptures/core";
import Reader from "@/components/scriptures/Reader";
import RichText from "@/components/RichText";
import Shelf from "@/components/scriptures/Shelf";
import ScriptureSearch from "@/components/scriptures/ScriptureSearch";
import PageHead, { MetaChip } from "@/components/PageHead";

// One route for every scripture address:
//   /scriptures/sb             → the book
//   /scriptures/sb/1           → canto 1 (its chapters)
//   /scriptures/sb/1/12        → chapter 1.12 (all verses)
//   /scriptures/sb/1/12/1      → verse 1.12.1 in the two-pane reader
//   /scriptures/bg/2/13        → verse 2.13 (books with one level)
// Static on demand (ISR): cached data with tags, refreshed by admin saves.

export const dynamicParams = true;
export const revalidate = false;

type Params = { book: string; path?: string[] };

export async function generateStaticParams(): Promise<Params[]> {
  try {
    const books = await getBooks();
    return books.map((b) => ({ book: b.code, path: [] }));
  } catch {
    return [];
  }
}

const enc = (s: string) => decodeURIComponent(s);

async function load(params: Promise<Params>) {
  const { book: raw, path = [] } = await params;
  const segs = path.map(enc);
  if (raw !== raw.toLowerCase()) permanentRedirect(`/scriptures/${raw.toLowerCase()}${segs.length ? "/" + segs.join("/") : ""}`);
  const book = await getBook(raw);
  if (!book) return null;
  const r = await resolvePath(book.code, segs);
  if (!r) return null;
  if (r.kind === "redirect") permanentRedirect(`/scriptures/${book.code}/${r.to.join("/")}`);
  return { book, r };
}

function titleOf(book: BookInfo, n: TreeNode) {
  return `${levelName(book, n.depth)} ${n.number}${n.title ? ` — ${n.title}` : ""}`;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const x = await load(params).catch(() => null);
  if (!x) return {};
  const { book, r } = x;
  if (r.kind === "book")
    return { title: book.title, description: book.description || book.tagline, alternates: { canonical: `/scriptures/${book.code}` } };
  if (r.kind === "division")
    return {
      title: `${book.title} ${r.node.path.join(".")}${r.node.title ? ` — ${r.node.title}` : ""}`,
      description: `${book.title}, ${titleOf(book, r.node)}: every ${book.verseLabel.toLowerCase()} with its Sanskrit text and commentaries.`,
      alternates: { canonical: divisionPath(book.code, r.node.path) },
    };
  if (r.kind === "verse") {
    const data = await getDivisionData(book.code, r.node.path);
    const v = data?.verses.find((y) => y.key === r.key);
    const ref = verseRef(book, v?.verseNo ?? [...r.node.path, r.key].join("."));
    const first = (v?.iast || v?.devanagari || "").split(/\s*\/\s*/).slice(0, 2).join(" ");
    return {
      title: `${ref} — ${book.title}`,
      description: `${ref}: ${first}${first ? " … " : ""}Sanskrit text with anvaya, translation and commentaries.`,
      alternates: { canonical: versePath(book.code, r.node.path, r.key) },
    };
  }
  return {};
}

function Crumbs({ book, nodes, extra }: { book: BookInfo; nodes: TreeNode[]; extra?: string }) {
  const items = [
    { label: "Scriptures", href: "/scriptures" },
    { label: book.abbrev || book.title, href: `/scriptures/${book.code}` },
    ...nodes.map((n) => ({ label: `${levelName(book, n.depth)} ${n.number}`, href: divisionPath(book.code, n.path) })),
  ];
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.label, item: it.href })),
  };
  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-[var(--fg-muted)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      {items.map((it, i) => (
        <span key={it.href} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRight size={13} className="opacity-60" />}
          <Link href={it.href} className="hover:text-[var(--fg)] hover:underline">
            {it.label}
          </Link>
        </span>
      ))}
      {extra && (
        <span className="inline-flex items-center gap-1">
          <ChevronRight size={13} className="opacity-60" />
          <span className="text-[var(--fg)]">{extra}</span>
        </span>
      )}
    </nav>
  );
}

function ancestorsOf(tree: TreeNode[], n: TreeNode) {
  const out: TreeNode[] = [];
  let cur: TreeNode | undefined = n;
  while (cur) {
    out.unshift(cur);
    const pid: number | null = cur.parentId;
    cur = pid == null ? undefined : tree.find((x) => x.id === pid);
  }
  return out;
}

function deepVerses(tree: TreeNode[], n: TreeNode): number {
  return n.verses + childrenOf(tree, n.id).reduce((s, k) => s + deepVerses(tree, k), 0);
}

/** Grid of sub-divisions (cantos / chapters). */
function DivisionGrid({ book, tree, nodes, hi = false }: { book: BookInfo; tree: TreeNode[]; nodes: TreeNode[]; hi?: boolean }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${hi ? "has-hi" : ""}`}>
      {nodes.map((n) => {
        const kids = childrenOf(tree, n.id);
        const total = deepVerses(tree, n);
        const empty = total === 0 && !n.hasBody && kids.length === 0;
        return (
          <Link key={n.id} href={divisionPath(book.code, n.path)} className={`anv-card group flex gap-4 p-5 ${empty ? "opacity-60" : ""}`}>
            <span className="anv-numeral w-12 shrink-0 text-4xl">{n.number}</span>
            <span className="min-w-0">
              <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-[var(--color-saffron)]">
                {levelName(book, n.depth)} {n.number}
              </span>
              <span className={`block font-semibold leading-snug ${n.titleDeva ? "t-en" : ""}`}>{n.title || `${levelName(book, n.depth)} ${n.number}`}</span>
              {n.titleDeva && <span className="t-hi mt-0.5 block font-devanagari text-[var(--fg-muted)]">{n.titleDeva}</span>}
              {n.subtitle && <span className="mt-0.5 block text-sm italic text-[var(--fg-muted)]">{n.subtitle}</span>}
              <span className="mt-3 flex flex-wrap gap-1.5">
                {kids.length > 0 && (
                  <span className="anv-pill">
                    {kids.length}
                    {n.expected && n.expected !== kids.length ? ` of ${n.expected}` : ""} {(book.levels[n.depth + 1] ?? "part").toLowerCase()}s
                  </span>
                )}
                {total > 0 ? (
                  <span className="anv-pill">
                    {total.toLocaleString()} {total === 1 ? book.verseLabel.toLowerCase() : book.verseLabelPlural.toLowerCase()}
                  </span>
                ) : (
                  empty && <span className="anv-pill">coming soon</span>
                )}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default async function ScripturePage({ params }: { params: Promise<Params> }) {
  const x = await load(params);
  if (!x) notFound();
  const { book, r } = x;
  const tree = await getTree(book.code);

  // ---------------------------------------------------------------- book
  if (r.kind === "book") {
    const top = childrenOf(tree, null);
    const total = tree.reduce((s, n) => s + n.verses, 0);
    return (
      <>
        <PageHead
          eyebrow={book.abbrev || "Scripture"}
          deva={book.titleDeva || undefined}
          title={book.title}
          image={book.coverUrl || undefined}
          intro={[book.tagline, book.author].filter(Boolean).join(" · ") || undefined}
          meta={
            total > 0 ? (
              <>
                <MetaChip n={top.length} label={`${book.levels[0].toLowerCase()}${top.length === 1 ? "" : "s"}`} />
                <MetaChip n={total.toLocaleString()} label={book.verseLabelPlural.toLowerCase()} />
              </>
            ) : (
              <span className="rounded-full border border-[var(--border)] px-2.5 py-1">Coming soon</span>
            )
          }
        >
          {total > 0 && (
            <div className="max-w-xl">
              <ScriptureSearch books={[{ code: book.code, title: book.title }]} initialBook={book.code} compact />
            </div>
          )}
        </PageHead>
        <section className="mx-auto max-w-6xl px-5 py-8">
          <Shelf book={book.code} />
          {book.introHtml && <RichText value={book.introHtml} className="mx-auto mb-12 max-w-3xl text-[1.05rem] leading-relaxed" />}
          {total > 0 && <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-saffron)]">{book.levels[0]}s</h2>}
          {total === 0 && !tree.some((n) => n.hasBody) ? (
            <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)]">Coming soon</p>
              <p className="text-lg font-semibold">{book.title} is being prepared.</p>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">Its text will appear here as our editors add it.</p>
              <Link href="/scriptures" className="ui-btn mt-6">
                <ArrowLeft size={15} /> All scriptures
              </Link>
            </div>
          ) : (
            <DivisionGrid book={book} tree={tree} nodes={top} />
          )}
        </section>
      </>
    );
  }

  const node = r.node;
  const nodes = ancestorsOf(tree, node);
  const data = await getDivisionData(book.code, node.path);
  if (!data) notFound();

  // --------------------------------------------------------------- verse
  if (r.kind === "verse") {
    const v = data.verses.find((y) => y.key === r.key);
    return (
      <div className="mx-auto max-w-[96rem] px-4 pt-6 sm:px-6">
        <Crumbs book={book} nodes={nodes} extra={`${book.verseLabel} ${r.key}`} />
        <h1 className="sr-only">
          {verseRef(book, v?.verseNo ?? r.key)} — {book.title}
        </h1>
        <Reader book={book} tree={tree} data={data} verseKey={r.key} />
      </div>
    );
  }

  // ------------------------------------------------- division / chapter
  const kids = childrenOf(tree, node.id);
  const order = readingOrder(tree);
  const oi = order.findIndex((n) => n.id === node.id);
  const siblings = childrenOf(tree, node.parentId);
  const si = siblings.findIndex((n) => n.id === node.id);
  const prev = oi > 0 ? order[oi - 1] : si > 0 ? siblings[si - 1] : null;
  const next = oi >= 0 && oi < order.length - 1 ? order[oi + 1] : si >= 0 && si < siblings.length - 1 ? siblings[si + 1] : null;
  const readable = data.verses.length > 0 || node.hasBody;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <Crumbs book={book} nodes={nodes.slice(0, -1)} extra={`${levelName(book, node.depth)} ${node.number}`} />
      <header className="mb-6">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-saffron)]">
          {book.title} · {levelName(book, node.depth)} {node.path.join(".")}
        </p>
        <h1 className={`flex flex-wrap items-baseline gap-x-3 text-xl font-semibold leading-tight sm:text-2xl ${hasHindi(data.types) ? "has-hi" : ""}`}>
          {node.titleDeva && <span className="t-hi font-devanagari font-normal">{node.titleDeva}</span>}
          <span className={node.titleDeva ? "t-en" : ""}>{node.title || `${levelName(book, node.depth)} ${node.number}`}</span>
        </h1>
        {node.subtitle && <p className="mt-1 text-sm italic text-[var(--fg-muted)]">{node.subtitle}</p>}
      </header>

      {kids.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-saffron)]">{book.levels[node.depth + 1] ?? "Parts"}s</h2>
          {hasHindi(data.types) && <LangSwitch />}
        </div>
          <DivisionGrid book={book} tree={tree} nodes={kids} hi={hasHindi(data.types)} />
        </section>
      )}

      {readable ? (
        <ChapterView data={data} />
      ) : (
        kids.length === 0 && <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">{book.verseLabelPlural} for this {levelName(book, node.depth).toLowerCase()} haven&apos;t been added yet.</p>
      )}

      {(prev || next) && (
        <nav className="mt-12 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-6" aria-label="Neighbouring">
          {prev ? (
            <Link href={divisionPath(book.code, prev.path)} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm hover:border-[var(--accent)]">
              <ArrowLeft size={16} /> {titleOf(book, prev)}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={divisionPath(book.code, next.path)} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-right text-sm hover:border-[var(--accent)]">
              {titleOf(book, next)} <ArrowRight size={16} />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
