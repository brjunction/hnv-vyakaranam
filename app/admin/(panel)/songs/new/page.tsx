import { requireUser } from "@/lib/auth/session";
import { songFacets } from "@/lib/data/songs";
import { PageHeader } from "@/components/admin/ui";
import { Crumbs } from "@/components/admin/hnv/bits";
import SongForm from "@/components/admin/songs/SongForm";

export const metadata = { title: "Add a song" };
export const dynamic = "force-dynamic";

export default async function NewSong() {
  await requireUser("editor");
  const facets = await songFacets();
  return (
    <>
      <Crumbs items={[{ label: "Songs", href: "/admin/songs" }, { label: "Add" }]} />
      <PageHeader title="Add a song" />
      <SongForm facets={facets} />
    </>
  );
}
