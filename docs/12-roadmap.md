# 12 — Roadmap

Status keys: `[x]` done · `[~]` in progress · `[ ]` not started.
Work phases **in order**. A phase is done only when every acceptance
criterion passes and `15-current-state.md` is updated. Each task should be
one PR (or one small group of commits) that leaves the site deployable.

---

## Phase 0 — Guardrails & hygiene

Goal: make it hard to ship broken code before the big migration starts.

- [ ] 0.1 Pin `next` to the installed `15.5.x` (exact), add `"engines":
      { "node": ">=20.11" }`, commit `package-lock.json` changes.
- [ ] 0.2 Scripts: `typecheck` (`tsc --noEmit`), `lint` (`next lint` →
      ESLint flat config with `eslint-config-next`), `format` (Prettier),
      `test` (Vitest), `verify` (= typecheck + lint + test + build).
- [ ] 0.3 GitHub Action `ci.yml`: on PR and push to `main` run `npm ci &&
      npm run verify`. Build uses the `dev` Neon branch URL from repo
      secrets once Phase 1 lands.
- [x] 0.4 `lib/env.ts` with zod schema (`01-architecture.md` §5);
      `.env.example` listing every variable with a comment (no values).
- [ ] 0.5 Remove `tsconfig.tsbuildinfo` from git, add to `.gitignore`;
      `.gitignore` `public/sitemap*.xml`, `public/sitemaps/`,
      `public/robots.txt` (generated).
- [ ] 0.6 Move `googled9095024fc228c9a.html` into `public/`.
- [ ] 0.7 Compress `public/hero-cover.jpg` (1.1 MB → ≤ 250 kB, also AVIF)
      and `hnvlogo.png` (441 kB → favicon set ≤ 30 kB); fix
      `<link rel="icon" sizes="<generated>">` in `app/layout.tsx`.
- [x] 0.8 Set Vercel Functions region to `sin1` (next to Neon). *(2026-10-22)*
- [ ] 0.9 Replace `README.md` with a short pointer to `docs/` and
      local-setup steps.

**Accept when:** CI green on `main`; a deliberately broken PR (type error)
fails CI; Lighthouse performance ≥ 90 on `/` mobile.

## Phase 1 — Neon foundation & data migration

Goal: all existing content lives in Neon; the public site reads from Neon;
nothing visible changes.

- [x] 1.1 Create Neon project `hnv-vyakaranam` (`crimson-rice-97594890`,
      Singapore, PG 17), branches `main` + `dev`, database `hnv`, role
      `hnv_owner`. *(done 2026-10-22)*
- [x] 1.2 Drizzle schema `lib/db/schema.ts` (22 tables) and
      `drizzle.config.ts`; initial migration `drizzle/0000_init.sql`
      generated. *(done 2026-10-22)*
- [~] 1.3 `lib/db/index.ts` (neon-http client, `server-only`) ✓; scripts
      `db:generate`, `db:migrate`, `db:studio` still to add.
- [x] 1.4 Apply `0000_init` to `dev` and `main`, recorded in
      `drizzle.__drizzle_migrations`. *(2026-10-22, via the Neon connector)*
- [ ] 1.5 `scripts/db/seed-structure.ts` (editions, chapters, books,
      cantos, scripture chapters, base field definitions).
- [~] 1.6 HNV import built as an in-app owner action
      (`lib/import/hnvSpreadsheets.ts`, Admin → Tools / Dashboard) plus
      `scripts/db/emit-hnv-import-sql.py`. **Owner must click "Import" once
      on production.** Scripture import still to do.
- [ ] 1.7 `scripts/db/verify-db.ts`; counts match §2.4 of the pipeline doc.
- [ ] 1.8 `lib/data/{tags,hnv,scriptures}.ts` with `unstable_cache` + tags.
- [ ] 1.9 Switch `/chapters/**` and `/anvyaya/**` pages to `lib/data/*`;
      make them static (`generateStaticParams`, `revalidate = false`);
      `scripts/parity-check.ts` proves identical text output.
- [ ] 1.10 `scripts/assert-db.ts` in `prebuild`; sitemap generator reads
      from Neon (`09-seo-sitemap.md` §4).
- [x] 1.11 Vercel env vars: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
      `AUTH_SECRET` (Production → `main`, Preview/Development → `dev`),
      `CRON_SECRET`. *(2026-10-22)*
- [ ] 1.12 Move `content/` to `archive/content/`; delete `lib/content.ts`,
      `lib/anvyayaData.ts`, xlsx code paths; remove `xlsx` from
      `serverExternalPackages`/`outputFileTracingIncludes` (keep the
      package — the admin importer uses it).

**Accept when:** production serves every existing URL with identical
content from Neon; `verify-db` passes on `main`; chapter pages are static
(build output shows `●`/`○`, not `ƒ`); Neon outage simulation (bad URL in a
preview) keeps cached pages working and fails the build loudly.

## Phase 2 — Admin dashboard

- [x] 2.1 Auth (`04-admin.md` §2): `lib/auth/*`, login page, middleware,
      rate limiting, change password. Owner account created directly in
      Neon (bcrypt hash) instead of a `create-owner` script.
- [x] 2.2 Admin shell: layout, nav, dashboard counts & content gaps.
- [ ] 2.3 HNV: chapter list/edit, subchapter reorder, sūtra table & editor,
      drafts/publish, revisions, revalidation helpers.
