import { requireUser } from "@/lib/auth/session";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { revalidateSite } from "@/lib/actions/daily";

export const metadata = { title: "Tools" };

export default async function Tools() {
  await requireUser("owner");
  return (
    <>
      <PageHeader title="Tools" intro="Owner-only maintenance actions." />
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
