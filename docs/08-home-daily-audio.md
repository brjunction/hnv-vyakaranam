# 08 — Home page, daily content, audio, /more posts

## 1. Home page

- `app/page.tsx` design is **owned by the site owner** (they edit it
  directly and push). Code changes there must preserve their layout; add
  data slots, don't redesign without being asked.
- `app/page.tsx` stays a **Server Component**. Interactive pieces
  (Verse of the Day, Subhāṣita) are small client children.
- Data: `getHomeData()` (`lib/data/home.ts`, tag `home` + `daily`) returns
  visible `home_blocks` in order, the Verse-of-the-Day pool, the Subhāṣita
  pool, and the pins for the next 400 days.
- The two Maṅgalācaraṇa verse blocks are removed (v6 §4.1).
- Block kinds (renderers in `components/home/blocks/*`): `announcement`,
  `feature-card`, `quote`, `link-list`, `rich-text`. A block with an
  unknown `kind` renders nothing (and logs a warning at build time).

## 2. Verse of the Day & Daily Subhāṣita

**Pool** (baked into the static home page):
- Verse of the Day: every published sūtra/verse with `daily_eligible =
  true`, as compact objects `{ id, type, ref, deva, iast, translation, href }`.
- Subhāṣita: every published `daily_items` row with `pool = 'subhashita'`.

**Pick (in the browser, `components/home/DailyPick.tsx`):**

```ts
function pickForToday<T extends { id: number; type: string }>(
  pool: T[], pins: Record<string, { type: string; id: number }>, today: string /* YYYY-MM-DD */
): T | null {
  if (pool.length === 0) return null;
  const pin = pins[today];
  if (pin) {
    const hit = pool.find((p) => p.id === pin.id && p.type === pin.type);
    if (hit) return hit;                      // pinned item wins
  }
  const sorted = [...pool].sort((a, b) => a.type.localeCompare(b.type) || a.id - b.id);
  const [y, m, d] = today.split("-").map(Number);
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  return sorted[dayNumber % sorted.length];
}
```

- `today` = the **visitor's local date** (`Intl.DateTimeFormat("en-CA")`
  → `YYYY-MM-DD`). Changes at the visitor's midnight, no rebuild needed.
- To avoid a hydration mismatch, the server renders a fixed-height
  skeleton; the pick renders after mount (`useEffect`). Reserve height so
  there is no layout shift.
- Adding/removing items from a pool changes which item later dates get;
  that's acceptable (documented, not a bug).
- Admin "Pins" calendar writes `daily_pins` (unique per pool per date).

## 3. Audio

- `audio_links` rows attached to a sūtra, verse, HNV chapter, or scripture
  chapter. Each: title, speaker (free text: "Śrīla Prabhupāda", "Śrīla Gour
  Govinda Swami", …), URL, order.
- Rendering: a list under the content. If the URL ends in
  `.mp3/.m4a/.ogg/.wav` → native `<audio controls preload="none">`;
  otherwise an external-link button ("Listen ↗", `rel="noopener"`).
  Never download or proxy the file.
- Admin validates the URL is `https://`.

## 4. `/more` posts

- `posts` table replaces the Miscellaneous Google Doc (Phase 6, with a
  one-time import using the same marker parser as `lib/miscDoc.ts`).
- `/more` lists sections → cards; `/more/[slug]` is a post page (new;
  static, in the sitemap).
- Images are URLs (no uploads), rendered with `next/image` when the host is
  in `images.remotePatterns`, otherwise a plain `<img loading="lazy">`.
