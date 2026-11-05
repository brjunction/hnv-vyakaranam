import "server-only";
import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { isDbConfigured } from "@/lib/env";

// New features stay hidden until the developer turns them on in
// /admin/developer. Public pages read the switches from the cache.
import { FEATURES, NO_FEATURES, type Features } from "@/lib/feature-list";
export { FEATURES };
export type { Features };
export const FEATURES_TAG = "features";
export const FEATURES_KEY = "developer.features";

export const getFeatures = unstable_cache(
  async (): Promise<Features> => {
    const off = NO_FEATURES;
    if (!isDbConfigured) return off;
    try {
      const [row] = await getDb().select().from(siteSettings).where(eq(siteSettings.key, FEATURES_KEY)).limit(1);
      return { ...off, ...((row?.value as Partial<Features>) ?? {}) };
    } catch {
      return off;
    }
  },
  ["hnv:features:v1"],
  { tags: [FEATURES_TAG], revalidate: 3600 }
);
