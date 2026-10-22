import Link from "next/link";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailyItems, dailyPins, editions, sutras } from "@/lib/db/schema";
import { getDailyFor } from "@/lib/data/daily";
import { requireUser, hasRole } from "@/lib/auth/session";
import { PageHeader, Panel, Stat, todayInNepal } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { runHnvImport } from "@/lib/actions/daily";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser("viewer");
  const { denied } = await searchParams;
  const db = getDb();
  const today = todayInNepal();

  const [perEdition, daily, [pinCounts]] = await db.batch([
    db
      .select({
        edition: editions.name,
        total: count(sutras.id),
        withVrtti: sql<number>`count(*) filter (where ${sutras.vrtti} <> '')::int`,
        withTranslation: sql<number>`count(*) filter (where ${sutras.translation} <> '')::int`,
      })
      .from(editions)
      .leftJoin(sutras, eq(sutras.editionId, editions.id))
      .groupBy(editions.id, editions.name, editions.sort)
      .orderBy(editions.sort),
    db
      .select({
        pool: dailyItems.pool,
        total: count(),
        published: sql<number>`count(*) filter (where ${dailyItems.status} = 'published')::int`,
      })
      .from(dailyItems)
      .groupBy(dailyItems.pool),
    db.select({ upcoming: count() }).from(dailyPins).where(and(gte(dailyPins.date, today))),
  ]);
  const pool = (p: string) => daily.find((d) => d.pool === p) ?? { total: 0, published: 0 };
  const madhyama = perEdition.find((e) => e.edition === "Madhyama");
  const preview = await getDailyFor(today);

  return (
    <>
      <PageHeader title={`Namaste, ${user.name.split(" ")[0]}`} intro="What's in the database now, and what visitors see today." />

      {denied && (
        <p className="mb-6 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 p-4 text-sm">Your access level doesn&apos;t allow that.</p>
      )}

      {madhyama && Number(madhyama.total) === 0 && hasRole(user, "owner") && (
        <Panel title="Import the Madhyama sūtras">
          <p className="text-[var(--fg-muted)] mb-4">
            The database has no sūtras yet. This copies all nine Madhyama chapters from the spreadsheets the site uses today
            (content/chapters/*.xlsx). It never deletes anything and is safe to run again.
          </p>
          <ActionForm action={runHnvImport}>
            <SubmitButton>Import sūtras from the spreadsheets</SubmitButton>
          </ActionForm>
        </Panel>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {perEdition.map((e) => (
          <Stat key={e.edition} label={`${e.edition} sūtras`} value={Number(e.total)} note={Number(e.total) ? undefined : "not added yet"} />
        ))}
        <Stat label="Verses of the Day" value={pool("verse_of_day").published} note={`${pool("verse_of_day").total} total`} />
        <Stat label="Subhāṣitas" value={pool("subhashita").published} note={`${pool("subhashita").total} total`} />
        <Stat label="Scheduled dates" value={pinCounts.upcoming} note="from today on" />
      </div>

      <Panel title="Today on the home page" aside={<span className="text-sm text-[var(--fg-muted)]">{today}, Nepal time</span>}>
        <div className="grid md:grid-cols-2 gap-6">
          {(
            [
              ["Verse of the Day", preview.verseOfDay, "/admin/verses"],
              ["Subhāṣita", preview.subhashita, "/admin/subhashita"],
            ] as const
          ).map(([label, entry, href]) => (
            <div key={label}>
              <p className="anv-label mb-2">{label}</p>
              {entry ? (
                <>
                  <p className="font-devanagari text-xl">{entry.sanskrit.replace(/\s*\/\s*/g, " ")}</p>
                  {entry.source && <p className="text-sm text-[var(--fg-muted)] mt-1">{entry.source}</p>}
                </>
              ) : (
                <p className="text-[var(--fg-muted)]">
                  Nothing published yet, so this card is hidden on the home page.{" "}
                  <Link href={href} className="underline">Add one</Link>.
                </p>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {madhyama && Number(madhyama.total) > 0 && (
        <Panel title="Content still to enter (Madhyama)">
          <ul className="text-[var(--fg-muted)] space-y-1">
            <li>Vṛtti: {Number(madhyama.total) - madhyama.withVrtti} of {Number(madhyama.total)} rows empty</li>
            <li>Translation: {Number(madhyama.total) - madhyama.withTranslation} of {Number(madhyama.total)} rows empty</li>
          </ul>
          <p className="text-sm text-[var(--fg-faint)] mt-3">Sūtra editing arrives in the next admin release.</p>
        </Panel>
      )}
    </>
  );
}
