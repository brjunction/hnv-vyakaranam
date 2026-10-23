import { requireUser } from "@/lib/auth/session";
import { PageHeader, Panel } from "@/components/admin/ui";
import PasswordForm from "./PasswordForm";

export const metadata = { title: "Account" };

export default async function Account() {
  const user = await requireUser("viewer");
  return (
    <>
      <PageHeader title="Account" intro={`${user.name} — ${user.email} (${user.role})`} />
      <Panel title="Change password">
        <PasswordForm />
      </Panel>
    </>
  );
}
