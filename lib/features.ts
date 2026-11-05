import "server-only";
import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { isDbConfigured } from "@/lib/env";

// New features stay hidden until the developer turns them on in
// /admin/developer. Public pages read the switches from the cache.
export const FEATURES = [
  { key: "dict-hnv-terms", name: "Dictionary: HNV terms button", blurb: "Pāṇini's terms in all dictionary entries shown as Śrīla Jīva Gosvāmī's." },
  { key: "tool-declensions", name: "Tools: Declensions (nāma & dhātu)", blurb: "Declension and conjugation tables with the sūtras applied." },
] as const;
export type FeatureKey = (typeof FEATURES)[number]["key"];
export type Features = Record<FeatureKey, boolean>;
export const FEATURES_TAG = "features";
export const FEATURES_KEY = "developer.features";

export const getFeatures = unstable_cache(
  async (): Promise<Features> => {
    const off = Object.fromEntries(FEATURES.map((f) => [f.key, false])) as Features;
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
