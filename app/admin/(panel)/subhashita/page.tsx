import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailyItems } from "@/lib/db/schema";
import { hasRole, requireUser } from "@/lib/auth/session";
import { PageHeader, Panel } from "@/components/admin/ui";
import SubhashitaForm from "./SubhashitaForm";

export const metadata = { title: "Subhāṣita" };

const STATUS_STYLE: Record<string, string> = {
  published: "text-[var(--success)] border-[var(--success)]/40",
  draft: "text-[var(--fg-muted)] border-[var(--border-strong)]",
  archived: "text-[var(--fg-faint)] border-[var(--border)]",
};

export default async function SubhashitaAdmin() {
  const user = await requireUser("contributor");
  const items = await getDb()
    .select()
    .from(dailyItems)
    .where(eq(dailyItems.pool, "subhashita"))
    .orderBy(desc(dailyItems.id));

  return (
    <>
      <PageHeader
        title="Daily Subhāṣita"
        intro="Published Subhāṣitas form the pool for the home page's Subhāṣita of the day. Nothing is shown until at least one is published."
      />
      <Panel title="Add a Subhāṣita">
        <SubhashitaForm canPublish={hasRole(user, "editor")} />
      </Panel>
      <Panel title="All Subhāṣitas" aside={<span className="text-sm text-[var(--fg-muted)]">{items.length}</span>}>
        {items.length === 0 ? (
          <p className="text-[var(--fg-muted)]">None yet. The first one you publish appears on the home page right away.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {items.map((it) => (
              <li key={it.id}>
                <Link href={`/admin/subhashita/${it.id}`} className="flex items-start gap-4 py-4 group">
                  <span className="sutra-number text-sm text-[var(--fg-faint)] w-10 shrink-0 pt-1">#{it.id}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-devanagari text-lg group-hover:text-[var(--accent)]">
                      {it.sanskrit.split("/")[0]}
                    </span>
                    <span className="block text-sm text-[var(--fg-muted)] truncate">{it.translation || "No translation yet"}</span>
                  </span>
                  <span className={`shrink-0 text-xs rounded-full border px-2 py-0.5 ${STATUS_STYLE[it.status]}`}>{it.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
