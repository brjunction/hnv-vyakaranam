"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { getDb } from "@/lib/db";
import { revisions, siteSettings } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { tags } from "@/lib/data/tags";
import { fail, ok, type ActionState } from "@/lib/actions/types";

const In = z.object({
  quotes: z.array(z.object({ text: z.string().trim().max(4000), source: z.string().trim().max(300) })).max(12),
  author: z.string().trim().max(200),
  imageUrl: z
    .string()
    .trim()
    .max(2000)
    .refine((s) => !s || /^(https?:\/\/|\/)/.test(s), "The picture link must start with https://"),
});

export async function savePrabhupadaBlock(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const texts = form.getAll("qtext").map(String);
  const sources = form.getAll("qsource").map(String);
  const p = In.safeParse({
    quotes: texts.map((t, i) => ({ text: t, source: sources[i] ?? "" })).filter((q) => q.text.trim()),
    author: form.get("author") ?? "",
    imageUrl: form.get("imageUrl") ?? "",
  });
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the form.");
  if (!p.data.quotes.length) return fail("Add at least one quote.");
  await getDb()
    .insert(siteSettings)
    .values({ key: "home.prabhupada", value: p.data, updatedBy: user.id })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: p.data, updatedBy: user.id } });
  await getDb().insert(revisions).values({ entityTable: "site_settings", entityId: 0, action: "update", after: p.data, userId: user.id, note: "home.prabhupada" });
  revalidateTag(tags.home);
  revalidatePath("/");
  return ok("Saved — the home page is updated.");
}
