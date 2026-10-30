import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getBookAdmin } from "@/lib/data/scripturesAdmin";
import { Crumbs } from "@/components/admin/hnv/bits";
import { BookTabs } from "@/components/admin/scriptures/bits";
import EbookImport from "@/components/admin/scriptures/EbookImport";

export const metadata = { title: "Import e-books" };
export const dynamic = "force-dynamic";
// each import batch is a server action of this page
export const maxDuration = 300;

export default async function ImportEbooks({ params }: { params: Promise<{ code: string }> }) {
  await requireUser("editor");
  const { code } = await params;
  const data = await getBookAdmin(code);
  if (!data) notFound();
  const { book } = data;
  if (book.code !== "sb" && book.code !== "bg") notFound();
  return (
    <>
      <Crumbs items={[{ label: "Scriptures", href: "/admin/scriptures" }, { label: book.title, href: `/admin/scriptures/${book.code}` }, { label: "Import e-books" }]} />
      <h1 className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl">{book.title}</h1>
      <BookTabs code={book.code} active="ebooks" />
      <EbookImport bookId={book.id} bookTitle={book.title} book={book.code === "bg" ? "bg" : "sb"} />
    </>
  );
}
