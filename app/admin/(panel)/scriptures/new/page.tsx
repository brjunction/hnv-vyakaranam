import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/ui";
import { Crumbs } from "@/components/admin/hnv/bits";
import BookForm from "@/components/admin/scriptures/BookForm";

export const metadata = { title: "New scripture" };

export default async function NewBook() {
  await requireUser("editor");
  return (
    <>
      <Crumbs items={[{ label: "Scriptures", href: "/admin/scriptures" }, { label: "New" }]} />
      <PageHeader title="New scripture" intro="Name it, choose how it is divided, and you can start adding chapters and verses right away. It stays hidden (draft) until you publish it." />
      <BookForm isNew />
    </>
  );
}
