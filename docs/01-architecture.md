# 01 — Architecture

## 1. System overview

```
             ┌──────────────── Vercel ────────────────────────────────┐
 Visitor ──► │  CDN edge cache ──► static / ISR pages (HTML + RSC)    │
             │        ▲                    │ (only on cache miss or   │
             │        │ revalidateTag      ▼  after revalidation)     │
 Editor ───► │  /admin (dynamic) ──► Server Actions ──► lib/data/*  ──┼──► Neon Postgres
             │                                    (Drizzle, neon-http)│     (Singapore)
             │  Cron (daily) ──► Deploy Hook ──► full rebuild         │     main / dev branches
             └────────────────────────────────────────────────────────┘
```

| Layer | Technology | Version policy |
|---|---|---|
| Framework | Next.js App Router | Pin to `15.5.x` until Phase 0 is done. Upgrade to 16 is its own task (§8). |
| UI | React 19, Tailwind CSS v4, lucide-react | As in `package.json`. |
| Language | TypeScript, `strict: true` | — |
| Database | Neon Postgres 17 | Project `hnv-vyakaranam` (`crimson-rice-97594890`), region `aws-ap-southeast-1`. |
| DB driver | `@neondatabase/serverless` (HTTP) | `^1.2` |
| ORM / migrations | `drizzle-orm` + `drizzle-kit` (`dialect: "postgresql"`) | `drizzle-orm ^0.45`, `drizzle-kit ^0.31` |
| Validation | `zod` v4 | Every server-side input. |
| Auth (admin) | Own session: `bcryptjs` password hashes + `jose` signed JWT cookie | See `04-admin.md` §2. |
| Rich text | Tiptap editor in admin; `sanitize-html` on write | See `04-admin.md` §6. |
| Transliteration | `@indic-transliteration/sanscript` | Client-side, lazy-loaded. |
| Hosting | Vercel (Hobby), project `hnv` | Functions region should be `sin1` (Singapore) to sit next to Neon (`14-operations.md` §2). |

## 2. Repository layout (target)

```
app/
  (public)/…            public routes (see module docs)
  admin/                admin dashboard (dynamic, auth-protected)
  api/
    cron/rebuild/       daily rebuild trigger (Vercel Cron)
    revalidate/         owner-only manual revalidation endpoint
  layout.tsx, globals.css
components/
  ui/                   generic presentational pieces (Button, Card, Pill…)
  hnv/  scriptures/  practice/  home/  admin/
lib/
  db/
    index.ts            the Drizzle client (server-only)
    schema.ts           all tables (single source of truth for the DB shape)
  data/                 read functions used by pages, wrapped in tagged caches
    hnv.ts  scriptures.ts  home.ts  practice.ts  tags.ts
  actions/              server actions used by /admin (writes + revalidation)
  auth/                 session, password, role checks
  script/               transliteration helpers (client-safe)
  text.ts               splitLines etc. (client-safe)
  env.ts                zod-validated environment variables
drizzle/                generated SQL migrations + meta (committed)
scripts/                import, export, sitemap, backup, verification scripts
docs/                   this documentation
```

Rules for this layout:
- `lib/db/*`, `lib/data/*`, `lib/actions/*`, `lib/auth/*` begin with
  `import "server-only";`.
- Client components may import from `lib/script/*`, `lib/text.ts`,
  `components/ui/*`, and **types** (`import type`) from anywhere.
- Pages never call Drizzle directly; they call `lib/data/*`. This keeps
  caching and tags in one place.

## 3. Rendering and caching model

This is the most important section. It is how v6's "fast as a static page"
requirement survives the move to a database.

### 3.1 Three kinds of route

| Kind | Examples | Rendering |
|---|---|---|
| Pre-built at build time | `/`, `/chapters`, `/chapters/[slug]`, `/chapters/[slug]/[sutra]` (~1.3k), `/scriptures`, `/scriptures/bg/**` (~720), all SB canto & chapter index pages | `generateStaticParams` returns every path; `export const revalidate = false`. |
| Built on first request, then cached | `/scriptures/sb/[canto]/[chapter]/[verse]` (~18k verses) | `generateStaticParams` returns `[]`, `dynamicParams = true`, `revalidate = false`. First visit renders and caches; later visits are static. |
| Always dynamic | `/admin/**`, `/api/**` | `export const dynamic = "force-dynamic"`; never cached. |

Reason for the middle row: pre-building ~18k verse pages on every deploy
would make builds slow and fragile for little gain. On-demand ISR gives the
same speed after the first hit. The nightly rebuild (§3.4) does **not**
pre-render these; the first visitor (or Googlebot) does.

### 3.2 Data caching with tags

Drizzle queries are not `fetch()` calls, so Next.js does not cache them by
itself. Every read in `lib/data/*` is wrapped:

```ts
// lib/data/hnv.ts
import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { tags } from "@/lib/data/tags";

export const getChapterWithSutras = (edition: string, slug: string) =>
  unstable_cache(
    async () => { /* Drizzle queries … */ },
    ["hnv:chapter", edition, slug],                 // cache key parts
    { tags: [tags.hnvChapter(edition, slug), tags.hnvAll], revalidate: false }
  )();
```

`lib/data/tags.ts` is the **only** place tag strings are built:

```ts
export const tags = {
  hnvAll: "hnv",
  hnvChapter: (ed: string, slug: string) => `hnv:${ed}:ch:${slug}`,
  hnvSutra: (ed: string, num: string) => `hnv:${ed}:su:${num}`,
  scriptureBook: (code: string) => `scr:${code}`,
  scriptureChapter: (code: string, canto: number, ch: number) => `scr:${code}:${canto}:${ch}`,
  home: "home",
  daily: "daily",
  practice: "practice",
  posts: "posts",
  settings: "settings",
} as const;
```

