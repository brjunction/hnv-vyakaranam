# 03 — Content pipeline

How content gets **into** Neon, how changes reach the **live site**, and how
it gets **out** again (exports, backups).

## 1. Sources being retired

| Today | Content | Retired in |
|---|---|---|
| `content/chapters/*.xlsx` (9 files) | HNV sūtras/verses: 1,277 sūtras + 13 verses | Phase 1 |
| `content/anvyaya/{sb,bg}/*.xlsx` (34 files) | Scripture verses (almost empty today: 1 row in `bg-01`) | Phase 1 |
| Google Doc `SUTRA_NOTES_DOC_URL` (`lib/config.ts`) | Sūtra notes, `<sutra N start>` / `<sutra N end>` markers | Phase 2 (import tool) |
| Google Doc `MISC_DOC_URL` | `/more` sections & cards | Phase 6 |
| `lib/content.ts` `CHAPTER_META` | Chapter titles, summaries, ranges | Phase 1 (seed) |
| `lib/anvyayaBooks.ts` `BOOKS` | Book & division metadata | Phase 1 (seed) |
| `lib/practiceData.ts` `QUESTIONS` | 30 verified Sandhi questions | Phase 7 (seed); stays in TS until then |

After a source is imported and verified, its files are moved to
`archive/` in the repo (kept for reference, never read by the app) and the
loader code that read them is deleted.

## 2. One-time import (Phase 1)

### 2.1 Scripts

| Script | Does |
|---|---|
| `scripts/db/seed-structure.ts` | Upserts editions, chapters (from `CHAPTER_META`), books, cantos, scripture chapters (from `BOOKS`), base `field_definitions`. |
| `scripts/db/import-hnv-xlsx.ts` | Reads every `content/chapters/*.xlsx`; upserts subchapters and sūtras. |
| `scripts/db/import-scripture-xlsx.ts` | Reads every `content/anvyaya/**.xlsx`; upserts scripture chapters and verses. Drops the Vedabase column (rule 4). |
| `scripts/db/verify-db.ts` | Invariants (`02-data-model.md` §4) + count comparison with the source files. |

Run with `npx tsx scripts/db/<name>.ts --target dev` (or `--target prod`).
`--target` picks `DATABASE_URL_UNPOOLED` or `DATABASE_URL_PROD_UNPOOLED`
from `.env.local`. **Default is `dev`.** `--target prod` asks for typed
confirmation (`type "prod" to continue`).

### 2.2 Idempotency

Every import is an **upsert keyed on the natural key**, so running it twice
changes nothing:

| Table | Natural key |
|---|---|
| chapters | `(edition_id, slug)` |
| subchapters | `(chapter_id, slug)` |
| sutras | `(edition_id, number)` |
| scripture_chapters | `(book_id, canto, number)` |
| verses | `(book_id, canto, chapter, verse_key)` |

Upserts use `INSERT … ON CONFLICT (…) DO UPDATE SET …` in batches of 200
rows inside `db.batch()`. Each batch writes one `revisions` row per entity
with `action = 'import'`.

**Import never deletes.** A row missing from the spreadsheet is reported,
not removed. Deleting is a deliberate admin action.

### 2.3 Field mapping

