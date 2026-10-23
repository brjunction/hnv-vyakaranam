import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getSongAdmin, songFacets } from "@/lib/data/songs";
import { deleteSong } from "@/lib/actions/songs";
import { PageHeader } from "@/components/admin/ui";
import { Crumbs } from "@/components/admin/hnv/bits";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import SongForm from "@/components/admin/songs/SongForm";
import { songPath } from "@/lib/songs/core";

export const metadata = { title: "Edit song" };
export const dynamic = "force-dynamic";

export default async function EditSong({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireUser("editor");
  const [song, facets, sp] = await Promise.all([getSongAdmin(Number((await params).id)), songFacets(), searchParams]);
  if (!song) notFound();
  return (
    <>
      <Crumbs items={[{ label: "Songs", href: "/admin/songs" }, ...(song.book ? [{ label: song.book }] : []), { label: song.title }]} />
      <PageHeader
        title={song.title}
        intro={sp.created ? "Added. Keep editing, or add the next song." : undefined}
        actions={
          <a href={songPath(song.slug)} target="_blank" rel="noreferrer" className="a-btn a-btn-outline">
            View <ExternalLink size={14} />
          </a>
        }
      />
      <SongForm key={song.id} song={song} facets={facets} />
      <div className="mt-8 border-t border-[var(--a-border)] pt-4">
        <ActionForm action={deleteSong} confirm={`Delete “${song.title}”? This cannot be undone.`}>
          <input type="hidden" name="id" value={song.id} />
          <SubmitButton variant="danger">Delete song</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