- [ ] 2.4 Custom fields screen; forms render custom fields dynamically.
- [ ] 2.5 Notes: Tiptap editor + sanitize-html; Google Doc import tool;
      import all existing notes; delete `lib/sutraNotesDoc.ts` usage.
- [ ] 2.6 Scriptures: book/canto/chapter/verse editing.
- [ ] 2.7 Import (preview + diff) and export screens.
- [ ] 2.8 History screen with restore; users screen; publishing page
      (rebuild via deploy hook, revalidate all, sitemap manifest).
- [ ] 2.9 Daily rebuild cron (`vercel.json` `crons`, `/api/cron/rebuild`
      with `CRON_SECRET`).
- [ ] 2.10 Playwright e2e: login, edit a sūtra, publish, see it live,
      restore previous revision.

**Accept when:** an editor can change a sūtra's vṛtti and see it on the
live chapter page within 60 s without a deploy; a contributor cannot
publish; every edit appears in history and can be restored.

## Phase 3 — Scriptures rename & reader

- [ ] 3.1 New routes under `/scriptures/...`; 308 redirects from
      `/anvyaya/...` (all cases) and uppercase codes; nav label.
- [ ] 3.2 Remove Vedabase links and `CreditBox`; "Anvaya" spelling
      everywhere (components, types, labels).
- [ ] 3.3 Desktop two-pane reader, field switcher, jump box, keyboard.
- [ ] 3.4 Mobile stacked reader, sticky bar, swipe, bottom-sheet selectors.
- [ ] 3.5 Dual reader `/scriptures/read`.
- [ ] 3.6 SB verse pages as on-demand ISR; BG pre-built.

**Accept when:** every old `/anvyaya/...` URL in the current sitemap
returns 308 → a 200 `/scriptures/...` page (scripted check); reader passes
manual mobile test on a 360 px wide screen; Lighthouse ≥ 90 on a verse page.

## Phase 4 — Per-sūtra pages & SEO

- [ ] 4.1 `/chapters/[slug]/[sutra]` pages (`05-hnv-module.md` §4).
- [ ] 4.2 Metadata for every page type (`09` §2); JSON-LD (`09` §3).
- [ ] 4.3 Split sitemaps + manifest + shrink guard.
- [ ] 4.4 Lighthouse CI in the CI workflow.

**Accept when:** sitemap index lists all files; each sūtra URL returns 200
with a unique title/description; Search Console accepts the sitemap.

## Phase 5 — Script engine

- [ ] 5.1 `lib/script/*` conversion + normalisation + Vitest golden tests.
- [ ] 5.2 Dual-span rendering + `data-script` CSS + head script.
- [ ] 5.3 Bengali/Odia runtime (lazy sanscript), fonts.
- [ ] 5.4 Switcher in header & reader toolbars; overrides editable in admin.

**Accept when:** switching scripts never changes English text; no layout
flash for Devanagari/IAST; golden tests pass.

## Phase 6 — Home, daily content, audio, /more

- [ ] 6.1 Home blocks (DB + renderers + admin); remove the Maṅgalācaraṇa
      blocks.
- [x] 6.2 Verse of the Day & Subhāṣita (pools, pins, per-date API, admin
      screens `/admin/daily`, `/admin/subhashita`). *(2026-10-22)*
- [ ] 6.3 Audio links (admin + rendering).
- [ ] 6.4 `/more` posts table, Google Doc import, `/more/[slug]`.

## Phase 7 — Practice to Neon & expansion

- [ ] 7.1 Topics/questions in Neon; admin practice editor; delete
      `lib/practiceData.ts` after parity.
- [ ] 7.2 Local progress, "practice my mistakes".
- [ ] 7.3 Saṁjñā terminology questions (verified) → unlock topic.
- [ ] 7.4 Games: Sandhi Match, Sandhi Sprint, Split It.
- [ ] 7.5 Further chapters as verified questions are written (≥ 10 per
      topic to unlock).

## Phase 8 — Search & Wiki

- [ ] 8.1 `unaccent`, `pg_trgm`, `search_documents`, reindex script.
- [ ] 8.2 `/search` page + ⌘K palette.
- [ ] 8.3 Wiki tables, import of `hnv-wiki.html`, `/wiki/**`, redirects.

## Phase 9 — Reader accounts

- [ ] 9.1 Choose auth (Neon Auth vs Better Auth), record decision.
- [ ] 9.2 Local-first bookmarks, history, My Notes, settings.
- [ ] 9.3 Sign-in + sync + account deletion.

## Phase 10 — Tools, PWA, editions

- [ ] 10.1 Sandhi joiner/splitter (rule engine with sūtra tags).
- [ ] 10.2 Paradigm tables, declension/conjugation tools, Dhātupāṭha.
- [ ] 10.3 Nāma Grid & Dhātu Ladder games.
- [ ] 10.4 PWA + offline chapters.
- [ ] 10.5 Laghu & Bṛhat editions.

## Side track — Design system (done 2026-10-22)

- [x] New site-wide colors & type (`16-design-system.md`), home page
      redesign with the Varṇa-krama hero, header/footer restyle.

## Side track — Next.js 16 upgrade

After Phase 4: migrate `unstable_cache` → `"use cache"` + `cacheTag`,
`revalidateTag` signature, run full regression (`01-architecture.md` §8).
