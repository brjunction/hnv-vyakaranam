"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailyItems, dailyPins, revisions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { revalidateDaily, revalidateEverything, revalidateHnv } from "@/lib/actions/revalidate";
import { fail, ok, type ActionState } from "@/lib/actions/types";
import { importNotesFromGoogleDoc } from "@/lib/import/notesDoc";

const Pool = z.enum(["verse_of_day", "subhashita"]);
const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");
const POOL_NAME = { verse_of_day: "verse", subhashita: "Subhāṣita" } as const;

// ------------------------------------------------- daily entries (both) --
const ItemInput = z.object({
  id: z.coerce.number().int().positive().optional(),
  pool: Pool,
  sanskrit: z.string().trim().min(1, "The Sanskrit text is required.").max(4000),
  iast: z.string().trim().max(4000),
  translation: z.string().trim().max(8000),
  source: z.string().trim().max(300),
  status: z.enum(["draft", "published", "archived"]),
  /** Optional: also schedule this entry on a date. */
  scheduleOn: z.union([DateStr, z.literal("")]).optional(),
});

export async function saveDailyItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("contributor");
  const parsed = ItemInput.safeParse({
    id: form.get("id") || undefined,
    pool: form.get("pool"),
    sanskrit: form.get("sanskrit"),
    iast: form.get("iast") ?? "",
    translation: form.get("translation") ?? "",
    source: form.get("source") ?? "",
    status: form.get("status") ?? "draft",
    scheduleOn: form.get("scheduleOn") ?? "",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const { id, scheduleOn, ...fields } = parsed.data;
  if (user.role === "contributor" && fields.status === "published") return fail("Contributors can save drafts only.");
  if (scheduleOn && user.role === "contributor") return fail("Contributors can't schedule entries.");
  const db = getDb();
  let itemId: number;

  if (id) {
    const [before] = await db.select().from(dailyItems).where(eq(dailyItems.id, id)).limit(1);
    if (!before) return fail("That entry no longer exists.");
    await db.batch([
      db.update(dailyItems).set({ ...fields, updatedBy: user.id }).where(eq(dailyItems.id, id)),
      db.insert(revisions).values({
        entityTable: "daily_items",
        entityId: id,
        action: "update",
        before,
        after: { ...before, ...fields },
        userId: user.id,
      }),
    ]);
    itemId = id;
  } else {
    const [created] = await db.insert(dailyItems).values({ ...fields, updatedBy: user.id }).returning();
    await db.insert(revisions).values({ entityTable: "daily_items", entityId: created.id, action: "create", after: created, userId: user.id });
    itemId = created.id;
  }

  if (scheduleOn) {
    await db
      .insert(dailyPins)
      .values({ pool: fields.pool, date: scheduleOn, entityType: "daily_item", entityId: itemId, updatedBy: user.id })
      .onConflictDoUpdate({ target: [dailyPins.pool, dailyPins.date], set: { entityId: itemId, updatedBy: user.id } });
  }
  revalidateDaily();
  const what = POOL_NAME[fields.pool];
  return ok(
    `${id ? "Saved" : `Added ${what} #${itemId}`}${scheduleOn ? ` and scheduled for ${scheduleOn}` : ""}.` +
      (fields.status !== "published" ? " It's not published yet, so it won't appear on the site." : "")
  );
}

export async function deleteDailyItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return fail("Invalid entry.");
  const db = getDb();
  const [before] = await db.select().from(dailyItems).where(eq(dailyItems.id, id)).limit(1);
  if (!before) return fail("Already deleted.");
  await db.batch([
    db.delete(dailyPins).where(and(eq(dailyPins.entityType, "daily_item"), eq(dailyPins.entityId, id))),
    db.delete(dailyItems).where(eq(dailyItems.id, id)),
    db.insert(revisions).values({ entityTable: "daily_items", entityId: id, action: "delete", before, userId: user.id }),
  ]);
  revalidateDaily();
  return ok(`Deleted #${id}. A copy is kept in the revision history.`);
}

// ----------------------------------------------------------- schedule --
export async function addPin(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const parsed = z
    .object({ pool: Pool, date: DateStr, itemId: z.coerce.number().int().positive("Choose an entry.") })
    .safeParse({ pool: form.get("pool"), date: form.get("date"), itemId: form.get("itemId") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const { pool, date, itemId } = parsed.data;
  const db = getDb();
  const [item] = await db.select({ id: dailyItems.id, pool: dailyItems.pool }).from(dailyItems).where(eq(dailyItems.id, itemId)).limit(1);
  if (!item || item.pool !== pool) return fail(`No ${POOL_NAME[pool]} #${itemId}.`);
  await db
    .insert(dailyPins)
    .values({ pool, date, entityType: "daily_item", entityId: itemId, updatedBy: user.id })
    .onConflictDoUpdate({ target: [dailyPins.pool, dailyPins.date], set: { entityId: itemId, updatedBy: user.id } });
  revalidateDaily();
  return ok(`Scheduled #${itemId} for ${date}.`);
}

export async function removePin(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return fail("Invalid schedule entry.");
  await getDb().delete(dailyPins).where(eq(dailyPins.id, id));
  revalidateDaily();
  return ok("Removed from the schedule. That date goes back to automatic rotation.");
}

// -------------------------------------------------------------- tools --
/** One-time: copy the old sūtra-notes Google Doc into the "Notes" commentary. */
export async function runNotesImport(_prev: ActionState): Promise<ActionState> {
  const user = await requireUser("owner");
  try {
    const r = await importNotesFromGoogleDoc(user.id);
    revalidateHnv();
    if (r.found === 0) return fail("No notes were found — is the Google Doc still shared “Anyone with the link”?");
    return ok(
      `Found ${r.found} notes; imported ${r.imported}.` +
        (r.skipped.length ? ` Skipped (no such sūtra, empty, or already in the database): ${r.skipped.join(", ")}.` : "")
    );
  } catch (err) {
    console.error("[runNotesImport]", err);
    return fail("The import stopped with an error. Nothing was deleted; check the Vercel logs and try again.");
  }
}

export async function revalidateSite(_prev: ActionState): Promise<ActionState> {
  await requireUser("owner");
  revalidateEverything();
  return ok("Every cached page will refresh on its next visit.");
}
