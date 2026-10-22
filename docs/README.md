# HNV Platform — Documentation

This folder is the single, authoritative description of the Harināmāmṛta-
Vyākaraṇam platform: what it must do, how it is built, and the order in which
it gets built. It replaces every earlier requirements document (v1–v6), the
Turso plan, and the Google-Sheets plan. When anything here conflicts with an
older file, chat message, or code comment, **this folder wins** — and the
conflict should be fixed here, in writing, before code changes.

## How to use these docs

- **Before starting work:** read `15-current-state.md` (what exists) and
  `12-roadmap.md` (what's next). Then the module doc for the area you touch.
- **Before writing code:** read `13-engineering-standards.md`.
- **When you finish a task:** tick it in `12-roadmap.md`, update
  `15-current-state.md` if reality changed, and add an entry to
  `DECISIONS.md` if you made a choice someone might later question.
- **Docs are code.** They are reviewed and committed like code. A feature is
  not "done" while its doc is wrong.

## Index

| File | What it answers |
|---|---|
| `00-requirements.md` | What the platform must do (v7). Product rules. |
| `01-architecture.md` | The overall system: Next.js + Neon + Vercel, rendering & caching model. |
| `02-data-model.md` | Every database table, column, constraint, and why. |
| `03-content-pipeline.md` | Getting content in (import), keeping it fresh (revalidation), getting it out (export, backups). |
| `04-admin.md` | The `/admin` dashboard: auth, roles, editing, drafts, revisions, bulk tools. |
| `05-hnv-module.md` | HNV editions, chapters, sūtra pages, notes, chapter reader. |
| `06-scriptures-module.md` | Bhāgavatam & Gītā reader, desktop and mobile, URLs, redirects. |
| `07-script-engine.md` | Devanagari / IAST / Bengali / Odia switching. |
| `08-home-daily-audio.md` | Home page blocks, Verse of the Day, Daily Subhāṣita, audio links, /more posts. |
| `09-seo-sitemap.md` | Metadata, canonical URLs, structured data, sitemaps, robots. |
| `10-practice-and-games.md` | Practice engine, question bank, games. |
| `11-future-modules.md` | Search, Wiki, user accounts (My Notes, bookmarks, history), tools, PWA, other editions. |
| `12-roadmap.md` | Phases, tasks, acceptance criteria, status. |
| `13-engineering-standards.md` | Conventions, folder layout, QA gates, definition of done, known pitfalls. |
| `14-operations.md` | Environments, env vars, deploys, Neon branches, backups, incident runbooks. |
| `15-current-state.md` | Audit of the codebase as it is today, and known content/code issues. |
| `DECISIONS.md` | Architecture decision log (why we chose what we chose). |

## Glossary

| Term | Meaning |
|---|---|
| HNV | Harināmāmṛta-Vyākaraṇam, Śrīla Jīva Gosvāmī's Sanskrit grammar. |
| Edition | Laghu, Madhyama, or Bṛhat recension. Only Madhyama has content today. |
| Prakaraṇa / chapter | A top-level division of HNV (e.g. Nāma-prakaraṇa). |
| Subchapter | A named group of sūtras inside a chapter (e.g. Sarveśvara-sandhi). |
| Sūtra | A numbered rule. Numbers are unique within an edition (1–1278). |
| Vṛtti | The prose explanation of a sūtra. |
| Anvaya | Prose word-order of a verse. |
| Canto | A top-level division of the Bhāgavatam (12). |
| ISR | Incremental Static Regeneration — Next.js serves a cached static page and regenerates it on demand. |
| Revalidate | Throw away a cached page/data so the next request rebuilds it from the database. |
| Neon branch | A copy-on-write copy of the database. `main` = production, `dev` = development. |
