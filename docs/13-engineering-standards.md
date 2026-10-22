# 13 — Engineering standards

The goal is simple: **the owner should never open the site and find it
broken.** Every rule here exists because skipping it causes a real class
of failure.

## 1. Server vs Client Components (most common bug in this repo)

- A file **without** `"use client"` is a Server Component. It may `await`
  data and read env vars. It may **not** use `useState`, `useEffect`,
  `onClick`, `onMouseEnter`/`onMouseLeave`, `window`, `localStorage`, or
  pass functions as props to client components.
  - Real incident: hover handlers added inside `app/page.tsx` broke the
    production build ("Event handlers cannot be passed to Client Component
    props"). Fix pattern: CSS `:hover` with a CSS variable
    (`style={{ "--card-accent": color }}` + `.accent-card:hover { border-color:
    var(--card-accent) }`), or a tiny `"use client"` wrapper component.
- A file **with** `"use client"` is a Client Component. It may not import
  `lib/db`, `lib/data`, `lib/actions` (except calling server actions passed
  as props or imported from a `"use server"` file), `fs`, or secrets.
- Keep client components **small and leafy**. Pages and layouts stay server.
- Props crossing server → client must be serialisable: no `Date` objects
  (use ISO strings), no class instances, no functions (except server
  actions), no `Map`/`Set`.

## 2. TypeScript

- `strict: true`. No `any` (use `unknown` + narrowing). No `@ts-ignore`
  (use `@ts-expect-error` with a reason, and only in tests).
- Database row types come from the schema: `typeof sutras.$inferSelect`.
  Never hand-write a type that duplicates a table.
- Public data functions return **plain DTOs** (explicit types in
  `lib/data/*`), not raw rows — this is the contract pages depend on.

## 3. Data access

- Only `lib/data/*` (reads) and `lib/actions/*` (writes) touch `db`.
- Every read used by a public page is wrapped in `unstable_cache` with tags
  from `lib/data/tags.ts`.
- Every write goes through the action pattern (`04-admin.md` §4): auth →
  zod → before → `db.batch([change, revision])` → revalidate helper.
- Public reads filter `status = 'published'`. Write a helper
  `published(table)` and use it — don't repeat the condition by hand.
- No N+1: fetch a chapter's sūtras in one query, notes in one query, audio
  in one query, then join in memory.

## 4. Errors and empty states

- `notFound()` for unknown slugs/numbers; never render an empty shell.
- `app/error.tsx` and `app/global-error.tsx` exist and look like the site.
- Empty content → honest message (`05-hnv-module.md` §3). Never
  placeholder text that looks like content.
- Server actions return `{ ok: false, error }` for expected failures and
  show it in the form; unexpected exceptions are logged with context
  (`console.error("[updateSutra]", { id }, err)`) and shown as a generic
  message.

## 5. Naming and layout

- Files: React components `PascalCase.tsx`; everything else `camelCase.ts`;
  route folders lowercase.
- DB: tables `snake_case` plural; columns `snake_case`; TS properties
  `camelCase` (Drizzle maps them).
- URLs: lowercase, hyphenated slugs; book codes lowercase.
- Spelling: "Anvaya". Diacritics in user-visible text; ASCII in
  identifiers (`samjna-sandhi-prakarana`).

## 6. Database migrations

1. Change `lib/db/schema.ts` → `npm run db:generate -- --name <what>` →
   review the SQL → commit both.
2. Apply to `dev` first (`npm run db:migrate` with `.env.local` pointing at
   `dev`), run the app and `verify-db`, then apply to `main`.
3. **Never edit a migration that has been applied anywhere.** Fix forward
   with a new migration.
4. **Expand → migrate → contract** for any breaking change: add new column
   → deploy code that writes both → backfill → deploy code that reads new
   → (later release) drop old column.
5. Destructive SQL (`DROP`, `DELETE` without `WHERE`, `TRUNCATE`) is never
   run on `main` without the owner's explicit OK in the conversation and a
   fresh Neon branch snapshot made just before.
6. Before a risky migration on `main`: create branch
   `backup-YYYYMMDD-<what>` from `main` (instant, copy-on-write).

## 7. Security checklist (every admin PR)

- [ ] `requireUser(minRole)` at the top of every action and admin page
- [ ] zod validation of every input; length limits on text
- [ ] HTML sanitized on write
- [ ] no secret in client bundles (`NEXT_PUBLIC_` only for public values)
- [ ] no raw SQL string concatenation (Drizzle `sql` template only)
- [ ] admin routes `noindex` and excluded from sitemaps

## 8. CI gates (`.github/workflows/ci.yml`)

Every PR and every push to `main`:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run test` (Vitest: script engine, verse-number parsing, daily
   pick, sanitizer, importers' parsing, zod schemas)
5. `npm run build` (against the `dev` branch DB)
6. Playwright smoke (Phase 2+) against `next start`
7. Lighthouse CI (Phase 4+) on 4 representative pages

A red CI blocks merge. Vercel builds only what CI would build.

## 9. Manual verification before saying "done"

Run locally (or in the workspace) after every change:

```bash
npm run typecheck && npm run lint && npm run build
npx next start -p 3911 &
for p in / /chapters /chapters/samjna-sandhi-prakarana /practice \
         /anvyaya /anvyaya/BG /hnv-wiki /about /more /sitemap.xml /robots.txt; do
  printf "%-45s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' localhost:3911$p)"
done
kill %1
```

Expected: 200 for pages (308 for redirected paths once Phase 3 lands).
Then open the touched pages and check: content present, no console
errors, mobile width (360 px) layout, dark mode.

## 10. Definition of done (per task)

- [ ] Acceptance criteria in `12-roadmap.md` met
- [ ] CI green
- [ ] §9 manual verification done, with any failures fixed
- [ ] No content invented; every new practice question cites a sūtra
- [ ] Docs updated (`12` ticked, `15` current, `DECISIONS.md` if a choice
      was made)
- [ ] Committed with a clear message; pushed

## 11. Known pitfalls in this stack

| Pitfall | Avoid by |
|---|---|
| `neon-http` has no interactive transactions | `db.batch([...])` |
| `revalidateTag` only clears data cached with that tag | All reads via `lib/data/*` with tags; one tag registry |
| `generateStaticParams` + `dynamicParams=false` 404s new content until rebuild | Use `dynamicParams = true` everywhere content can be added from the admin |
| Hydration mismatch from date-based UI | Render skeleton on server, compute in `useEffect` |
| Excel turns `18.10` into `18.1` | Importer reads cells as text (`raw: false`, `cellText`) and warns on numeric verse numbers |
| `/` used as a line break vs a real slash | Only split on `/` in Sanskrit/verse fields, never in URLs or English fields |
| Large `public/` images slow LCP | Budgets in `01-architecture.md` §7 |
| Owner's direct design commits | Always `git pull` first; never overwrite `app/page.tsx` design wholesale |
