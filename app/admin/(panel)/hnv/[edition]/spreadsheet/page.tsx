import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getEdition } from "@/lib/data/hnvAdmin";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Crumbs, EDITION_NAMES } from "@/components/admin/hnv/bits";
import SpreadsheetUpload from "@/components/admin/hnv/SpreadsheetUpload";

export const metadata = { title: "Spreadsheet" };

export default async function SpreadsheetPage({ params }: { params: Promise<{ edition: string }> }) {
  const user = await requireUser("viewer");
  const edition = await getEdition((await params).edition);
  if (!edition) notFound();
  const name = EDITION_NAMES[edition.slug] ?? edition.name;
  return (
    <>
      <Crumbs items={[{ label: "Chapters & sūtras", href: `/admin/hnv/${edition.slug}` }, { label: name, href: `/admin/hnv/${edition.slug}` }, { label: "Spreadsheet" }]} />
      <PageHeader
        title="Update by spreadsheet"
        intro={`Download the ${name} sūtras as a spreadsheet, fill it in or correct it in Excel or Google Sheets, and upload it back. Many sūtras are updated at once.`}
      />
      <Panel title="1. Download the template">
        <p className="mb-4 text-[var(--fg-muted)]">
          It contains every {name} sūtra as it is now (one row each, one column per commentary), a Chapters sheet, and a
          “Read me” sheet with the rules.
        </p>
        <a
          href={`/api/admin/hnv-template?edition=${edition.slug}`}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)]"
        >
          <Download size={16} /> Download {name} spreadsheet
        </a>
      </Panel>
      <Panel title="2. Upload it back">
        <ul className="mb-5 list-disc space-y-1 pl-5 text-sm text-[var(--fg-muted)]">
          <li>Sūtras are matched by their Number; changed cells update that sūtra.</li>
          <li>New numbers become new sūtras, placed after the row above them. New section titles create sections.</li>
          <li>Empty cells never erase anything, and an upload never deletes sūtras.</li>
          <li>If any row has a problem, nothing is saved and the list of problems is shown.</li>
        </ul>
        {hasRole(user, "editor") ? (
          <SpreadsheetUpload edition={edition.slug} />
        ) : (
          <p className="text-sm text-[var(--fg-muted)]">Only editors can upload.</p>
        )}
      </Panel>
    </>
  );
}
