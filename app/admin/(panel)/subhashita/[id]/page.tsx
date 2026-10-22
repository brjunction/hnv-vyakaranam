import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailyItems } from "@/lib/db/schema";
import { hasRole, requireUser } from "@/lib/auth/session";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { deleteSubhashita } from "@/lib/actions/daily";
import SubhashitaForm from "../SubhashitaForm";

export const metadata = { title: "Edit Subhāṣita" };

export default async function EditSubhashita({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("contributor");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [item] = await getDb().select().from(dailyItems).where(eq(dailyItems.id, id)).limit(1);
  if (!item) notFound();

  return (
    <>
      <Link href="/admin/subhashita" className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        ← All Subhāṣitas
      </Link>
      <div className="mt-4">
        <PageHeader title={`Subhāṣita #${item.id}`} />
      </div>
      <Panel>
        <SubhashitaForm
          canPublish={hasRole(user, "editor")}
          initial={{
            id: item.id,
            sanskrit: item.sanskrit,
            iast: item.iast,
            translation: item.translation,
            source: item.source,
            status: item.status,
          }}
        />
      </Panel>
      {hasRole(user, "editor") && (
        <Panel title="Delete">
          <p className="text-sm text-[var(--fg-muted)] mb-4">
            Removes it from the pool and deletes any pins for it. A copy is kept in the revision history.
          </p>
          <ActionForm action={deleteSubhashita} confirm="Delete this Subhāṣita?">
            <input type="hidden" name="id" value={item.id} />
            <SubmitButton variant="danger">Delete Subhāṣita</SubmitButton>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
