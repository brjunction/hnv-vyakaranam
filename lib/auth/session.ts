import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminUsers, type AdminRole } from "@/lib/db/schema";
import { env, isAuthConfigured, isDbConfigured } from "@/lib/env";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/constants";

export type SessionUser = { id: number; email: string; name: string; role: AdminRole };

const RANK: Record<AdminRole, number> = { viewer: 0, contributor: 1, editor: 2, owner: 3 };

function key() {
  if (!env.AUTH_SECRET) throw new Error("AUTH_SECRET is not configured.");
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export async function createSession(user: { id: number; role: AdminRole; sessionVersion: number }) {
  const token = await new SignJWT({ role: user.role, sv: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** The signed-in admin, or null. Re-checks the database on every request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!isAuthConfigured || !isDbConfigured) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;
    const [user] = await getDb().select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    if (!user || !user.isActive || user.sessionVersion !== payload.sv) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  } catch {
    return null;
  }
});

/**
 * Call at the top of every admin page and every server action. Redirects to
 * the login page when signed out; to the dashboard when the role is too low.
 */
export async function requireUser(minRole: AdminRole = "viewer"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (RANK[user.role] < RANK[minRole]) redirect("/admin?denied=1");
  return user;
}

export function hasRole(user: SessionUser, minRole: AdminRole) {
  return RANK[user.role] >= RANK[minRole];
}
