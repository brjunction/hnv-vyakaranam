# 14 — Operations

## 1. Environments

| Environment | Code | Database (Neon branch) | URL |
|---|---|---|---|
| Production | `main` branch on GitHub | `main` (`br-calm-smoke-a1hu3mn2`) | `https://www.harinamamrta-vyakaranam.com` (apex and `harinamamrta-vyakaranam.vercel.app` also attached; apex 308 → www) |
| Preview | any PR / other branch | `dev` (`br-crimson-leaf-a18n6gn6`) | Vercel preview URL |
| Local | developer machine | `dev` | `http://localhost:3000` |

Neon project: **`hnv-vyakaranam`**, id **`crimson-rice-97594890`**,
org `org-soft-term-15997167`, region **AWS ap-southeast-1 (Singapore)**,
Postgres 17, database **`hnv`**, owner role **`hnv_owner`**, PITR history
6 hours. Compute autoscaling 0.25 CU, scales to zero when idle (free plan).

Vercel project: **`hnv`** (`prj_bQUwmKeeD7YGlP6IOqOSo0kE2EiL`), GitHub repo
`brjunction/hnv-vyakaranam`.

## 2. One-time platform settings

- [x] Vercel → Settings → Functions → Region: **`sin1`** (Singapore). *(set 2026-10-22)*
- [x] Vercel → Settings → Environment Variables (§3). *(set 2026-10-22: DATABASE_URL, DATABASE_URL_UNPOOLED, AUTH_SECRET, CRON_SECRET)*
- [ ] Vercel → Settings → Git → Deploy Hooks → create hook "admin-rebuild"
      on `main` → store URL as `VERCEL_DEPLOY_HOOK_URL`.
- [ ] GitHub → repo → Settings → Secrets: `NEON_DEV_URL`,
      `NEON_BACKUP_URL` (direct URL of `main`, used by backup workflow).
- [ ] Neon → project → Branches → mark `main` as **protected**.

## 3. Environment variables

| Name | Production | Preview | Local `.env.local` |
|---|---|---|---|
| `DATABASE_URL` | `main` pooled | `dev` pooled | `dev` pooled |
| `DATABASE_URL_UNPOOLED` | `main` direct | `dev` direct | `dev` direct |
| `DATABASE_URL_PROD`, `DATABASE_URL_PROD_UNPOOLED` | — | — | only for one-off prod scripts |
| `AUTH_SECRET` | random 32 B | different random 32 B | any |
| `CRON_SECRET` | random | — | — |
| `VERCEL_DEPLOY_HOOK_URL` | hook URL | — | — |
| `REVALIDATE_SECRET` | random | random | any |
| `VERCEL_API_TOKEN` (optional) | read-only token | — | — |
| `SITE_URL` | `https://www.harinamamrta-vyakaranam.com` | preview URL (optional) | `http://localhost:3000` |

Generate secrets with `openssl rand -base64 32`. Connection strings come
from Neon console → Connect (or the Neon connector). **Never** put them in
code, docs, commits, or chat logs meant for others. If one leaks: Neon →
Roles → `hnv_owner` → Reset password, then update Vercel and `.env.local`.

## 4. Deploys

- Push to `main` → Vercel production build (prebuild: `assert-db` →
  sitemaps → `next build`).
- Daily 02:00 NPT (20:15 UTC) Vercel Cron → `/api/cron/rebuild` → deploy hook.
  `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/rebuild", "schedule": "15 20 * * *" }] }
  ```
- Rollback: Vercel → Deployments → previous → "Promote to Production"
  (instant; database unaffected).

## 5. Runbooks

**Site shows old content after an edit**
1. Admin → Publishing → "Revalidate everything".
2. Still old → check the action logged no error (Vercel → Logs, filter
   `[update`); confirm the row is `published` in Neon.
3. Still old → "Rebuild site now".

**Build fails with `assert-db` error**
Neon compute may be waking or the URL is wrong. The live site is unaffected
(previous deployment). Check Neon console status; check `DATABASE_URL` in
Vercel; redeploy.

**Bad edit / accidental deletion**
1. Admin → History → find the revision → Restore.
2. Many rows damaged: Neon → Branches → create branch from `main` at a
   timestamp before the damage (within 6 h) → verify there → copy affected
   rows back with a reviewed SQL script, or restore the branch (owner
   decision).
3. Older than 6 h: restore last nightly `pg_dump` into a new Neon branch
   (`pg_restore --no-owner -d <branch-url> dump.pgcustom`) and copy rows
   back.

**Search Console: "couldn't fetch sitemap"**
Open `<SITE_URL>/sitemap.xml` — must be XML. If it 404s, the last build
didn't run the generator: check build logs for `build-sitemaps`. Confirm
`SITE_URL` matches the domain actually in Search Console.

## 6. Limits & cost watch (free tiers)

| Resource | Limit (check current plan pages) | Our expected use | Watch |
|---|---|---|---|
| Neon storage per branch | 1 GiB reported for this project | < 200 MB for years | Neon console → Usage, monthly |
| Neon compute | free-plan monthly CU-hours | low: only ISR regeneration, admin, builds, search | monthly |
| Vercel ISR writes/reads, function invocations | Hobby limits | moderate | Vercel → Usage |
| Vercel build minutes | Hobby limits | ~30 builds/month | — |

If any metric passes 70 % of its limit, open a task to evaluate the next
paid tier before it blocks the site.
