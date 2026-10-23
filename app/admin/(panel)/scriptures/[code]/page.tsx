import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FileText, FolderTree } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getBookAdmin, type AdminNode } from "@/lib/data/scripturesAdmin";
import { Panel, Stat } from "@/components/admin/ui";
import { Crumbs } from "@/components/admin/hnv/bits";
import { BookTabs, Progress, StatusPill } from "@/components/admin/scriptures/bits";
import { AddDivisionForm, GenerateForm, GoToForm } from "@/components/admin/scriptures/DivisionForms";

export const metadata = { title: "Scripture" };
export const dynamic = "force-dynamic";

function NodeRow({ n, tree, levels, verseTypes, verseLabel }: { n: AdminNode; tree: AdminNode[]; levels: string[]; verseTypes: number; verseLabel: string }) {
  const kids = tree.filter((k) => k.parentId === n.id);
  const leafish = kids.length === 0;
  const deepVerses = (id: number): number => tree.filter((k) => k.parentId === id).reduce((s, k) => s + k.verses + deepVerses(k.id), 0);
  const total = n.verses + (leafish ? 0 : deepVerses(n.id));
  const row = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 pr-2">
      <Link href={`/admin/scriptures/d/${n.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-[var(--a-border)] bg-[var(--a-card)] px-1.5 text-xs font-semibold tabular-nums">
          {n.number}
        </span>
        <span className="min-w-0 truncate">
          <span className="font-medium">{n.title || `${levels[n.depth] ?? "Part"} ${n.number}`}</span>
          {n.titleDeva && <span className="ml-2 font-devanagari text-sm text-[var(--a-fg-muted)]">{n.titleDeva}</span>}
        </span>
        <StatusPill status={n.status} />
        {n.hasBody && (
          <span title="Has prose text" className="text-[var(--a-fg-muted)]">
            <FileText size={14} />
          </span>
        )}
      </Link>
      <span className="text-xs tabular-nums text-[var(--a-fg-muted)]">
        {!leafish && `${kids.length}${n.expected ? `/${n.expected}` : ""} ${(levels[n.depth + 1] ?? "part").toLowerCase()}s · `}
        {total.toLocaleString()} {verseLabel.toLowerCase()}s
        {leafish && n.expected ? ` / ${n.expected}` : ""}
      </span>
      {leafish ? (
        verseTypes > 0 && n.verses > 0 ? <Progress value={n.commentaries} max={n.verses * verseTypes} /> : <span className="w-[6.5rem]" />
      ) : n.expected ? (
        <Progress value={kids.length} max={n.expected} />
      ) : (
        <span className="w-[6.5rem]" />
      )}
    </div>
  );
  if (leafish) return <li className="border-b border-[var(--a-border)] pl-3 last:border-0">{row}</li>;
  return (
    <li className="border-b border-[var(--a-border)] last:border-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1 pl-1 hover:bg-[var(--a-muted)]/50">
          <ChevronRight size={15} className="shrink-0 text-[var(--a-fg-muted)] transition-transform group-open:rotate-90" />
          <div className="flex-1">{row}</div>
        </summary>
        <ul className="mb-2 ml-6 border-l border-[var(--a-border)]">
          {kids.map((k) => (
            <NodeRow key={k.id} n={k} tree={tree} levels={levels} verseTypes={verseTypes} verseLabel={verseLabel} />
          ))}
        </ul>
      </details>
    </li>
  );
}

export default async function BookPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser("viewer");
  const { code } = await params;
  const data = await getBookAdmin(code);
  if (!data) notFound();
  const { book, tree, types } = data;
  const canEdit = hasRole(user, "editor");
  const top = tree.filter((n) => n.parentId === null);
  const verses = tree.reduce((n, d) => n + d.verses, 0);
  const comm = tree.reduce((n, d) => n + d.commentaries, 0);
  const verseTypes = types.filter((t) => t.appliesTo !== "division").length;
  const example = [...book.levels.map((_, i) => String(i === 0 ? 1 : 12)).slice(0, book.levels.length), "1"].join(".");

  return (
    <>
      <Crumbs items={[{ label: "Scriptures", href: "/admin/scriptures" }, { label: book.title }]} />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {book.title} <StatusPill status={book.status} />
          </h1>
          <p className="mt-1 text-sm text-[var(--a-fg-muted)]">
            {book.titleDeva && <span className="mr-2 font-devanagari">{book.titleDeva}</span>}
            {book.levels.join(" → ")} → {book.verseLabel}
          </p>
        </div>
        <div className="w-full max-w-sm">
          <GoToForm bookId={book.id} placeholder={`Go to ${example} or ${example.split(".").slice(0, -1).join(".") || "1"}`} />
        </div>
      </div>
      <BookTabs code={book.code} active="structure" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`${book.levels[0]}s`} value={top.length} />
        <Stat label="All divisions" value={tree.length.toLocaleString()} />
        <Stat label={book.verseLabelPlural} value={verses.toLocaleString()} />
        <Stat label="Commentary entries" value={comm.toLocaleString()} note={verseTypes ? `${types.length} kind${types.length === 1 ? "" : "s"}` : "add kinds under Commentaries"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <section className="a-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--a-border)] px-5 py-3.5">
            <h2 className="flex items-center gap-2 font-semibold">
              <FolderTree size={16} /> Contents
            </h2>
            <span className="text-xs text-[var(--a-fg-muted)]">Click a row to edit · ▸ to open</span>
          </div>
          {top.length ? (
            <ul className="px-2 py-1">
              {top.map((n) => (
                <NodeRow key={n.id} n={n} tree={tree} levels={book.levels} verseTypes={verseTypes} verseLabel={book.verseLabel} />
              ))}
            </ul>
          ) : (
            <p className="p-8 text-center text-sm text-[var(--a-fg-muted)]">No {book.levels[0].toLowerCase()}s yet. Add them on the right — or import a spreadsheet.</p>
          )}
        </section>

        {canEdit && (
          <aside className="grid content-start gap-6">
            <Panel title={`Add a ${book.levels[0].toLowerCase()}`}>
              <AddDivisionForm bookId={book.id} parentId={null} level={book.levels[0]} />
            </Panel>
            <Panel title={`Create many ${book.levels[0].toLowerCase()}s`} description="Numbers that already exist are skipped.">
              <GenerateForm bookId={book.id} parentId={null} level={book.levels[0]} />
            </Panel>
          </aside>
        )}
      </div>
    </>
  );
}
