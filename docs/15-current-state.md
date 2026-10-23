# 15 — Current state (audit)

**Last updated:** 2026-10-22 (evening), after the home redesign + admin
foundation. Update this file whenever reality changes.

## 1. Stack in use today

- Next.js `15.5.x` (package.json says `^15.1.0`), React 19, Tailwind v4,
  TypeScript strict, lucide-react.
- Content read from **local `.xlsx` files** via `xlsx` at request time; two
  **Google Docs** fetched live on every request (sūtra notes, /more).
- Deployed on Vercel project `hnv`.
- Neon project created but **not yet used by the app** (Phase 1.3+).

## 2. Routes today

| Route | File | Rendering today |
|---|---|---|
| `/` | `app/page.tsx` (owner-designed) | static |
| `/chapters` | `app/chapters/page.tsx` | static |
| `/chapters/[slug]` | `app/chapters/[slug]/page.tsx` | **dynamic** (`force-dynamic`, live Google Doc) |
| `/anvyaya`, `/anvyaya/[book]/[[...rest]]` | `app/anvyaya/**` | dynamic (xlsx per request) |
| `/api/anvyaya/[book]/[division]/[chapter]` | route handler | dynamic |
| `/practice` | `app/practice/*` | static |
| `/more` | `app/more/page.tsx` | dynamic (live Google Doc) |
| `/about` | `app/about/page.tsx` | static |
| `/hnv-wiki` (+ `/HNV-Wiki`, `/hnvwiki`, `/wiki`) | rewrite → `public/hnv-wiki.html` | static file |
| `/Anvyaya/**`, `/ANVYAYA/**` | rewrites → `/anvyaya/**` | — |

## 3. Content inventory (from the xlsx files)

| Chapter file | Rows | Numbers | Subchapters | Vṛtti filled | Translation filled |
|---|---|---|---|---|---|
| mangalacarana | 6 | 0.1.1–0.1.x | 2 | 0 | 6 |
| samjna-sandhi-prakarana | 86 | 1–86 | 4 (Samjñā-sandhi 1–40, Sarveśvara 41–60, Viṣṇujana 61–78, Viṣṇusarga 79–86) | 0 | 0 |
| nama-prakarana | 173 | 87–259 | 8 | 0 | 0 |
| akhyata-prakarana | 359 | 260–618 | 18 | 0 | 0 |
| karaka-prakarana | 109 | 619–727 | 9 | 0 | 0 |
| krdanta-prakarana | 185 | **729**–913 | 1 | 0 | 0 |
| samasa-prakarana | 128 | 914–1041 | 18 | 0 | 0 |
| taddhita-prakarana | 237 | 1042–1278 | 1 | 0 | 0 |
| afterword | 7 | 0.2.1–0.2.x | 1 | 0 | 7 |
| **Total** | **1,290** | | **62** | | |

All sūtras have Sanskrit + transliteration. No duplicates, no gaps inside
any file's range.

Scriptures: 34 xlsx files (SB 1–12 with canto 10 in 4 parts; BG 1–18);
**only `bg-01.xlsx` has a row (1 verse)**. Columns: `S.N, Chapter No,
Chapter Name, File Number, Verse No, IAST-Verse, Devanagari-Verse, Vedabase
Link, Anvyaya, English Translation`.

Practice: 30 verified Sandhi questions in `lib/practiceData.ts`.

## 4. Known issues (to fix in the phase noted)

| # | Issue | Phase |
|---|---|---|
| 1 | **Kṛdanta range mismatch:** metadata says 728–913, file starts at 729 (sūtra 728 missing, or range label wrong). Needs the owner's answer. | 1 |
| 2 | Practice `SANDHI_TOPICS` says vowel sandhi "42–60"; source subchapter starts at **41**. | 7 (or 1 if touching the file) |
| 3 | `public/robots.txt` (committed) points to `harinamamrta-vyakaranam.vercel.app`; `site.config.json` now says `https://www.harinamamrta-vyakaranam.com` (the real canonical host). It's regenerated at build, but the committed copy is stale and misleading. | 0 |
| 4 | `googled9095024fc228c9a.html` sits at the **repo root**, so it is not served. Move to `public/`. (The meta-tag verification in `layout.tsx` still works.) | 0 |
| 5 | `public/hero-cover.jpg` is 1.1 MB; `hnvlogo.png` 441 kB used as favicon with an invalid `sizes="<generated>"` attribute. | 0 |
| 6 | Vedabase links (auto-generated) and `CreditBox` credit paragraphs violate rule 4. | 3 |
| 7 | "Anvyaya" spelling in code, labels, nav ("Scripture Anvyayas"), column headers. | 3 |
| 8 | `README.md` describes the old xlsx/live-Google-Doc workflow. | 0 |
| 9 | `tsconfig.tsbuildinfo` is committed. | 0 |
| 10 | Chapter pages are `force-dynamic` because of the live Google Doc → slow, and fail if Google is slow. | 1–2 |
| 11 | `scripts/generate-sitemap.mjs` keeps its own copy of the HNV slug list (drift risk). | 1/4 |
| 12 | `layout.tsx` description promises "practice section to practice all 7 chapters", "audio recitations", "multi-script" — not yet true. Fine as a roadmap, but keep in mind for honesty of metadata. | 4 |

