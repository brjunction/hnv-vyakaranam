# 09 — SEO, metadata, sitemaps

## 1. Site URL

One value: `SITE_URL` env var, falling back to `site.config.json`
(`https://harinamamrta-vyakaranam.com`). Used by `metadataBase`, canonical
URLs, sitemaps, robots. Never hard-code a domain anywhere else.

## 2. Per-page metadata

Every public page exports `generateMetadata` (or `metadata`) with a
unique title, description, and canonical:

| Page | Title | Description source | Canonical |
|---|---|---|---|
| Home | "Harināmāmṛta-Vyākaraṇam — Śrīla Jīva Gosvāmī's Sanskrit grammar" | static | `/` |
| ToC | "Table of Contents — Madhyama" | static | `/chapters` |
| Chapter | "<Title> — <English title>" | summary + range | `/chapters/<slug>` |
| Sūtra | "Sūtra <n>: <transliteration, first ~50 chars> — <Chapter>" | translation → vṛtti → transliteration, ≤ 155 chars | `/chapters/<slug>/<n>` |
| Book | "<Book> — Sanskrit with Anvaya" | description | `/scriptures/<code>` |
| Canto/chapter | "<Book> <canto>.<chapter> — <chapter title>" | static template | its own URL |
| Verse | "<Book> <verse_no> — <IAST first line>" | translation → anvaya → IAST, ≤ 155 chars | its own URL |
| Practice | "Practice — Sandhi" | static | `/practice` |

- Description text is stripped of `/` markers and HTML, whitespace
  collapsed, cut at a word boundary.
- Open Graph + Twitter card on every page; default OG image
  `/og-default.png` (1200×630, ≤ 150 kB); per-chapter OG images later.
- `alternates.canonical` always absolute via `metadataBase`.
- `/admin/**`, `/api/**`, `/scriptures/read` (dual view, query-string
  driven): `robots: { index: false }`.

## 3. Structured data (JSON-LD)

Rendered with a small `<JsonLd data={…} />` server component.

| Page | Types |
|---|---|
| Home | `WebSite` (with `SearchAction` once search exists), `Organization` |
| Every reading page | `BreadcrumbList` |
| Chapter / sūtra | `Book` (HNV, author Śrīla Jīva Gosvāmī) → `Chapter` (`isPartOf`) |
| Scripture verse | `CreativeWork` with `isPartOf` the `Book` |

## 4. Sitemaps — static files, generated at build

Generator: `scripts/build-sitemaps.ts`, run by `prebuild` **after**
`scripts/assert-db.ts`. Reads published rows from Neon and writes:

```
public/sitemap.xml                    ← sitemap index
public/sitemaps/pages.xml             ← home, ToC, books, cantos, practice, about, more, wiki, posts
public/sitemaps/hnv-madhyama.xml      ← chapters + every sūtra (~1,300)
public/sitemaps/bg.xml                ← chapters + every verse (~720)
public/sitemaps/sb-01.xml … sb-12.xml ← per canto: chapters + every verse
public/sitemaps/manifest.json         ← counts per file + build time (shown in admin)
public/robots.txt
```

- Each file well under Google's limit (50,000 URLs / 50 MB uncompressed).
- `lastmod` = the row's `updated_at` (date only) — truthful and stable.
  No `changefreq`/`priority` (Google ignores them).
- Generated files are **not committed** (`.gitignore` them) — they are
  always produced from the database at build.
- **Why it can't go down:** they are plain files on the CDN. If the
  database is unreachable during a build, `assert-db.ts` fails the build
  and Vercel keeps serving the previous deployment, including its
  sitemaps. A build can never publish an empty sitemap: the generator also
  fails if the URL count drops by more than 20 % versus the previous
  manifest (fetched from the live site), unless `SITEMAP_ALLOW_SHRINK=1`.
- Freshness: daily rebuild (`01-architecture.md` §3.4) picks up new
  sūtras/verses.

`robots.txt`:

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: <SITE_URL>/sitemap.xml
```

## 5. Search Console

- Keep the `google-site-verification` meta tag in `app/layout.tsx`.
- The HTML verification file must be in **`public/`** to be served (see
  `15-current-state.md` — it's currently at the repo root).
- After the `/scriptures` launch: submit `sitemap.xml` again; the 308s
  carry ranking signals from `/anvyaya/...` URLs.

## 6. Performance is SEO

Core Web Vitals budgets in `01-architecture.md` §7. Lighthouse CI runs on
`/`, one chapter, one sūtra page, one verse page in every PR (`13` §8).
