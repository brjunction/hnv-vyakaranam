import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getEdition } from "@/lib/data/hnvAdmin";
import { PageHeader } from "@/components/admin/ui";
import { EDITION_NAMES } from "@/components/admin/hnv/bits";
import DocxImporter from "@/components/admin/hnv/DocxImporter";

export const metadata = { title: "Import commentaries (Word)" };
// each import batch is a server action of this page
export const maxDuration = 300;

export default async function ImportDocxPage({ params }: { params: Promise<{ edition: string }> }) {
  await requireUser("editor");
  const { edition: slug } = await params;
  const edition = await getEdition(slug);
  if (!edition) notFound();
  const name = EDITION_NAMES[edition.slug] ?? edition.name;
  return (
    <>
      <PageHeader
        title="Import commentaries (Word)"
        intro={`Add the Amṛta and Bāla-toṣaṇī commentaries to the ${name} edition from Word files (amrta_nama.docx, bala_samasa.docx …). Sūtra numbers come from the files; sūtras not yet in the edition are created in their prakaraṇa. Preview first; every change can be undone from the sūtra’s history.`}
        actions={
          <Link href={`/admin/hnv/${edition.slug}`} className="a-btn a-btn-outline">
            ← Chapters & sūtras
          </Link>
        }
      />
      <DocxImporter edition={edition.slug} editionName={name} />
    </>
  );
}