## 5. Database & admin — what exists now (2026-10-22, late)

- **Neon** `hnv-vyakaranam`: schema applied to `main` and `dev`. **Madhyama
  imported on production** (1,290 rows, 62 subchapters — verified against
  the xlsx). Editions Madhyama/Bṛhat/Laghu all published; Bṛhat and Laghu
  have no sūtras yet. `dev` has schema + owner + editions only.
- **Vercel**: env vars set (Production → `main`, Preview/Dev → `dev`),
  functions region `sin1`, production domain `www.harinamamrta-vyakaranam.com`.
- **Public site** still reads chapter pages from the xlsx files (switch to
  Neon = roadmap 1.8–1.9). The home page's "For today" reads Neon via
  `/api/daily/[date]`.
- **Admin**: dashboard, Verse of the Day, Subhāṣita, Schedule, Admins
  (owner), Tools, Account. Sūtra editing not built yet.
- **Design**: owner's original design and fonts (`16-design-system.md`).
- **Wiki**: inside the site layout, mobile drawer (`app/hnv-wiki`).

Note for the AI assistant: this cloud workspace **cannot open network
connections to Neon or to the live site** (egress policy). Use the Neon
connector for SQL and the Vercel connector for deployments/env vars; never
paste large content through SQL (use the in-app import).

## 6. Update 2026-10-23 — sūtra editing (Phase 1.8–1.9 done)

- **Content source:** Neon only. The xlsx files, `lib/content.ts` and the
  spreadsheet importer were removed (parity verified first: all 1,290 rows
  matched the xlsx byte-for-byte by md5). Sūtra **728 is missing** in the
  source data (Kāraka ends at 727, Kṛdanta starts at 729) — an editor can
  add it in the admin.
- **Public pages** read Neon through `lib/data/hnv.ts` (cached, tag
  `hnv`): `/`, `/chapters`, `/chapters/[slug]`, and the same for
  `/brhat/chapters` and `/laghu/chapters` (show "being prepared" until an
  edition has chapters). Sūtra ranges ("1–86") are calculated from the
  numbers. Saving in the admin revalidates them immediately.
- **Admin → Chapters & sūtras** (`/admin/hnv/[edition]`): add/edit/reorder/
  delete chapters; add/rename/reorder/delete (or merge) sections; add,
  insert-after, edit, delete sūtras with automatic renumbering; go-to-sūtra
  box; prev/next on the edit page; commentary kinds per edition
  (`/admin/hnv/[edition]/commentaries`); rich-text editor with tables and
  picture upload (`/api/admin/upload` → Vercel Blob, 4 MB max).
- **Roles:** editors/owners change everything; contributors edit
  commentary text only (saved as draft, an editor publishes); viewers read.
  The panel layout now admits viewers (it used to redirect them in a loop).
- **Old Google-Doc notes:** Tools → "Import notes from the Google Doc"
  copies them into the "Notes" commentary once (sūtras 1 and 104 had notes).
  The chapter pages no longer read the Doc.
- **Migrations:** `0001_commentaries` (already applied earlier, file now
  committed — same hash) and `0002_media_files`, applied to `main` and `dev`.
- **Sitemap:** chapter URLs come from Neon at build time (fallback list if
  the DB is unreachable).
- Not done yet: per-sūtra pages (`05` §4), script switcher, revision
  history UI (revisions are recorded), practice references don't follow
  renumbering automatically (`lib/practiceData.ts` cites numbers).

## 7. Update 2026-10-23 (later) — spreadsheet, practice, wiki

- **Spreadsheet bulk edit:** Admin › Chapters & sūtras › Spreadsheet.
  Download `/api/admin/hnv-template?edition=…` (sheets: Sutras, Chapters,
  Read me), upload back. Matched by Number; empty cells never erase; never
  deletes; any row error → nothing saved; dry run by default.
  Code: `lib/hnv/spreadsheet.ts`, `lib/actions/spreadsheet.ts`.
- **Practice** lives in Neon (`practice_topics`, `practice_questions`;
  30 questions migrated from `lib/practiceData.ts`, which now holds only
  types/helpers). Admin › Practice edits topics/questions; questions must
  cite real Madhyama sūtra numbers. The quiz shuffles questions and
  options (`shuffleOptions`).
- **Editions order:** Laghu → Madhyama → Bṛhat (`lib/editions.ts`, `editions.sort`).
- **Data fixes:** sūtra 728 added (start of Kṛdanta), 729 corrected
  (owner-supplied text). Google-Doc notes code removed.
- **Wiki:** sūtras 53–60 added; example rows for 54/55 corrected.
