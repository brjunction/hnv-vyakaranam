import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailyItems } from "@/lib/db/schema";
import { hasRole, requireUser } from "@/lib/auth/session";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import DailyItemForm from "@/components/admin/DailyItemForm";
import { deleteDailyItem } from "@/lib/actions/daily";

export default async function DailyItemEditPage({ pool, idParam }: { pool: "verse_of_day" | "subhashita"; idParam: string }) {
  const user = await requireUser("viewer");
  const id = Number(idParam);
  if (!Number.isInteger(id)) notFound();
  const [item] = await getDb()
    .select()
    .from(dailyItems)
    .where(and(eq(dailyItems.id, id), eq(dailyItems.pool, pool)))
    .limit(1);
  if (!item) notFound();
  const base = pool === "verse_of_day" ? "/admin/verses" : "/admin/subhashita";
  const label = pool === "verse_of_day" ? "Verse" : "Subhāṣita";

  return (
    <>
      <Link href={base} className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        ← Back to the list
      </Link>
      <div className="mt-4">
        <PageHeader title={`${label} #${item.id}`} intro={item.source || undefined} />
      </div>
      {hasRole(user, "contributor") ? (
        <Panel>
          <DailyItemForm
            pool={pool}
            canPublish={hasRole(user, "editor")}
            initial={{ id: item.id, sanskrit: item.sanskrit, iast: item.iast, translation: item.translation, source: item.source, status: item.status }}
          />
        </Panel>
      ) : (
        <Panel>
          <p className="font-devanagari text-xl whitespace-pre-line">{item.sanskrit.replace(/\s*\/\s*/g, "\n")}</p>
          <p className="italic text-[var(--fg-muted)] mt-2 whitespace-pre-line">{item.iast.replace(/\s*\/\s*/g, "\n")}</p>
          <p className="mt-3">{item.translation}</p>
        </Panel>
      )}
      {hasRole(user, "editor") && (
        <Panel title="Delete">
          <p className="text-sm text-[var(--fg-muted)] mb-4">Removes it from the rotation and the schedule. A copy stays in the revision history.</p>
          <ActionForm action={deleteDailyItem} confirm={`Delete this ${label}?`}>
            <input type="hidden" name="id" value={item.id} />
            <SubmitButton variant="danger">Delete {label}</SubmitButton>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
