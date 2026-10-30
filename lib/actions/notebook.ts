"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userNotebooks } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

// The notebook of a signed-in user, saved online (one JSON document per user).
// Readers who are not signed in keep theirs on the device (localStorage).

const Page = z.object({ id: z.string().max(40), title: z.string().max(300), html: z.string().max(2_000_000), ink: z.string().max(3_000_000).default(""), updated: z.number() });
const Section = z.object({ id: z.string().max(40), name: z.string().max(120), color: z.string().max(20), pages: z.array(Page).max(500) });
const Book = z.object({ v: z.literal(2), sections: z.array(Section).max(100), updated: z.number() });
export type NotebookData = z.infer<typeof Book>;

export async function whoAmI(): Promise<{ name: string } | null> {
  const u = await getCurrentUser();
  return u ? { name: u.name } : null;
}

export async function loadMyNotebook(): Promise<{ ok: boolean; data: NotebookData | null }> {
  const u = await getCurrentUser();
  if (!u) return { ok: false, data: null };
  const [row] = await getDb().select().from(userNotebooks).where(eq(userNotebooks.userId, u.id)).limit(1);
  const p = Book.safeParse(row?.data);
  return { ok: true, data: p.success ? p.data : null };
}

export async function saveMyNotebook(data: NotebookData): Promise<{ ok: boolean; message: string }> {
  const u = await getCurrentUser();
  if (!u) return { ok: false, message: "Sign in to save online." };
  const p = Book.safeParse(data);
  if (!p.success) return { ok: false, message: "The notebook could not be saved (too large or invalid)." };
  if (JSON.stringify(p.data).length > 3_800_000) return { ok: false, message: "The notebook is too large to save online (drawings take space)." };
  await getDb()
    .insert(userNotebooks)
    .values({ userId: u.id, data: p.data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: userNotebooks.userId, set: { data: p.data, updatedAt: new Date() } });
  return { ok: true, message: "Saved online" };
}
