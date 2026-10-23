import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { listSongsAdmin } from "@/lib/data/songs";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import { StatusPill } from "@/components/admin/scriptures/bits";
import RowFilter from "@/components/admin/scriptures/RowFilter";
import SongSheetUpload from "@/components/admin/songs/SongSheetUpload";
import { SONG_LANGUAGE_LABEL, comparePlace } from "@/lib/songs/core";

export const metadata = { title: "Songs" };
export const dynamic = "force-dynamic";

export default async function SongsAdmin() {
  const user = await requireUser("viewer");
  const canEdit = hasRole(user, "editor");
  const all = await listSongsAdmin();
  const books = new Map<string, typeof all>();
  for (const s of all) books.set(s.book || "Not in a book", [...(books.get(s.book || "Not in a book") ?? []), s]);
  const groups = [...books.entries()].sort((a, b) => (a[0] === "Not in a book" ? 1 : b[0] === "Not in a book" ? -1 : a[0].localeCompare(b[0])));
  const authors = new Set(all.map((s) => s.author).filter(Boolean)).size;
  return (
    <>
      <PageHeader
        title="Vaiṣṇava songs"
        intro="Songs, aṣṭakams, stotras, Padyāvalī verses … Each verse is given once, in any script; the site shows it in Devanagari, IAST, Bengali and Odia."
        actions={
          <>
            <a href="/songs" target="_blank" rel="noreferrer" className="a-btn a-btn-outline">
              View <ExternalLink size={14} />
            </a>
            {canEdit && (
              <Link href="/admin/songs/new" className="a-btn a-btn-primary">
                <Plus size={15} /> Add a song
              </Link>
            )}
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Songs" value={all.length} />
        <Stat label="Published" value={all.filter((s) => s.status === "published").length} />
        <Stat label="Books" value={[...books.keys()].filter((b) => b !== "Not in a book").length} />
        <Stat label="Authors" value={authors} />
      </div>
      {canEdit && (
        <Panel title="Bulk add or update (Excel)" description="Download the sheet (it contains every song), fill rows — one row per verse — and upload it. A dry run shows what will change before anything is saved.">
          <SongSheetUpload />
        </Panel>
      )}
      <div className="mb-3">
        <RowFilter target="song-table" placeholder="Filter by title, author, book…" />
      </div>
      <div id="song-table" className="a-card overflow-hidden">
        {all.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--a-fg-muted)]">No songs yet — add one, or upload a sheet.</p>
        ) : (
          groups.map(([book, list]) => (
            <div key={book} data-group>
              <p className="border-b border-[var(--a-border)] bg-[var(--a-muted)]/60 px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--a-fg-muted)]">
                {book} · {list.length}
              </p>
              <ul className="divide-y divide-[var(--a-border)]">
                {[...list]
                  .sort((a, b) => comparePlace(a.bookPlace, b.bookPlace) || a.title.localeCompare(b.title))
                  .map((s) => (
                    <li key={s.id} data-text={`${s.title} ${s.altTitles} ${s.author} ${s.book} ${s.kind}`.toLowerCase()}>
                      <Link href={`/admin/songs/${s.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--a-muted)]/40">
                        {s.bookPlace && <span className="w-16 shrink-0 text-xs tabular-nums text-[var(--a-fg-muted)]">{s.bookPlace}</span>}
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{s.title}</span>
                            <StatusPill status={s.status} />
                          </span>
                          <span className="block truncate text-xs text-[var(--a-fg-muted)]">
                            {[s.author, s.kind, SONG_LANGUAGE_LABEL[s.language], `${s.verses.length} verse${s.verses.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </>
  );
}
