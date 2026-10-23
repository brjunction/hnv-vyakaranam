import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getMoreSectionAdmin } from "@/lib/data/more";
import { PageHeader } from "@/components/admin/ui";
import { Crumbs } from "@/components/admin/hnv/bits";
import ItemForm from "@/components/admin/more/ItemForm";
import { KIND_INFO } from "@/lib/more/core";

export const metadata = { title: "More — add" };
export const dynamic = "force-dynamic";

export default async function NewItem({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("editor");
  const s = await getMoreSectionAdmin(Number((await params).id));
  if (!s) notFound();
  return (
    <>
      <Crumbs items={[{ label: "More page", href: "/admin/more" }, { label: s.title, href: `/admin/more/${s.id}` }, { label: "Add" }]} />
      <PageHeader title={`Add a ${KIND_INFO[s.kind].noun}`} intro={`In “${s.title}”. New items appear at the top.`} />
      <ItemForm kind={s.kind} sectionId={s.id} />
    </>
  );
}
