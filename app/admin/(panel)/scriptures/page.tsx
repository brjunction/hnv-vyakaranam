import Link from "next/link";
import { BookOpen, FolderTree, Plus } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { listBooksAdmin, listCategoriesAdmin, recentScriptureActivity } from "@/lib/data/scripturesAdmin";
import RowFilter from "@/components/admin/scriptures/RowFilter";
import { moveBook } from "@/lib/actions/scriptures";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import { MoveButtons } from "@/components/admin/hnv/bits";
import { StatusPill } from "@/components/admin/scriptures/bits";

export const metadata = { title: "Scriptures" };
export const dynamic = "force-dynamic";

const TABLE: Record<string, string> = {
  books: "a book",
  scripture_divisions: "a division",
  scripture_verses: "a verse",
  scripture_commentaries: "a commentary entry",
  scripture_commentary_types: "a commentary kind",
};

export default async function ScripturesAdmin() {
  const user = await requireUser("viewer");
  const [list, activity, cats] = await Promise.all([listBooksAdmin(), recentScriptureActivity(12), listCategoriesAdmin()]);
  const groups = [
    ...cats.map((c) => ({ key: String(c.id), name: c.name, section: c.section, books: list.filter((b) => b.categoryId === c.id) })),
    { key: "none", name: "No category", section: "", books: list.filter((b) => !cats.some((c) => c.id === b.categoryId)) },
  ].filter((g) => g.books.length);
  const canEdit = hasRole(user, "editor");
  const totals = list.reduce((a, b) => ({ v: a.v + b.verses, d: a.d + b.divisions, c: a.c + b.commentaries, dr: a.dr + b.drafts }), { v: 0, d: 0, c: 0, dr: 0 });

  return (
    <>
      <PageHeader
        title="Scriptures"
        intro="Every scripture on the site — any number of books, each with its own levels (canto → chapter, part → chapter …), verses or prose chapters, and as many commentaries as you like."
        actions={
          canEdit ? (
            <Link href="/admin/scriptures/new" className="a-btn a-btn-primary">
              <Plus size={16} /> New scripture
            </Link>
          ) : undefined
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Scriptures" value={list.length} note={`${list.filter((b) => b.verses > 0).length} with text · ${list.filter((b) => b.verses === 0).length} coming soon`} />
        <Stat label="Divisions" value={totals.d.toLocaleString()} note="cantos, chapters, parts …" />
        <Stat label="Verses" value={totals.v.toLocaleString()} />
        <Stat label="Commentary entries" value={totals.c.toLocaleString()} note={totals.dr ? `${totals.dr} drafts waiting` : "no drafts waiting"} />
      </div>

      {list.length === 0 ? (
        <div className="a-card flex flex-col items-center gap-3 p-12 text-center">
          <BookOpen size={32} className="text-[var(--a-fg-muted)]" strokeWidth={1.5} />
          <p className="font-medium">No scriptures yet.</p>
          {canEdit && (
            <Link href="/admin/scriptures/new" className="a-btn a-btn-primary">
              <Plus size={16} /> Add the first one
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <RowFilter target="book-table" placeholder="Filter by title or author…" />
            <Link href="/admin/scriptures/categories" className="a-btn a-btn-outline">
              <FolderTree size={15} /> Categories
            </Link>
          </div>
          <div id="book-table" className="grid gap-5">
            {groups.map((g) => (
              <section key={g.key} data-group className="a-card overflow-hidden">
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--a-border)] bg-[var(--a-muted)]/50 px-5 py-2.5">
                  <h2 className="text-sm font-semibold">
                    {g.section && <span className="font-normal text-[var(--a-fg-muted)]">{g.section} › </span>}
                    {g.name}
                  </h2>
                  <span className="text-xs text-[var(--a-fg-muted)]">{g.books.length} books</span>
                </div>
                <ul className="divide-y divide-[var(--a-border)]">
                  {g.books.map((b) => (
                    <li key={b.id} data-text={`${b.title} ${b.titleDeva} ${b.author} ${b.code} ${b.abbrev}`.toLowerCase()} data-state={b.verses > 0 ? "ready" : "soon"} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 hover:bg-[var(--a-muted)]/30">
                      <Link href={`/admin/scriptures/${b.code}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--a-border)] bg-[var(--a-muted)] font-devanagari text-sm">
                          {b.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.coverUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            (b.titleDeva || b.abbrev || b.title).replace(/^श्री\s*/, "").slice(0, 2)
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium hover:underline">{b.title}</span>
                            <StatusPill status={b.status} />
                          </span>
                          <span className="block truncate text-xs text-[var(--a-fg-muted)]">
                            {b.author ? `${b.author} · ` : ""}
                            {b.levels.join(" → ")} → {b.verseLabel} · /{b.code}
                          </span>
                        </span>
                      </Link>
                      <span className="flex items-center gap-4 text-xs tabular-nums text-[var(--a-fg-muted)]">
                        {b.verses > 0 ? (
                          <span className="rounded-full bg-[var(--a-success)]/10 px-2 py-0.5 font-medium text-[var(--a-success)]">
                            {b.verses.toLocaleString()} {b.verseLabelPlural.toLowerCase()}
                          </span>
                        ) : (
                          <span className="rounded-full bg-[var(--a-muted)] px-2 py-0.5">coming soon</span>
                        )}
                        <span className="hidden sm:inline">{b.divisions} div.</span>
                        <span className="hidden sm:inline">{b.types} kinds</span>
                        {b.drafts > 0 && <span className="text-amber-600">{b.drafts} drafts</span>}
                        <Link href={`/admin/scriptures/${b.code}/progress`} className="hover:text-[var(--a-fg)] hover:underline">
                          Progress
                        </Link>
                        {canEdit && <MoveButtons action={moveBook} id={b.id} />}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      {activity.length > 0 && (
        <div className="mt-8">
          <Panel title="Recent activity">
            <ul className="-my-2 divide-y divide-[var(--a-border)] text-sm">
              {activity.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2">
                  <span className="w-32 shrink-0 text-xs tabular-nums text-[var(--a-fg-muted)]">{a.at.toISOString().slice(0, 16).replace("T", " ")}</span>
                  <span className="font-medium">{a.who ?? "—"}</span>
                  <span className="text-[var(--a-fg-muted)]">
                    {a.action === "create" ? "added" : a.action === "delete" ? "deleted" : a.action === "import" ? "imported into" : "edited"}{" "}
                    {TABLE[a.table] ?? a.table}
                  </span>
                  {a.table === "scripture_verses" && a.action !== "delete" && (
                    <Link href={`/admin/scriptures/v/${a.entityId}`} className="underline">
                      open
                    </Link>
                  )}
                  {a.table === "scripture_divisions" && a.action !== "delete" && a.entityId > 0 && (
                    <Link href={`/admin/scriptures/d/${a.entityId}`} className="underline">
                      open
                    </Link>
                  )}
                  {a.note && <span className="text-xs text-[var(--a-fg-muted)]">· {a.note}</span>}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </>
  );
}
