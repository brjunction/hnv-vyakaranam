import Link from "next/link";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailyItems, dailyPins } from "@/lib/db/schema";
import { hasRole, requireUser } from "@/lib/auth/session";
import { PageHeader, Panel, todayInNepal } from "@/components/admin/ui";
import DailyItemForm from "@/components/admin/DailyItemForm";

const STATUS_STYLE: Record<string, string> = {
  published: "text-[var(--success)] border-[var(--success)]/40",
  draft: "text-[var(--fg-muted)] border-[var(--border-strong)]",
  archived: "text-[var(--fg-faint)] border-[var(--border)]",
};

const COPY = {
  verse_of_day: {
    title: "Verse of the Day",
    intro:
      "Verses from the Bhagavad-gītā, Śrīmad-Bhāgavatam or any scripture. Published verses rotate automatically, one per day; schedule a verse for a date to override the rotation.",
    addTitle: "Add a verse",
    listTitle: "All verses",
    base: "/admin/verses",
    empty: "No verses yet. The home page shows this section as soon as one is published.",
  },
  subhashita: {
    title: "Subhāṣita",
    intro:
      "Wise sayings from Cāṇakya-nīti, Hitopadeśa and other collections. Published Subhāṣitas rotate automatically, one per day; schedule one for a date to override the rotation.",
    addTitle: "Add a Subhāṣita",
    listTitle: "All Subhāṣitas",
    base: "/admin/subhashita",
    empty: "No Subhāṣitas yet. The home page shows this section as soon as one is published.",
  },
} as const;

export default async function DailyPoolPage({ pool }: { pool: "verse_of_day" | "subhashita" }) {
  const user = await requireUser("viewer");
  const c = COPY[pool];
  const db = getDb();
  const today = todayInNepal();
  const [items, pins] = await db.batch([
    db.select().from(dailyItems).where(eq(dailyItems.pool, pool)).orderBy(desc(dailyItems.id)),
    db.select({ date: dailyPins.date, id: dailyPins.entityId }).from(dailyPins).where(and(eq(dailyPins.pool, pool), gte(dailyPins.date, today))),
  ]);
  const nextDate = new Map<number, string>();
  for (const p of pins.sort((a, b) => a.date.localeCompare(b.date))) if (!nextDate.has(p.id)) nextDate.set(p.id, p.date);
  const published = items.filter((i) => i.status === "published").length;

  return (
    <>
      <PageHeader title={c.title} intro={c.intro} />
      {hasRole(user, "contributor") && (
        <Panel title={c.addTitle}>
          <DailyItemForm pool={pool} canPublish={hasRole(user, "editor")} />
        </Panel>
      )}
      <Panel title={c.listTitle} aside={<span className="text-sm text-[var(--fg-muted)]">{published} published · {items.length} total</span>}>
        {items.length === 0 ? (
          <p className="text-[var(--fg-muted)]">{c.empty}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {items.map((it) => (
              <li key={it.id}>
                <Link href={`${c.base}/${it.id}`} className="flex items-start gap-4 py-4 group">
                  <span className="sutra-number text-sm text-[var(--fg-faint)] w-10 shrink-0 pt-1">#{it.id}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-devanagari text-lg group-hover:text-[var(--accent)]">{it.sanskrit.split("/")[0]}</span>
                    <span className="block text-sm text-[var(--fg-muted)] truncate">
                      {it.source || "No reference"}
                      {it.translation ? ` — ${it.translation}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-xs rounded-full border px-2 py-0.5 ${STATUS_STYLE[it.status]}`}>{it.status}</span>
                    {nextDate.has(it.id) && <span className="text-xs text-[var(--fg-muted)]">on {nextDate.get(it.id)}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
