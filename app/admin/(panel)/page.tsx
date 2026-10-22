import Link from "next/link";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailyItems, dailyPins, sutras } from "@/lib/db/schema";
import { getDailyFor } from "@/lib/data/daily";
import { requireUser, hasRole } from "@/lib/auth/session";
import { PageHeader, Panel, Stat, todayInNepal } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { runHnvImport } from "@/lib/actions/daily";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser("contributor");
  const { denied } = await searchParams;
  const db = getDb();
  const today = todayInNepal();

  const [[sutraCounts], [subCounts], [pinCounts]] = await db.batch([
    db
      .select({
        total: count(),
        eligible: sql<number>`count(*) filter (where ${sutras.dailyEligible})::int`,
        withVrtti: sql<number>`count(*) filter (where ${sutras.vrtti} <> '')::int`,
        withTranslation: sql<number>`count(*) filter (where ${sutras.translation} <> '')::int`,
      })
      .from(sutras),
    db
      .select({
        total: count(),
        published: sql<number>`count(*) filter (where ${dailyItems.status} = 'published')::int`,
      })
      .from(dailyItems)
      .where(eq(dailyItems.pool, "subhashita")),
    db.select({ upcoming: count() }).from(dailyPins).where(and(gte(dailyPins.date, today))),
  ]);
  const daily = await getDailyFor(today);

  return (
    <>
      <PageHeader title={`Namaste, ${user.name.split(" ")[0]}`} intro="What's in the database right now, and what visitors see today." />

      {denied && (
        <p className="mb-6 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 p-4 text-sm">
          Your role doesn&apos;t allow that page.
        </p>
      )}

      {sutraCounts.total === 0 && hasRole(user, "owner") && (
        <Panel title="Import the sūtras">
          <p className="text-[var(--fg-muted)] mb-4">
            The database has no sūtras yet. This copies all nine chapters from the spreadsheets that the site uses
            today (content/chapters/*.xlsx) into the database. It never deletes anything and is safe to run again.
          </p>
          <ActionForm action={runHnvImport}>
            <SubmitButton>Import sūtras from the spreadsheets</SubmitButton>
          </ActionForm>
        </Panel>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Sūtras & verses" value={sutraCounts.total} note="Madhyama edition" />
        <Stat label="In the daily pool" value={sutraCounts.eligible} note="Verse of the Day" />
        <Stat label="Subhāṣitas" value={subCounts.published} note={`${subCounts.total - subCounts.published} draft or archived`} />
        <Stat label="Upcoming pins" value={pinCounts.upcoming} note="from today on" />
      </div>

      <Panel title="Today on the home page" aside={<span className="text-sm text-[var(--fg-muted)]">{today}, Nepal time</span>}>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="anv-label mb-2">Verse of the Day</p>
            {daily.verseOfDay ? (
              <>
                <p className="font-devanagari text-xl">{daily.verseOfDay.sanskrit.replace(/\s*\/\s*/g, " ")}</p>
                <p className="text-sm text-[var(--fg-muted)] mt-1">{daily.verseOfDay.label} · {daily.verseOfDay.context}</p>
              </>
            ) : (
              <p className="text-[var(--fg-muted)]">The pool is empty, so the section is hidden.</p>
            )}
          </div>
          <div>
            <p className="anv-label mb-2">Subhāṣita</p>
            {daily.subhashita ? (
              <p className="font-devanagari text-xl">{daily.subhashita.sanskrit.replace(/\s*\/\s*/g, " ")}</p>
            ) : (
              <p className="text-[var(--fg-muted)]">
                No published Subhāṣitas yet, so the section is hidden.{" "}
                <Link href="/admin/subhashita" className="underline">Add the first one</Link>.
              </p>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Content still to enter">
        <ul className="text-[var(--fg-muted)] space-y-1">
          <li>Vṛtti: {sutraCounts.total - sutraCounts.withVrtti} of {sutraCounts.total} rows still empty</li>
          <li>Translation: {sutraCounts.total - sutraCounts.withTranslation} of {sutraCounts.total} rows still empty</li>
        </ul>
        <p className="text-sm text-[var(--fg-faint)] mt-3">Sūtra editing arrives in the next admin release.</p>
      </Panel>
    </>
  );
}
