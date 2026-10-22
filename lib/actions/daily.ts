"use server";

import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailyItems, dailyPins, revisions, sutras } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { revalidateDaily } from "@/lib/actions/revalidate";
import { fail, ok, type ActionState } from "@/lib/actions/types";
import { importHnvFromSpreadsheets } from "@/lib/import/hnvSpreadsheets";
import { revalidateEverything, revalidateHnv } from "@/lib/actions/revalidate";

const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");

// --------------------------------------------------------------- pool ----
export async function setChapterDaily(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const parsed = z
    .object({ chapterId: z.coerce.number().int().positive(), eligible: z.enum(["true", "false"]) })
    .safeParse({ chapterId: form.get("chapterId"), eligible: form.get("eligible") });
  if (!parsed.success) return fail("Invalid request.");
  const eligible = parsed.data.eligible === "true";
  const db = getDb();
  const changed = await db
    .update(sutras)
    .set({ dailyEligible: eligible, updatedBy: user.id })
    .where(and(eq(sutras.chapterId, parsed.data.chapterId), sql`${sutras.dailyEligible} <> ${eligible}`))
    .returning({ id: sutras.id });
  await db.insert(revisions).values({
    entityTable: "chapters",
    entityId: parsed.data.chapterId,
    action: "update",
    after: { dailyEligible: eligible, rows: changed.length },
    userId: user.id,
    note: `Verse of the Day: ${eligible ? "included" : "excluded"} ${changed.length} sūtras`,
  });
  revalidateDaily();
  return ok(`${changed.length} sūtras ${eligible ? "added to" : "removed from"} the Verse of the Day pool.`);
}

export async function setSutraDaily(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const parsed = z
    .object({ number: z.string().trim().min(1).max(20), eligible: z.enum(["true", "false"]) })
    .safeParse({ number: form.get("number"), eligible: form.get("eligible") });
  if (!parsed.success) return fail("Enter a sūtra number.");
  const eligible = parsed.data.eligible === "true";
  const db = getDb();
  const rows = await db
    .update(sutras)
    .set({ dailyEligible: eligible, updatedBy: user.id })
    .where(eq(sutras.number, parsed.data.number))
    .returning({ id: sutras.id });
  if (rows.length === 0) return fail(`No sūtra numbered ${parsed.data.number}.`);
  revalidateDaily();
  return ok(`Sūtra ${parsed.data.number} ${eligible ? "is in" : "is out of"} the pool.`);
}

// --------------------------------------------------------------- pins ----
export async function addPin(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const parsed = z
    .object({
      pool: z.enum(["verse_of_day", "subhashita"]),
      date: DateStr,
      ref: z.string().trim().min(1, "Enter a sūtra number or Subhāṣita id.").max(20),
    })
    .safeParse({ pool: form.get("pool"), date: form.get("date"), ref: form.get("ref") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const { pool, date, ref } = parsed.data;
  const db = getDb();

  let entityType: "sutra" | "daily_item";
  let entityId: number;
  if (pool === "verse_of_day") {
    const [s] = await db.select({ id: sutras.id }).from(sutras).where(eq(sutras.number, ref)).limit(1);
    if (!s) return fail(`No sūtra numbered ${ref}.`);
    entityType = "sutra";
    entityId = s.id;
  } else {
    const id = Number(ref);
    if (!Number.isInteger(id)) return fail("Use the Subhāṣita's number from the list.");
    const [d] = await db.select({ id: dailyItems.id }).from(dailyItems).where(eq(dailyItems.id, id)).limit(1);
    if (!d) return fail(`No Subhāṣita #${ref}.`);
    entityType = "daily_item";
    entityId = d.id;
  }

  await db
    .insert(dailyPins)
    .values({ pool, date, entityType, entityId, updatedBy: user.id })
    .onConflictDoUpdate({
      target: [dailyPins.pool, dailyPins.date],
      set: { entityType, entityId, updatedBy: user.id },
    });
  revalidateDaily();
  return ok(`Pinned for ${date}.`);
}

export async function removePin(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return fail("Invalid pin.");
  await getDb().delete(dailyPins).where(eq(dailyPins.id, id));
  revalidateDaily();
  return ok("Pin removed.");
}

// --------------------------------------------------------- subhāṣita ----
const SubhashitaInput = z.object({
  id: z.coerce.number().int().positive().optional(),
  sanskrit: z.string().trim().min(1, "The Sanskrit text is required.").max(4000),
  iast: z.string().trim().max(4000),
  translation: z.string().trim().max(8000),
  source: z.string().trim().max(300),
  status: z.enum(["draft", "published", "archived"]),
});

export async function saveSubhashita(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("contributor");
  const parsed = SubhashitaInput.safeParse({
    id: form.get("id") || undefined,
    sanskrit: form.get("sanskrit"),
    iast: form.get("iast") ?? "",
    translation: form.get("translation") ?? "",
    source: form.get("source") ?? "",
    status: form.get("status") ?? "draft",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const { id, ...fields } = parsed.data;
  if (user.role === "contributor" && fields.status === "published") return fail("Contributors can save drafts only.");
  const db = getDb();

  if (id) {
    const [before] = await db.select().from(dailyItems).where(eq(dailyItems.id, id)).limit(1);
    if (!before) return fail("That Subhāṣita no longer exists.");
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
    revalidateDaily();
    return ok("Saved.");
  }

  const [created] = await db
    .insert(dailyItems)
    .values({ pool: "subhashita", ...fields, updatedBy: user.id })
    .returning();
  await db.insert(revisions).values({
    entityTable: "daily_items",
    entityId: created.id,
    action: "create",
    after: created,
    userId: user.id,
  });
  revalidateDaily();
  return ok(`Added Subhāṣita #${created.id}.`);
}

export async function deleteSubhashita(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return fail("Invalid item.");
  const db = getDb();
  const [before] = await db.select().from(dailyItems).where(eq(dailyItems.id, id)).limit(1);
  if (!before) return fail("Already deleted.");
  await db.batch([
    db.delete(dailyPins).where(and(eq(dailyPins.entityType, "daily_item"), eq(dailyPins.entityId, id))),
    db.delete(dailyItems).where(eq(dailyItems.id, id)),
    db.insert(revisions).values({ entityTable: "daily_items", entityId: id, action: "delete", before, userId: user.id }),
  ]);
  revalidateDaily();
  return ok(`Deleted Subhāṣita #${id}. It can be restored from history.`);
}

// -------------------------------------------------------------- tools ----
export async function runHnvImport(_prev: ActionState): Promise<ActionState> {
  const user = await requireUser("owner");
  try {
    const r = await importHnvFromSpreadsheets(user.id);
    revalidateHnv();
    return ok(`Imported ${r.sutras} rows in ${r.subchapters} subchapters across ${r.chapters} chapters.`);
  } catch (err) {
    console.error("[runHnvImport]", err);
    return fail("The import stopped with an error. Nothing was deleted; check the Vercel logs and run it again.");
  }
}

export async function revalidateSite(_prev: ActionState): Promise<ActionState> {
  await requireUser("owner");
  revalidateEverything();
  return ok("Every cached page will refresh on its next visit.");
}
