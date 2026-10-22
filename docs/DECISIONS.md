# Decision log

Newest first. Each entry: date, decision, why, alternatives considered.
Never delete an entry; supersede it with a new one.

---

### D-014 — 2026-10-22 · Verse of the Day is entered scripture verses
**Decision:** both daily features use admin-entered `daily_items`
(`verse_of_day`, `subhashita`); sūtras are not daily verses.
**Why:** owner's correction. **Supersedes** the sūtra-based pool in D-011.

### D-013 — 2026-10-22 · Owner's design and fonts restored (supersedes D-009)
**Decision:** revert the "Śyāma & Kuṅkuma" redesign and all new fonts;
keep the owner's palette and font settings; add new elements inside them.
**Why:** owner: the redesign "destroyed" the site's look; the original was
professional. Lesson: redesign proposals go to the owner as previews
before replacing the live design.

### D-012 — 2026-10-22 · Wiki rendered inside the site
**Decision:** `/hnv-wiki` is a Next page built from `public/hnv-wiki.html`
(CSS scoped with postcss, markup normalised with node-html-parser, script
injected once), with the site header/footer and a mobile drawer.
**Why:** owner wants the same navigation everywhere and proper mobile use,
while still maintaining the wiki as one HTML file.

### D-011 — 2026-10-22 · Daily picks served per date, not as a baked pool
**Decision:** `/api/daily/<date>` (static, on-demand ISR, tag `daily`);
the browser asks for its own local date.
**Why:** baking ~1,290 entries into the home page would add hundreds of KB
for every visitor; per-date files are ~1 KB and still change at the
visitor's midnight without a rebuild.

### D-010 — 2026-10-22 · Content import runs inside the deployment
**Decision:** owner-only admin action imports the bundled xlsx files.
**Why:** the AI workspace can't reach Neon directly, and pasting ~170 KB of
Devanagari SQL through a connector risks silent transcription errors in
sacred text. The deployed app reads the files byte-for-byte.

### D-009 — 2026-10-22 · Design system "Śyāma & Kuṅkuma"
**Decision:** indigo/kuṅkuma/haridrā palette; Cormorant + Ysabeau Office +
Tiro Devanagari Sanskrit, self-hosted.
**Why:** owner asked for a full redesign; colors drawn from the subject
(Kṛṣṇa's complexion, tilaka, turmeric, Yamunā, tulasī); fonts chosen
because they're among the few that render every IAST diacritic incl. ṁ.

### D-008 — 2026-10-22 · Own minimal admin auth, not a third-party auth library
**Decision:** bcrypt + signed JWT cookie (`jose`) + `admin_users` table.
**Why:** a handful of admin users, no social login needed; Auth.js v5 is
still beta; fewer moving parts = fewer surprises. Reader accounts (Phase 9)
will choose separately (D-to-come).
**Alternatives:** Auth.js v5 beta, Neon Auth, Clerk.

### D-007 — 2026-10-22 · Search with Postgres full-text search in Neon
**Decision:** `unaccent` + `pg_trgm` + `tsvector` in a `search_documents`
table; CDN-cached search API.
**Why:** native to the database we already run; handles diacritic-less
IAST queries; no extra service.
**Alternatives:** client-side index (MiniSearch; too large for ~20k
documents on mobile), Algolia/Meilisearch (extra cost and sync).

### D-006 — 2026-10-22 · Custom fields as `jsonb` + `field_definitions`
**Decision:** extra columns live in `extra jsonb` keyed by
`field_definitions.key`.
**Why:** v6 requires "any extra column auto-appears"; adding a field must
not need a migration.
**Alternatives:** EAV table (slow, verbose), a column per field
(migration per field).

### D-005 — 2026-10-22 · SB verse pages are on-demand ISR, everything else pre-built
**Decision:** ~18k SB verse pages render on first request then stay
cached; HNV and BG pages pre-build.
**Why:** keeps builds fast and reliable while every page is still static
after first view.

### D-004 — 2026-10-22 · Static ISR + tag revalidation instead of rebuild-per-edit
**Decision:** admin saves call `revalidateTag`; full rebuilds only on push,
nightly, or manual.
**Why:** v6's speed goal without v6's "click Publish, wait minutes."

### D-003 — 2026-10-22 · Drizzle ORM with the Neon HTTP driver
**Decision:** `drizzle-orm/neon-http`; `db.batch()` for atomic writes.
**Why:** typed schema in one file, generated SQL migrations, serverless-
friendly HTTP queries.
**Alternatives:** Prisma (heavier, separate engine), raw SQL.

### D-002 — 2026-10-22 · Neon Postgres (replaces Turso)
**Decision:** Neon project `hnv-vyakaranam` (`crimson-rice-97594890`),
AWS Singapore, PG 17, branches `main`/`dev`.
**Why:** owner's choice; owner already uses Neon for other projects;
Neon connector is linked; Postgres gives FTS, JSONB, arrays, branching for
safe migrations. Singapore is the closest region to Nepal and matches the
owner's other projects.
**Alternatives:** Turso/libSQL (planned briefly, dropped same day).

### D-001 — 2026-10-22 · Database + admin replaces Google Sheets (v6 superseded)
**Decision:** content moves into a database with an admin dashboard;
everything in v6's "not part of this build" list moves onto the roadmap.
**Why:** owner's instruction; the site is meant to keep expanding, which
spreadsheets and live Google Docs can't support reliably.
