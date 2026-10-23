import Link from "next/link";
import { BookOpen, Layers, MessageSquareText, Plus, ScrollText } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { listBooksAdmin, recentScriptureActivity } from "@/lib/data/scripturesAdmin";
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
  const [list, activity] = await Promise.all([listBooksAdmin(), recentScriptureActivity(12)]);
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
        <Stat label="Scriptures" value={list.length} note={`${list.filter((b) => b.status === "published").length} published`} />
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((b) => (
            <div key={b.id} className="a-card group relative flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--a-shadow-lg)]">
              <Link href={`/admin/scriptures/${b.code}`} className="flex flex-1 gap-4 p-5">
                <div className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--a-border)] bg-gradient-to-br from-[#f1ead6] to-[#e2d6ae] text-[#0d1a16] shadow-sm dark:from-[#16291f] dark:to-[#0f1e19] dark:text-[#e8c766]">
                  {b.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-devanagari text-2xl">{(b.titleDeva || b.abbrev || b.title).slice(0, 2)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold leading-snug">{b.title}</h2>
                    <StatusPill status={b.status} />
                  </div>
                  {b.titleDeva && <p className="font-devanagari text-sm text-[var(--a-fg-muted)]">{b.titleDeva}</p>}
                  <p className="mt-1 text-xs text-[var(--a-fg-muted)]">
                    <code className="rounded bg-[var(--a-muted)] px-1">/{b.code}</code> · {b.levels.join(" → ")} → {b.verseLabel}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--a-fg-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Layers size={13} /> {b.divisions.toLocaleString()} divisions
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ScrollText size={13} /> {b.verses.toLocaleString()} {b.verseLabelPlural.toLowerCase()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquareText size={13} /> {b.types} commentar{b.types === 1 ? "y" : "ies"}
                    </span>
                  </div>
                </div>
              </Link>
              <div className="flex items-center justify-between border-t border-[var(--a-border)] bg-[var(--a-muted)]/40 px-5 py-2.5 text-xs text-[var(--a-fg-muted)]">
                <span>{b.drafts ? `${b.drafts} draft${b.drafts === 1 ? "" : "s"} waiting` : `Updated ${b.updatedAt.toISOString().slice(0, 10)}`}</span>
                <span className="flex items-center gap-2">
                  <Link href={`/admin/scriptures/${b.code}/progress`} className="hover:text-[var(--a-fg)] hover:underline">
                    Progress
                  </Link>
                  {canEdit && <MoveButtons action={moveBook} id={b.id} />}
                </span>
              </div>
            </div>
          ))}
        </div>
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
