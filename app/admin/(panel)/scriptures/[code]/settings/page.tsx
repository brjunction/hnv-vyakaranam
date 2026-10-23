import { notFound } from "next/navigation";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getBookAdmin, listCategoriesAdmin } from "@/lib/data/scripturesAdmin";
import { deleteBook } from "@/lib/actions/scriptures";
import { Panel } from "@/components/admin/ui";
import { Crumbs } from "@/components/admin/hnv/bits";
import { ActionForm, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { BookTabs } from "@/components/admin/scriptures/bits";
import BookForm from "@/components/admin/scriptures/BookForm";

export const metadata = { title: "Scripture settings" };
export const dynamic = "force-dynamic";

export default async function BookSettings({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser("editor");
  const { code } = await params;
  const data = await getBookAdmin(code);
  if (!data) notFound();
  const { book, tree } = data;
  const verses = tree.reduce((n, d) => n + d.verses, 0);
  return (
    <>
      <Crumbs items={[{ label: "Scriptures", href: "/admin/scriptures" }, { label: book.title, href: `/admin/scriptures/${book.code}` }, { label: "Settings" }]} />
      <h1 className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl">{book.title}</h1>
      <BookTabs code={book.code} active="settings" />
      <BookForm book={book} categories={await listCategoriesAdmin()} />
      {hasRole(user, "owner") && (
        <div className="mt-10">
          <Panel title="Delete this scripture" description="Removes the book with all its divisions, verses, commentaries and audio links. This cannot be undone from the admin.">
            <ActionForm action={deleteBook}>
              <input type="hidden" name="id" value={book.id} />
              <p className="mb-3 text-sm">
                It holds <strong>{tree.length}</strong> divisions and <strong>{verses}</strong> verses. Type <code className="rounded bg-[var(--a-muted)] px-1">{book.code}</code> to confirm.
              </p>
              <div className="flex flex-wrap gap-2">
                <input name="confirmCode" className={`${inputCls} max-w-[12rem]`} autoComplete="off" />
                <SubmitButton variant="danger">Delete {book.title}</SubmitButton>
              </div>
            </ActionForm>
          </Panel>
        </div>
      )}
    </>
  );
}
