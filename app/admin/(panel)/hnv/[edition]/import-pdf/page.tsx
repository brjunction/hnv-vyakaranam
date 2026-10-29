import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getEdition } from "@/lib/data/hnvAdmin";
import { PageHeader } from "@/components/admin/ui";
import { EDITION_NAMES } from "@/components/admin/hnv/bits";
import PdfImporter from "@/components/admin/hnv/PdfImporter";

export const metadata = { title: "Import from PDF" };
// each import batch is a server action of this page
export const maxDuration = 300;

export default async function ImportPdfPage({ params }: { params: Promise<{ edition: string }> }) {
  await requireUser("editor");
  const { edition: slug } = await params;
  const edition = await getEdition(slug);
  if (!edition) notFound();
  const name = EDITION_NAMES[edition.slug] ?? edition.name;
  return (
    <>
      <PageHeader
        title="Import from PDF"
        intro={`Fill and correct the ${name} edition from the printed volumes: sūtra text, synonyms, translation, vṛtti, the Amṛta, Saṁśodhinī and Bāla commentaries, footnotes and tables. You see every change before anything is written, and each change can be undone from the sūtra's history.`}
        actions={
          <Link href={`/admin/hnv/${edition.slug}`} className="a-btn a-btn-outline">
            ← Chapters & sūtras
          </Link>
        }
      />
      <PdfImporter edition={edition.slug} editionName={name} />
    </>
  );
}