### 3.3 Publishing an edit (on-demand revalidation)

1. Editor saves in `/admin` → a server action validates (zod), checks role,
   writes to Neon, writes a `revisions` row.
2. The same action calls `revalidateTag(...)` for every tag the change
   affects (e.g. editing sūtra 42 → its sūtra tag **and** its chapter tag,
   because the chapter page lists it; plus `daily` if it's in the Verse of
   the Day pool).
3. The next request to an affected page re-renders from Neon and is cached
   again. Typical time to live: a few seconds.

A helper keeps this consistent: `lib/actions/revalidate.ts` exports
`revalidateForSutra(sutra)`, `revalidateForVerse(verse)`, etc. Actions call
these helpers, never `revalidateTag` with hand-typed strings.

### 3.4 Full rebuilds

A full rebuild re-runs `next build`: regenerates sitemaps, pre-renders the
static set, and clears everything. Triggers:

- Every push to `main` on GitHub (Vercel Git integration).
- **Daily at 02:00 Nepal time** via Vercel Cron → `/api/cron/rebuild`
  → POSTs the Vercel Deploy Hook. Keeps the sitemap current with new
  sūtras/verses added through the admin.
- Manually from `/admin/publishing` ("Rebuild site now").

### 3.5 Failure behaviour

| Failure | What happens | Why it's safe |
|---|---|---|
| Neon unreachable during a request for a cached page | Nothing; page served from cache. | Cache doesn't touch the DB. |
| Neon unreachable during ISR regeneration | Next.js keeps serving the stale page and retries next time. | ISR never replaces good HTML with an error. |
| Neon unreachable during `next build` | **Build fails on purpose**; Vercel keeps the previous deployment live. | We never publish empty pages. `scripts/assert-db.ts` runs first in `prebuild` and exits non-zero on failure. |
| Neon compute cold start (free tier suspends when idle) | First query after idle takes ~0.5–1 s. | Only affects regeneration/admin, not cached reads. |

## 4. Database access

```ts
// lib/db/index.ts
import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { env } from "@/lib/env";

export const db = drizzle({ client: neon(env.DATABASE_URL), schema });
export type DB = typeof db;
```

- **HTTP driver** (`neon-http`): one HTTPS round-trip per query, no
  connection pool to manage, ideal for serverless.
- **Atomic multi-statement writes** use `db.batch([...])` (runs as one
  transaction over HTTP). Interactive transactions (`db.transaction`) are not
  supported by `neon-http`; if a future feature truly needs one, add a
  second client using `drizzle-orm/neon-serverless` (WebSocket `Pool`) in
  that one action only, and record it in `DECISIONS.md`.
- Use the **pooled** connection string (`-pooler` host) at runtime and the
  **direct** string for `drizzle-kit migrate`.

## 5. Environment variables

Validated at startup by `lib/env.ts` (zod). A missing/invalid variable is a
crash at boot with a clear message, not a mysterious runtime error.

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | app runtime | Pooled Neon URL. Production → `main` branch; Preview → `dev` branch. |
| `DATABASE_URL_UNPOOLED` | `drizzle-kit`, scripts | Direct Neon URL. |
| `AUTH_SECRET` | admin sessions | ≥ 32 random bytes, base64. Rotating it logs everyone out. |
| `CRON_SECRET` | `/api/cron/*` | Vercel sends `Authorization: Bearer <CRON_SECRET>`. |
| `VERCEL_DEPLOY_HOOK_URL` | rebuild action, cron | From Vercel → Settings → Git → Deploy Hooks. |
| `SITE_URL` | metadata, sitemap | Falls back to `site.config.json`. |
| `REVALIDATE_SECRET` | `/api/revalidate` | Owner-only manual endpoint. |

Values are never written in docs or code. See `14-operations.md` §3 for
where each is set.

## 6. Security model (summary)

- Public site: read-only, no auth, no forms that write (until Phase 9).
- Admin: `middleware.ts` redirects unauthenticated requests on `/admin/**`
  to `/admin/login` (fast path), **and** every server action re-checks the
  session and role (real enforcement — middleware alone is not trusted).
- Rich HTML is sanitized with an allow-list **when it is saved**, so the
  public site can render it with `dangerouslySetInnerHTML` safely.
- Security headers in `next.config.ts`: `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options:
  DENY` on `/admin`, a CSP added in Phase 2.

## 7. Performance budget

| Metric | Budget |
|---|---|
| JS on a reading page (first load) | ≤ 130 kB gzipped |
| Sanscript (transliteration) | Not in the first load; dynamic `import()` only when a non-default script is chosen |
| Fonts | Self-hosted, `font-display: swap`, subset to Latin-ext + Devanagari |
| Images | `next/image`, AVIF/WebP, explicit width/height |
| Hero image | ≤ 250 kB (current `hero-cover.jpg` is 1.1 MB — fix in Phase 0) |

## 8. Upgrading to Next.js 16 (later, separate task)

Next 16 replaces `unstable_cache` with the `"use cache"` directive +
`cacheTag()`, and changes `revalidateTag`'s signature. Because all caching
lives in `lib/data/*` and all revalidation in `lib/actions/revalidate.ts`,
the upgrade touches those two places only. Do it as its own roadmap task
after Phase 4, with a full regression pass (`13-engineering-standards.md`
§9).
