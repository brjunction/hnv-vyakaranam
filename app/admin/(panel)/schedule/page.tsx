import { and, asc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailyItems, dailyPins } from "@/lib/db/schema";
import { hasRole, requireUser } from "@/lib/auth/session";
import { PageHeader, Panel, todayInNepal } from "@/components/admin/ui";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { addPin, removePin } from "@/lib/actions/daily";
import { dayNumber, pickKey } from "@/lib/daily/pick";

export const metadata = { title: "Schedule" };

function addDays(date: string, n: number) {
  return new Date((dayNumber(date) + n) * 86_400_000).toISOString().slice(0, 10);
}

export default async function Schedule() {
  const user = await requireUser("viewer");
  const canEdit = hasRole(user, "editor");
  const db = getDb();
  const today = todayInNepal();
  const [items, pins] = await db.batch([
    db.select().from(dailyItems).where(eq(dailyItems.status, "published")).orderBy(asc(dailyItems.id)),
    db.select().from(dailyPins).where(gte(dailyPins.date, today)).orderBy(asc(dailyPins.date)),
  ]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const pools = {
    verse_of_day: items.filter((i) => i.pool === "verse_of_day"),
    subhashita: items.filter((i) => i.pool === "subhashita"),
  };
  const pinMap = { verse_of_day: new Map<string, number>(), subhashita: new Map<string, number>() };
  for (const p of pins) pinMap[p.pool].set(p.date, p.entityId);

  // What visitors will see over the next two weeks (same algorithm as the site).
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const preview = days.map((d) => {
    const show = (pool: "verse_of_day" | "subhashita") => {
      const keys = pools[pool].map((i) => `daily_item:${i.id}`);
      const pinned = pinMap[pool].get(d);
      const key = pickKey(keys, d, pinned ? `daily_item:${pinned}` : null);
      const item = key ? byId.get(Number(key.split(":")[1])) : undefined;
      return { item, scheduled: Boolean(pinned && item && item.id === pinned) };
    };
    return { date: d, verse: show("verse_of_day"), sub: show("subhashita") };
  });

  const Cell = ({ v }: { v: { item?: (typeof items)[number]; scheduled: boolean } }) =>
    v.item ? (
      <span>
        <span className="font-devanagari">{v.item.sanskrit.split("/")[0].slice(0, 42)}</span>
        <span className="block text-xs text-[var(--fg-muted)]">
          #{v.item.id} {v.item.source && `· ${v.item.source}`} {v.scheduled ? "· scheduled" : "· automatic"}
        </span>
      </span>
    ) : (
      <span className="text-[var(--fg-faint)]">Hidden (nothing published)</span>
    );

  return (
    <>
      <PageHeader
        title="Schedule"
        intro="Every day shows one verse and one Subhāṣita. By default they rotate automatically through everything published; schedule an entry to fix it to a date."
      />

      {canEdit && (
        <div className="grid lg:grid-cols-2 gap-6">
          {(["verse_of_day", "subhashita"] as const).map((pool) => (
            <Panel key={pool} title={pool === "verse_of_day" ? "Schedule a verse" : "Schedule a Subhāṣita"}>
              {pools[pool].length === 0 ? (
                <p className="text-[var(--fg-muted)]">Publish at least one first.</p>
              ) : (
                <ActionForm action={addPin} className="space-y-3">
                  <input type="hidden" name="pool" value={pool} />
                  <Field label="Date">
                    <input name="date" type="date" defaultValue={addDays(today, 1)} required className={inputCls} />
                  </Field>
                  <Field label="Entry">
                    <select name="itemId" required className={inputCls}>
                      {pools[pool].map((i) => (
                        <option key={i.id} value={i.id}>
                          #{i.id} {i.source ? `${i.source} — ` : ""}
                          {i.sanskrit.split("/")[0].slice(0, 40)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <SubmitButton>Schedule</SubmitButton>
                </ActionForm>
              )}
            </Panel>
          ))}
        </div>
      )}

      <Panel title="Next 14 days">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--fg-muted)]">
              <tr>
                <th className="px-2 py-2 font-semibold w-28">Date</th>
                <th className="px-2 py-2 font-semibold">Verse of the Day</th>
                <th className="px-2 py-2 font-semibold">Subhāṣita</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r) => (
                <tr key={r.date} className="border-t border-[var(--border)] align-top">
                  <td className="px-2 py-3 sutra-number whitespace-nowrap">{r.date}</td>
                  <td className="px-2 py-3"><Cell v={r.verse} /></td>
                  <td className="px-2 py-3"><Cell v={r.sub} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Scheduled dates">
        {pins.length === 0 ? (
          <p className="text-[var(--fg-muted)]">Nothing scheduled — every day uses the automatic rotation.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {pins.map((p) => {
              const item = byId.get(p.entityId);
              return (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <span>
                    <span className="sutra-number font-semibold mr-3">{p.date}</span>
                    {p.pool === "verse_of_day" ? "Verse" : "Subhāṣita"} #{p.entityId}
                    {item?.source && <span className="text-[var(--fg-muted)]"> · {item.source}</span>}
                    {!item && <span className="text-[var(--danger)]"> (not published — this date uses the rotation)</span>}
                  </span>
                  {canEdit && (
                    <ActionForm action={removePin}>
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton variant="ghost" className="!px-3 !py-1">Remove</SubmitButton>
                    </ActionForm>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
