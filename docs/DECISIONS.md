# Decision log

Newest first. Each entry: date, decision, why, alternatives considered.
Never delete an entry; supersede it with a new one.

---

### D-017 — 2026-10-23 · Library catalog, simple commentary dropdown, site-wide notebook
**Decision (owner):** the scripture library is organised in sections →
categories (`scripture_categories`, migration 0007; editable in
`/admin/scriptures/categories`), seeded with Primary scriptures, the
Gauḍīya granthas (list based on Gaudiya Grantha Mandira) and Śāstra;
books without text show as "Coming soon". In the reader, commentaries are
ONE dropdown (no side rail). The chapter page shows all verses at once
with a view switch (Verses / + Translation / + Commentary ▾, Anvaya
toggle). Per-verse bookmarks and notes are removed; instead a site-wide
**Notebook** (header button, drawer on every page, `/notes`) kept on the
device, with backup/restore. Controls use one UI kit (`.ui-*` CSS +
`components/ui/Select`) that follows light/dark mode.
**Why:** the side rail overflowed; owner wants simple, organised, polished
controls; per-verse saving was not wanted.

### D-016 — 2026-10-23 · Scriptures in Neon: unlimited books, roles, script rule
**Decision:** the "exactly two scriptures" rule is lifted (owner: "ever
expanding"). Books have their own level names (`books.levels`), divisions
form a tree (`scripture_divisions`), verses hang on any division
(`scripture_verses`), and texts of a verse are "commentary kinds"
(`scripture_commentary_types`) with a ROLE (`pane`): `anvaya` and
`translation` belong to the verse (own design, under the verse),
`verse` = word-for-word, `commentary` = purports/ṭīkās (commentary pane,
navigator built for 20+). Script switching converts all Devanagari,
Bengali, Odia and IAST; only English is protected (kind language =
English, or `<span lang="en">` marked in the editor; IAST terms in English
can be marked `lang="sa"`). Audio is not shown in Scriptures (owner).
Personal bookmarks/notes/history are local-first (on the device, with
JSON backup) until reader accounts (Phase 9).
**Why:** owner's instructions during the build.
**Alternatives:** fixed canto/chapter tables (old `cantos` /
`scripture_chapters` / `verses` — empty, kept unused, drop later).

### D-015 — 2026-10-23 · Sūtras live only in Neon; any number of rich-text commentaries
**Decision:** the chapter spreadsheets (`content/chapters/*.xlsx`) and the
sūtra-notes Google Doc are retired. All chapters, sections, sūtras,
vṛtti, translations and commentaries are edited in `/admin/hnv`.
Commentary kinds are rows in `commentary_types` (per edition, unlimited);
each sūtra has at most one entry per kind in `sutra_commentaries`.
Vṛtti, translation, synonyms and commentaries are **rich HTML** (TipTap
editor: headings, colours, lists, links, tables, pictures), sanitized on
the server (`lib/html/sanitize.ts`). Pictures are uploaded to Vercel Blob
(`hnv-images` store) and logged in `media_files`.
Inserting a sūtra whose number is taken shifts every following number
(same prefix) +1; deleting can shift them −1. Gaps are preserved.
**Why:** owner: "Forget excel sheets… editors will add sūtras, vṛttis,
various commentaries… rich text, tables and pictures, not markdown."
**Supersedes** the xlsx/Google-Doc content pipeline and `sutra_notes`.

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
