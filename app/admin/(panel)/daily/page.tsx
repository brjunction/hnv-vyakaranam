import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailyItems, dailyPins, sutras } from "@/lib/db/schema";
import { getDailyFor, getDailyPoolStats } from "@/lib/data/daily";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, Panel, todayInNepal } from "@/components/admin/ui";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { addPin, removePin, setChapterDaily, setSutraDaily } from "@/lib/actions/daily";

export const metadata = { title: "Verse of the Day" };

export default async function DailyAdmin() {
  await requireUser("contributor");
  const db = getDb();
  const today = todayInNepal();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  const [stats, pins, preview] = await Promise.all([
    getDailyPoolStats(),
    db
      .select({
        id: dailyPins.id,
        pool: dailyPins.pool,
        date: dailyPins.date,
        entityType: dailyPins.entityType,
        entityId: dailyPins.entityId,
        sutraNumber: sutras.number,
        subSanskrit: dailyItems.sanskrit,
      })
      .from(dailyPins)
      .leftJoin(sutras, and(eq(dailyPins.entityType, "sutra"), eq(sutras.id, dailyPins.entityId)))
      .leftJoin(dailyItems, and(eq(dailyPins.entityType, "daily_item"), eq(dailyItems.id, dailyPins.entityId)))
      .where(gte(dailyPins.date, weekAgo))
      .orderBy(desc(dailyPins.date)),
    getDailyFor(today),
  ]);
  const totalEligible = stats.reduce((n, c) => n + c.eligible, 0);

  return (
    <>
      <PageHeader
        title="Verse of the Day"
        intro="Each visitor sees one item from the pool, chosen by their own calendar date, so it changes at their midnight. A pin always wins for its date."
      />

      <Panel title="Today" aside={<span className="text-sm text-[var(--fg-muted)]">{today}</span>}>
        {preview.verseOfDay ? (
          <div>
            <p className="font-devanagari text-2xl">{preview.verseOfDay.sanskrit.replace(/\s*\/\s*/g, " ")}</p>
            <p className="italic text-[var(--fg-muted)]">{preview.verseOfDay.iast.replace(/\s*\/\s*/g, " ")}</p>
            <p className="text-sm text-[var(--fg-faint)] mt-1">{preview.verseOfDay.label} · {preview.verseOfDay.context}</p>
          </div>
        ) : (
          <p className="text-[var(--fg-muted)]">The pool is empty, so the home page hides this section.</p>
        )}
      </Panel>

      <Panel title="Pool by chapter" aside={<span className="text-sm text-[var(--fg-muted)]">{totalEligible} in the pool</span>}>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--fg-muted)]">
              <tr>
                <th className="px-2 py-2 font-semibold">Chapter</th>
                <th className="px-2 py-2 font-semibold text-right">In pool</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {stats.map((c) => (
                <tr key={c.chapterId} className="border-t border-[var(--border)]">
                  <td className="px-2 py-3 font-devanagari">{c.title}</td>
                  <td className="px-2 py-3 text-right sutra-number">
                    {c.eligible} / {c.total}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex justify-end gap-2">
                      <ActionForm action={setChapterDaily}>
                        <input type="hidden" name="chapterId" value={c.chapterId} />
                        <input type="hidden" name="eligible" value="true" />
                        <SubmitButton variant="ghost" className="!px-3 !py-1">Include all</SubmitButton>
                      </ActionForm>
                      <ActionForm action={setChapterDaily}>
                        <input type="hidden" name="chapterId" value={c.chapterId} />
                        <input type="hidden" name="eligible" value="false" />
                        <SubmitButton variant="ghost" className="!px-3 !py-1">Exclude all</SubmitButton>
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-2 py-4 text-[var(--fg-muted)]">
                    No sūtras in the database yet. An owner can import them from the Dashboard.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ActionForm action={setSutraDaily} className="mt-6 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Field label="One sūtra">
              <input name="number" placeholder="e.g. 42 or 0.1.1" className={inputCls} />
            </Field>
          </div>
          <SubmitButton variant="ghost" name="eligible" value="true">Include</SubmitButton>
          <SubmitButton variant="ghost" name="eligible" value="false">Exclude</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel title="Pins">
        <ActionForm action={addPin} resetOnSuccess className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end mb-6">
          <Field label="Date">
            <input name="date" type="date" defaultValue={today} required className={inputCls} />
          </Field>
          <Field label="Section">
            <select name="pool" className={inputCls} defaultValue="verse_of_day">
              <option value="verse_of_day">Verse of the Day</option>
              <option value="subhashita">Subhāṣita</option>
            </select>
          </Field>
          <Field label="Sūtra number or Subhāṣita #">
            <input name="ref" required className={inputCls} placeholder="42" />
          </Field>
          <SubmitButton>Pin</SubmitButton>
        </ActionForm>

        {pins.length === 0 ? (
          <p className="text-[var(--fg-muted)]">No pins. The rotation decides every day.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {pins.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                <span>
                  <span className="sutra-number font-semibold mr-3">{p.date}</span>
                  {p.pool === "verse_of_day" ? `Sūtra ${p.sutraNumber ?? "?"}` : `Subhāṣita #${p.entityId}`}
                  {p.pool === "subhashita" && p.subSanskrit && (
                    <span className="font-devanagari text-[var(--fg-muted)] ml-2">{p.subSanskrit.slice(0, 40)}…</span>
                  )}
                </span>
                <ActionForm action={removePin}>
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton variant="ghost" className="!px-3 !py-1">Remove</SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
