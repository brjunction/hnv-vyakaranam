"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { and, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { ADMIN_ROLES, adminUsers, revisions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";
import { fail, ok, type ActionState } from "@/lib/actions/types";

const Role = z.enum(ADMIN_ROLES);
const Password = z.string().min(MIN_PASSWORD_LENGTH, `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`).max(200);

/** Never allow the site to end up with no active owner. */
async function otherActiveOwners(excludeId: number) {
  const [{ n }] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(adminUsers)
    .where(and(eq(adminUsers.role, "owner"), eq(adminUsers.isActive, true), ne(adminUsers.id, excludeId)));
  return n;
}

export async function createAdmin(_prev: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireUser("owner");
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Enter a name.").max(120),
      email: z.string().trim().toLowerCase().email("Enter a valid email.").max(200),
      role: Role,
      password: Password,
    })
    .safeParse({ name: form.get("name"), email: form.get("email"), role: form.get("role"), password: form.get("password") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const db = getDb();
  const [exists] = await db.select({ id: adminUsers.id }).from(adminUsers).where(sql`lower(${adminUsers.email}) = ${parsed.data.email}`).limit(1);
  if (exists) return fail("An admin with that email already exists.");
  const [created] = await db
    .insert(adminUsers)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
    })
    .returning({ id: adminUsers.id, email: adminUsers.email, role: adminUsers.role });
  await db.insert(revisions).values({ entityTable: "admin_users", entityId: created.id, action: "create", after: created, userId: me.id });
  return ok(`Added ${parsed.data.email}. Share the password with them privately; they can change it under Account.`);
}

export async function updateAdmin(_prev: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireUser("owner");
  const parsed = z
    .object({ id: z.coerce.number().int().positive(), role: Role, isActive: z.enum(["true", "false"]) })
    .safeParse({ id: form.get("id"), role: form.get("role"), isActive: form.get("isActive") });
  if (!parsed.success) return fail("Invalid request.");
  const { id, role } = parsed.data;
  const isActive = parsed.data.isActive === "true";
  const db = getDb();
  const [before] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!before) return fail("That admin no longer exists.");

  const losingOwner = before.role === "owner" && before.isActive && (role !== "owner" || !isActive);
  if (losingOwner && (await otherActiveOwners(id)) === 0) {
    return fail("There must always be at least one active owner. Make someone else an owner first.");
  }

  const changed = before.role !== role || before.isActive !== isActive;
  if (!changed) return ok("No changes.");
  await db.batch([
    db
      .update(adminUsers)
      // bump the session version so a demoted/disabled admin is signed out at once
      .set({ role, isActive, sessionVersion: before.sessionVersion + 1 })
      .where(eq(adminUsers.id, id)),
    db.insert(revisions).values({
      entityTable: "admin_users",
      entityId: id,
      action: "update",
      before: { role: before.role, isActive: before.isActive },
      after: { role, isActive },
      userId: me.id,
    }),
  ]);
  return ok(id === me.id ? "Saved. Sign in again to continue." : `Saved: ${before.email} is now ${isActive ? role : "turned off"}.`);
}

export async function resetAdminPassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireUser("owner");
  const parsed = z
    .object({ id: z.coerce.number().int().positive(), password: Password })
    .safeParse({ id: form.get("id"), password: form.get("password") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const db = getDb();
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, parsed.data.id)).limit(1);
  if (!user) return fail("That admin no longer exists.");
  await db
    .update(adminUsers)
    .set({ passwordHash: await bcrypt.hash(parsed.data.password, 12), sessionVersion: user.sessionVersion + 1 })
    .where(eq(adminUsers.id, user.id));
  await db.insert(revisions).values({ entityTable: "admin_users", entityId: user.id, action: "update", note: "password reset", userId: me.id });
  return ok(`New password set for ${user.email}. They've been signed out everywhere.`);
}
