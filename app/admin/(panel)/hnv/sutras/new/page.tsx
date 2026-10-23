import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { chapters, editions, subchapters, sutras } from "@/lib/db/schema";
import { listCommentaryTypesAdmin, readingOrder } from "@/lib/data/hnvAdmin";
import { countFollowing, createSutra } from "@/lib/actions/hnv";
import { Panel } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Crumbs, EDITION_NAMES } from "@/components/admin/hnv/bits";
import { CommentaryFields, SutraFields } from "@/components/admin/hnv/SutraFields";
import { nextNumber } from "@/lib/hnv/numbering";

export const metadata = { title: "New sūtra" };

export default async function NewSutra({ searchParams }: { searchParams: Promise<{ section?: string; after?: string }> }) {
  await requireUser("editor");
  const sp = await searchParams;
  const db = getDb();
  const [sec] = await db.select().from(subchapters).where(eq(subchapters.id, Number(sp.section))).limit(1);
  if (!sec) notFound();
  const [ch] = await db.select().from(chapters).where(eq(chapters.id, sec.chapterId)).limit(1);
  const [edition] = await db.select().from(editions).where(eq(editions.id, ch.editionId)).limit(1);
  const sections = await db.select().from(subchapters).where(eq(subchapters.chapterId, ch.id)).orderBy(subchapters.sort);
  const afterId = Number(sp.after) || 0;

  // Suggested number: the one after the sūtra it follows in reading order.
  // "At the start of a section" = after the last sūtra before this section.
  const order = await readingOrder(edition.id);
  let before = afterId ? order.find((o) => o.id === afterId) : undefined;
  if (!afterId) {
    const firstHere = order.findIndex((o) => o.subchapterId === sec.id);
    if (firstHere > 0) before = order[firstHere - 1];
    else if (firstHere === -1) {
      // Empty section: after the last sūtra of any earlier section in this chapter.
      const earlier = sections.filter((x) => x.sort < sec.sort).map((x) => x.id);
      before = [...order].reverse().find((o) => o.chapterId === ch.id && o.subchapterId !== null && earlier.includes(o.subchapterId));
    }
  }
  let suggested = before ? nextNumber(before.number) : "1";
  if (!before && ch.kind === "verses") {
    const [any] = await db.select({ n: sutras.number }).from(sutras).where(eq(sutras.chapterId, ch.id)).limit(1);
    if (any) suggested = any.n.replace(/\d+$/, "1");
  }
  const following = await countFollowing(edition.id, suggested);
  const taken = order.some((o) => o.number === suggested);
  const types = await listCommentaryTypesAdmin(edition.id);
  const word = ch.kind === "verses" ? "verse" : "sūtra";
  const ed = edition.slug;

  return (
    <>
      <Crumbs
        items={[
          { label: "Chapters & sūtras", href: `/admin/hnv/${ed}` },
          { label: EDITION_NAMES[ed] ?? edition.name, href: `/admin/hnv/${ed}` },
          { label: ch.titleEn || ch.title, href: `/admin/hnv/${ed}/chapters/${ch.id}#sec-${sec.id}` },
          { label: `New ${word}` },
        ]}
      />
      <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">New {word}</h1>
      <p className="mb-6 text-[var(--fg-muted)]">
        In “{sec.title}”, {before ? <>right after <strong className="sutra-number">{before.number}</strong></> : "at the start"}.{" "}
        <Link href={`/admin/hnv/${ed}/chapters/${ch.id}#sec-${sec.id}`} className="underline">Cancel</Link>
      </p>

      <ActionForm action={createSutra} className="pb-4">
        <input type="hidden" name="afterId" value={afterId || ""} />
        <Panel title={word === "verse" ? "Verse" : "Sūtra"}>
          <SutraFields
            values={{
              number: suggested,
              subchapterId: sec.id,
              sanskrit: "",
              transliteration: "",
              synonyms: "",
              vrtti: "",
              translation: "",
              status: "published",
            }}
            sections={sections.filter((x) => x.id === sec.id)}
            coreLocked={false}
          />
          <label className="mt-5 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-2)] p-3 text-sm">
            <input type="checkbox" name="shift" defaultChecked className="mt-1" />
            <span>
              <strong>Renumber the following {word}s (+1) if the number is already taken.</strong>
              <span className="block text-[var(--fg-muted)]">
                {taken
                  ? `${suggested} is taken now, so ${following} ${word}s from ${suggested} onward will move up by one.`
                  : `${suggested} is free, so nothing else will change.`}
              </span>
            </span>
          </label>
        </Panel>
        {types.length > 0 && (
          <Panel title="Commentaries">
            <CommentaryFields types={types} entries={[]} canPublish />
          </Panel>
        )}
        <div className="sticky bottom-4 z-20 mt-2">
          <div className="a-card flex items-center gap-4 px-4 py-3 shadow-[var(--a-shadow-lg)]">
            <SubmitButton>Add {word}</SubmitButton>
          </div>
        </div>
      </ActionForm>
    </>
  );
}
