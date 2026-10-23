import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getBookAdmin } from "@/lib/data/scripturesAdmin";
import { Panel } from "@/components/admin/ui";
import { Crumbs } from "@/components/admin/hnv/bits";
import { BookTabs } from "@/components/admin/scriptures/bits";
import SheetUpload from "@/components/admin/scriptures/SheetUpload";

export const metadata = { title: "Spreadsheet" };
export const dynamic = "force-dynamic";

export default async function Spreadsheet({ params }: { params: Promise<{ code: string }> }) {
  await requireUser("editor");
  const { code } = await params;
  const data = await getBookAdmin(code);
  if (!data) notFound();
  const { book, tree, types } = data;
  const top = tree.filter((n) => n.parentId === null);
  const verseTypes = types.filter((t) => t.appliesTo !== "division");

  return (
    <>
      <Crumbs items={[{ label: "Scriptures", href: "/admin/scriptures" }, { label: book.title, href: `/admin/scriptures/${book.code}` }, { label: "Spreadsheet" }]} />
      <h1 className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl">{book.title}</h1>
      <BookTabs code={book.code} active="spreadsheet" />

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <Panel title="1. Download the template" description="It already contains everything entered so far — fill the gaps or correct, then upload it back.">
          <a href={`/api/admin/scripture-template?book=${book.code}`} className="a-btn a-btn-primary w-full justify-center">
            <Download size={16} /> Whole book (.xlsx)
          </a>
          {top.length > 0 && (
            <form action="/api/admin/scripture-template" method="get" className="mt-4 grid gap-2">
              <input type="hidden" name="book" value={book.code} />
              <label className="text-sm font-medium" htmlFor="division">
                Or one {book.levels[0].toLowerCase()} only
              </label>
              <div className="flex gap-2">
                <select id="division" name="division" className="a-input flex-1">
                  {top.map((n) => (
                    <option key={n.id} value={n.id}>
                      {book.levels[0]} {n.number}
                      {n.title ? ` — ${n.title}` : ""}
                    </option>
                  ))}
                </select>
                <button type="submit" className="a-btn a-btn-outline" aria-label="Download">
                  <Download size={15} />
                </button>
              </div>
            </form>
          )}
          <div className="mt-5 rounded-lg bg-[var(--a-muted)] p-3 text-xs leading-relaxed text-[var(--a-fg-muted)]">
            <p className="mb-1 font-medium text-[var(--a-fg)]">Columns on the “Verses” sheet</p>
            <p>
              {[...book.levels, "Verse", "Shown as", "Devanagari", "IAST", "Speaker", "Status", ...verseTypes.map((t) => t.name)].join(" · ")}
            </p>
            <p className="mt-2">Empty cells never erase. Nothing is deleted. A “Read me” sheet inside explains everything.</p>
          </div>
        </Panel>

        <Panel title="2. Upload the filled file" description="First a check shows exactly what will change; nothing is saved until you press Apply.">
          <SheetUpload bookId={book.id} levels={book.levels} typeNames={verseTypes.map((t) => t.name)} />
        </Panel>
      </div>
    </>
  );
}
