import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getMoreItemAdmin } from "@/lib/data/more";
import { deleteMoreItem } from "@/lib/actions/more";
import { PageHeader } from "@/components/admin/ui";
import { Crumbs } from "@/components/admin/hnv/bits";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import ItemForm from "@/components/admin/more/ItemForm";
import { hasPage, itemPath } from "@/lib/more/core";

export const metadata = { title: "More — edit" };
export const dynamic = "force-dynamic";

export default async function EditItem({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("editor");
  const r = await getMoreItemAdmin(Number((await params).id));
  if (!r) notFound();
  const { item, section } = r;
  const href = hasPage(section.kind, item) ? itemPath(section.key, item.slug) : `/more/${section.key}`;
  return (
    <>
      <Crumbs items={[{ label: "More page", href: "/admin/more" }, { label: section.title, href: `/admin/more/${section.id}` }, { label: item.title }]} />
      <PageHeader
        title={item.title}
        actions={
          <a href={href} target="_blank" rel="noreferrer" className="a-btn a-btn-outline">
            View <ExternalLink size={14} />
          </a>
        }
      />
      <ItemForm kind={section.kind} sectionId={section.id} item={item} />
      <div className="mt-8 border-t border-[var(--a-border)] pt-4">
        <ActionForm action={deleteMoreItem} confirm={`Delete “${item.title}”?`}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="back" value="1" />
          <SubmitButton variant="danger">Delete</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
