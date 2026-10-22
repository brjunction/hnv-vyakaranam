# 08 — Home page, daily content, audio, /more posts

## 1. Home page

- The owner's design is kept (`16-design-system.md`); new elements are
  added inside it. The owner may edit `app/page.tsx` directly and push;
  always `git pull` first and keep their changes.
- `app/page.tsx` stays a **Server Component**. Interactive pieces
  (VarnaBoard, DailyPanel) are small client children.
- Sections, in order: see `16-design-system.md` §3.
- Admin-managed `home_blocks` are **not built yet** (Phase 6.1); the table
  exists. When built, blocks fill named slots between those sections.
- The two Maṅgalācaraṇa verse blocks are removed (v6 §4.1). The Ṣaḍ-Gosvāmī
  painting + Amṛta's two prayers stay (owner's decision).
- The **Varṇa-krama board** (`components/home/VarnaBoard.tsx`) is its own
  section inside the owner's layout (not the hero): HNV's alphabet with each
  group's name of Hari and sūtra number (sūtras 1–25, from the HNV-Wiki).
- Block kinds (renderers in `components/home/blocks/*`): `announcement`,
  `feature-card`, `quote`, `link-list`, `rich-text`. A block with an
  unknown `kind` renders nothing (and logs a warning at build time).

## 2. Verse of the Day & Daily Subhāṣita (built 2026-10-22)

**Pools (Neon, `daily_items`):**
- `pool = 'verse_of_day'` — scripture verses (Gītā, Bhāgavatam …) entered
  in `/admin/verses`. **Not sūtras** (owner's correction, 2026-10-22;
  `sutras.daily_eligible` is unused).
- `pool = 'subhashita'` — Subhāṣitas (Cāṇakya-nīti, Hitopadeśa …) entered in
  `/admin/subhashita`.
- Each entry: Sanskrit, IAST, translation, reference/source, status. Only
  `published` entries appear. Empty pool → that card is hidden.
- Schedule: `daily_pins (pool, date)` → an entry for that date, set from
  the entry form ("also show on…") or `/admin/schedule`.

**How "today" is chosen** (`lib/daily/pick.ts`, pure and unit-testable):

```ts
idx = ((dayNumber(date) % n) * strideFor(n)) % n   // n = pool size
```

`dayNumber` = days since 1970-01-01 for the calendar date; `strideFor(n)`
is a prime (7919, 7907 …) coprime with `n`, so consecutive days jump
around the pool and every item appears once per `n` days. A pin for the
date wins if its item is still in the pool. Adding/removing items shifts
later picks — expected.

**Delivery** (changed from "bake the whole pool into the page", which would
have sent ~1,290 entries to every visitor):
1. `components/home/DailyPanel.tsx` (client) computes the visitor's local
   date (`localDate()`), fetches `/api/daily/<YYYY-MM-DD>`.
2. `app/api/daily/[date]/route.ts` is a static, on-demand route: built on
   first request per date, cached (ISR, `revalidate = 86400`), purged by
   `revalidateTag("daily")` whenever the admin changes pools or pins.
3. Database errors throw → 500, never cached; the panel hides itself on
   any non-OK response. Not configured (no `DATABASE_URL`) → empty payload.
4. Server renders a fixed-height skeleton; the cards render after the
   fetch (no hydration mismatch). If both pools are empty the whole section
   disappears.

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
