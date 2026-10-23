import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { moreItems, moreSections } from "@/lib/db/schema";
import { isDbConfigured } from "@/lib/env";
import { tags } from "@/lib/data/tags";
import type { MoreItem, MoreKind, MoreSection, MoreStage } from "@/lib/more/core";

// Public reads for /more — cached under the `more` tag; every admin write
// calls revalidateMore().

type ItemRow = typeof moreItems.$inferSelect;
type SectionRow = typeof moreSections.$inferSelect;

export const toItem = (r: ItemRow): MoreItem => ({
  id: r.id,
  sectionId: r.sectionId,
  slug: r.slug,
  title: r.title,
  subtitle: r.subtitle,
  bodyHtml: r.bodyHtml,
  url: r.url,
  linkLabel: r.linkLabel,
  imageUrl: r.imageUrl,
  person: r.person,
  badge: r.badge,
  stage: r.stage as MoreStage,
  date: r.date,
  pinned: r.pinned,
  status: r.status,
});

export const toSection = (s: SectionRow, items: MoreItem[]): MoreSection => ({
  id: s.id,
  key: s.key,
  title: s.title,
  intro: s.intro,
  kind: s.kind as MoreKind,
  isVisible: s.isVisible,
  items,
});

/** Posts: pinned, then newest first. Everything else: pinned, then manual order. */
export function sortItems(kind: MoreKind, items: MoreItem[]) {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (kind === "posts") return (b.date ?? "").localeCompare(a.date ?? "");
    return 0;
  });
}

export const getMoreSections = unstable_cache(
  async (): Promise<MoreSection[]> => {
    if (!isDbConfigured) return [];
    const db = getDb();
    const [secs, items] = await Promise.all([
      db.select().from(moreSections).where(eq(moreSections.isVisible, true)).orderBy(asc(moreSections.sort), asc(moreSections.id)),
      db.select().from(moreItems).where(eq(moreItems.status, "published")).orderBy(asc(moreItems.sort), desc(moreItems.id)),
    ]);
    return secs.map((s) =>
      toSection(
        s,
        sortItems(
          s.kind as MoreKind,
          items.filter((i) => i.sectionId === s.id).map(toItem)
        )
      )
    );
  },
  ["more:sections:v1"],
  { tags: [tags.more] }
);

export async function getMoreSection(key: string) {
  return (await getMoreSections()).find((s) => s.key === key) ?? null;
}

export async function getMoreItem(sectionKey: string, slug: string) {
  const s = await getMoreSection(sectionKey);
  const item = s?.items.find((i) => i.slug === slug);
  return s && item ? { section: s, item } : null;
}

// ------------------------------------------------------------- admin ---
export async function listMoreAdmin() {
  const db = getDb();
  const [secs, items] = await Promise.all([
    db.select().from(moreSections).orderBy(asc(moreSections.sort), asc(moreSections.id)),
    db.select().from(moreItems).orderBy(asc(moreItems.sort), desc(moreItems.id)),
  ]);
  return secs.map((s) => toSection(s, items.filter((i) => i.sectionId === s.id).map(toItem)));
}

export async function getMoreSectionAdmin(id: number) {
  const db = getDb();
  const [s] = await db.select().from(moreSections).where(eq(moreSections.id, id)).limit(1);
  if (!s) return null;
  const items = await db.select().from(moreItems).where(eq(moreItems.sectionId, id)).orderBy(asc(moreItems.sort), desc(moreItems.id));
  return toSection(s, items.map(toItem));
}

export async function getMoreItemAdmin(id: number) {
  const db = getDb();
  const [r] = await db.select().from(moreItems).where(eq(moreItems.id, id)).limit(1);
  if (!r) return null;
  const [s] = await db.select().from(moreSections).where(and(eq(moreSections.id, r.sectionId))).limit(1);
  return s ? { item: toItem(r), section: toSection(s, []) } : null;
}
