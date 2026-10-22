"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminUsers, loginAttempts } from "@/lib/db/schema";
import { isAuthConfigured, isDbConfigured } from "@/lib/env";
import { createSession, destroySession, requireUser } from "@/lib/auth/session";
import { LOGIN_MAX_FAILURES, LOGIN_WINDOW_MINUTES, MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";
import { fail, ok, type ActionState } from "@/lib/actions/types";

// Compared against when the email doesn't exist, so response time doesn't
// reveal which emails have accounts.
const DUMMY_HASH = "$2b$12$/jOFqnqv6nZ.KABdO6vN0eZH04270VJCaHf7hTJ/keL3YGJ5cYr.W";

const LoginInput = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
  next: z.string().max(300).optional(),
});

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!isDbConfigured || !isAuthConfigured) return fail("The admin isn't configured on this deployment yet.");
  const parsed = LoginInput.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    next: form.get("next") || undefined,
  });
  if (!parsed.success) return fail("Enter your email and password.");
  const { email, password, next } = parsed.data;
  const db = getDb();

  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000);
  const [{ failures }] = await db
    .select({ failures: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.email, email), eq(loginAttempts.success, false), gte(loginAttempts.createdAt, since)));
  if (failures >= LOGIN_MAX_FAILURES) {
    return fail(`Too many failed attempts. Try again in ${LOGIN_WINDOW_MINUTES} minutes.`);
  }

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(sql`lower(${adminUsers.email}) = ${email}`)
    .limit(1);
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  if (!user || !valid || !user.isActive) {
    await db.insert(loginAttempts).values({ email, ip, success: false });
    return fail("That email and password don't match an admin account.");
  }

  await db.batch([
    db.insert(loginAttempts).values({ email, ip, success: true }),
    db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id)),
  ]);
  await createSession(user);
  // Only allow redirects back into the admin.
  redirect(next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

const PasswordInput = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`).max(200),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: "The two new passwords don't match.", path: ["confirm"] });

export async function changePassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireUser("contributor");
  const parsed = PasswordInput.safeParse({
    current: form.get("current"),
    next: form.get("next"),
    confirm: form.get("confirm"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const db = getDb();
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, me.id)).limit(1);
  if (!user || !(await bcrypt.compare(parsed.data.current, user.passwordHash))) {
    return fail("Your current password is not correct.");
  }
  const passwordHash = await bcrypt.hash(parsed.data.next, 12);
  const [updated] = await db
    .update(adminUsers)
    .set({ passwordHash, sessionVersion: user.sessionVersion + 1 })
    .where(eq(adminUsers.id, user.id))
    .returning();
  // Other devices are signed out (session version bumped); keep this one.
  await createSession(updated);
  return ok("Password changed. Other devices have been signed out.");
}
