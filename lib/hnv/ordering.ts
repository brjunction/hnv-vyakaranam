import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sutras } from "@/lib/db/schema";
import { prefixRegex } from "@/lib/hnv/numbering";

// Ordering and renumbering helpers for the HNV admin.
//
// Reading order inside a chapter = section order (subchapters.sort), then
// sutras.position. After any structural change we "resequence": rewrite
// positions/sorts as 10, 20, 30 … in that order, so there is always room to
// insert between two neighbours.
//
// Renumbering shifts every number with the same prefix ("" for ordinary
// sūtras, "0.1." for Maṅgalācaraṇa verses) by ±1. Because sūtra numbers are
// unique per edition, it runs in two steps inside one batch (transaction):
// first mark the affected rows with a temporary "~s~" prefix, then write the
// final numbers. Existing gaps in the numbering are preserved.

const TAIL = (col: typeof sutras.number) => sql`(regexp_match(${col}, '([0-9]+)$'))[1]::int`;

/** Queries that move every number ≥ `from` (same prefix) up by one. For db.batch. */
export function shiftUp(editionId: number, prefix: string, from: number) {
  const db = getDb();
  return [
    db
      .update(sutras)
      .set({ number: sql`'~s~' || ${sutras.number}` })
      .where(
        and(eq(sutras.editionId, editionId), sql`${sutras.number} ~ ${prefixRegex(prefix)}`, sql`${TAIL(sutras.number)} >= ${from}`)
      ),
    db
      .update(sutras)
      .set({ number: sql`${prefix} || (${TAIL(sutras.number)} + 1)::text` })
      .where(and(eq(sutras.editionId, editionId), sql`${sutras.number} like '~s~%'`)),
  ];
}

/** Queries that move every number > `after` (same prefix) down by one. For db.batch. */
export function shiftDown(editionId: number, prefix: string, after: number) {
  const db = getDb();
  return [
    db
      .update(sutras)
      .set({ number: sql`'~s~' || ${sutras.number}` })
      .where(
        and(eq(sutras.editionId, editionId), sql`${sutras.number} ~ ${prefixRegex(prefix)}`, sql`${TAIL(sutras.number)} > ${after}`)
      ),
    db
      .update(sutras)
      .set({ number: sql`${prefix} || (${TAIL(sutras.number)} - 1)::text` })
      .where(and(eq(sutras.editionId, editionId), sql`${sutras.number} like '~s~%'`)),
  ];
}

export async function resequenceChapter(chapterId: number) {
  await getDb().execute(sql`
    update sutras s set position = o.rn * 10
    from (
      select s2.id, row_number() over (
        order by coalesce(sc.sort, 2147483647), s2.position, s2.id
      ) as rn
      from sutras s2 left join subchapters sc on sc.id = s2.subchapter_id
      where s2.chapter_id = ${chapterId}
    ) o
    where s.id = o.id and s.position <> o.rn * 10`);
}

export async function resequenceSections(chapterId: number) {
  await getDb().execute(sql`
    update subchapters t set sort = o.rn * 10
    from (select id, row_number() over (order by sort, id) as rn from subchapters where chapter_id = ${chapterId}) o
    where t.id = o.id and t.sort <> o.rn * 10`);
}

export async function resequenceChapters(editionId: number) {
  await getDb().execute(sql`
    update chapters t set sort = o.rn * 10
    from (select id, row_number() over (order by sort, id) as rn from chapters where edition_id = ${editionId}) o
    where t.id = o.id and t.sort <> o.rn * 10`);
}

export async function resequenceCommentaryTypes(editionId: number) {
  await getDb().execute(sql`
    update commentary_types t set sort = o.rn * 10
    from (select id, row_number() over (order by sort, id) as rn from commentary_types where edition_id = ${editionId}) o
    where t.id = o.id and t.sort <> o.rn * 10`);
}
