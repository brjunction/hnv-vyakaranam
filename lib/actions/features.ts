"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { FEATURES, FEATURES_KEY, FEATURES_TAG, getFeatures } from "@/lib/features";

const Key = z.enum(FEATURES.map((f) => f.key) as [string, ...string[]]);

export async function setFeature(key: string, on: boolean) {
  const me = await requireUser("developer");
  const k = Key.parse(key);
  const now = { ...(await getFeatures()), [k]: z.boolean().parse(on) };
  await getDb()
    .insert(siteSettings)
    .values({ key: FEATURES_KEY, value: now, updatedBy: me.id })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: now, updatedBy: me.id } });
  revalidateTag(FEATURES_TAG);
  revalidatePath("/", "layout");
  return now;
}
