import "server-only";
import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { isDbConfigured } from "@/lib/env";
import { tags } from "@/lib/data/tags";

export type PrabhupadaBlock = { author: string; imageUrl: string; quotes: { text: string; source: string }[] };

/** The Śrīla Prabhupāda quote on the home page (edited in Admin → Home page). */
export const getPrabhupadaBlock = unstable_cache(
  async (): Promise<PrabhupadaBlock | null> => {
    if (!isDbConfigured) return null;
    const [row] = await getDb().select().from(siteSettings).where(eq(siteSettings.key, "home.prabhupada")).limit(1);
    const v = row?.value as PrabhupadaBlock | undefined;
    return v?.quotes?.some((q) => q.text?.trim()) ? { ...v, quotes: v.quotes.filter((q) => q.text?.trim()) } : null;
  },
  ["home:prabhupada:v1"],
  { tags: [tags.home] }
);