HNV (`content/chapters/<slug>.xlsx`, header row matched loosely as in
today's `lib/content.ts`):

| Spreadsheet | Column |
|---|---|
| Subchapter | → `subchapters.title` (slugified to `slug`), in order of first appearance |
| Sutra Number | → `sutras.number` (converted to text; `260` → `"260"`) |
| Sanskrit | → `sanskrit` |
| Transliteration | → `transliteration` (verbatim) |
| Synonyms | → `synonyms` (column doesn't exist yet — empty) |
| Vrtti | → `vrtti` |
| Translation | → `translation` |
| any other column | → `extra[<snake_case header>]`, and a `field_definitions` row is created if missing |
| S.No | ignored (row order → `position = rowIndex * 10`) |

Scriptures (`content/anvyaya/<book>/<file>.xlsx`): verse-number parsing
follows today's `parseVerseNo()` in `lib/anvyayaData.ts` exactly (SB
`canto.chapter.verse`, BG `chapter.verse`, short forms completed from the
file name). `Anvyaya`/`Anvaya` column → `extra.anvaya`; `English
Translation` → `extra.translation`; `Vedabase Link` dropped; `S.N`,
`File Number` ignored.

### 2.4 Verification gate

The import is accepted only when `verify-db.ts` passes **and** these counts
match:

| Check | Expected (from audit, 2026-10-22) |
|---|---|
| Madhyama chapters | 9 |
| Subchapters | 1+18+9+1+2+8+18+4+1 = 62 (see `15-current-state.md` §3) |
| Sūtra rows | 1,290 (1,277 numbered sūtras + 6 + 7 verses) |
| Duplicate sūtra numbers | 0 |
| Books / cantos / SB chapters expected | 2 / 12 / 335 |
| Verses | equal to non-empty `Verse No` rows in the xlsx files |

Then a page-by-page parity check: for every chapter, the HTML text of the
current xlsx-driven page and the new DB-driven page must match
(`scripts/parity-check.ts`, Phase 1 task 1.9).

### 2.5 Where the import runs

The import scripts need a direct connection to Neon, so they run on a
developer machine (or a GitHub Action with the URL as a secret). Neon's
MCP connector can also run SQL directly; for the first import the scripts
can emit plain `INSERT … ON CONFLICT` SQL (`--emit-sql out.sql`) which is
then applied through the connector in chunks. Both paths produce identical
data.

## 3. Ongoing editing (after Phase 2)

```
Admin form ──zod──► server action ──db.batch([write, revision])──► Neon
                                 └──► revalidateFor<Entity>() ──► affected tags
```

- Drafts (`status = 'draft'`) are invisible to the public site; publishing
  flips `status` and revalidates.
- Bulk edits use **Import XLSX/CSV** in the admin (same mapping as §2.3,
  same upsert rules, preview + diff before commit, see `04-admin.md` §7).

## 4. Notes import from Google Doc (Phase 2)

Admin → Tools → "Import notes from Google Doc":

1. Owner pastes the doc URL (defaults to the current `SUTRA_NOTES_DOC_URL`).
2. Server fetches `…/export?format=html` (existing `lib/googleDocs.ts`
   logic), splits by `<sutra N start>` / `<sutra N end>`.
3. Google's class-based styles are **inlined** into each element (bold,
   italic, color, alignment, font-size) because the scoped `<style>` block
   won't exist anymore. Then the HTML is sanitized (`04-admin.md` §6).
4. Preview: N notes found, M match a sūtra number, K unmatched (listed).
5. Commit: upsert into `sutra_notes` with `source = 'gdoc-import'`, one
   revision each; revalidate affected chapters.

Re-running is safe (upsert). After the final import the Google Doc is no
longer read by the site; notes are edited in the admin's rich-text editor.

## 5. Exports

| Export | Where | Format |
|---|---|---|
| One HNV chapter | Admin → Chapter → Export | XLSX with the same columns as the import (round-trips) |
| One SB canto / BG chapter | Admin → Scriptures → Export | XLSX |
| Everything | Admin → Tools → Full export | ZIP of XLSX files + `notes/*.html` + `manifest.json` |
| Practice bank | Admin → Practice → Export | JSON |

Exports are the safety net for editors who want to work offline in a
spreadsheet and then re-import.

## 6. Backups

Three independent layers:

1. **Neon point-in-time restore** — `history_retention_seconds = 21600`
   (6 hours) on this project. Restore = create a branch at a timestamp,
   inspect, then promote or copy data back (`14-operations.md` §5).
2. **Revisions table** — every edit's before/after, restorable per row from
   the admin.
3. **Nightly logical backup** — GitHub Action `.github/workflows/backup.yml`
   runs `pg_dump --format=custom` against the `main` branch (direct URL
   from the `NEON_BACKUP_URL` repository secret) at 01:30 Nepal time and
   uploads it as a workflow artifact, retained 90 days. A weekly job
   restores the latest dump into a throwaway Neon branch and runs
   `verify-db.ts` against it — an untested backup is not a backup.
