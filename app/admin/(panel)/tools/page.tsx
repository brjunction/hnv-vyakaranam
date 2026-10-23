import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { revalidateSite, runNotesImport } from "@/lib/actions/daily";

export const metadata = { title: "Tools" };

export default async function Tools() {
  await requireUser("owner");
  return (
    <>
      <PageHeader title="Tools" intro="Owner-only maintenance actions." />
      <Panel title="Import the old sūtra notes (one time)">
        <p className="text-[var(--fg-muted)] mb-4">
          Copies the notes from the old sūtra-notes Google Doc into the <strong>Notes</strong> commentary, so they can be
          edited here like everything else. Notes already in the database are never overwritten. After this, the Google
          Doc is no longer used. (The sūtras themselves were imported from the spreadsheets and are now edited only in{" "}
          <Link href="/admin/hnv/madhyama" className="underline">Chapters &amp; sūtras</Link>.)
        </p>
        <ActionForm action={runNotesImport}>
          <SubmitButton>Import notes from the Google Doc</SubmitButton>
        </ActionForm>
      </Panel>
      <Panel title="Refresh the public site">
        <p className="text-[var(--fg-muted)] mb-4">
          Clears cached pages so each one rebuilds from the database on its next visit. Saving in the admin already
          does this for what you changed; use this only if something looks stale.
        </p>
        <ActionForm action={revalidateSite}>
          <SubmitButton variant="ghost">Refresh cached pages</SubmitButton>
        </ActionForm>
      </Panel>
    </>
  );
}
