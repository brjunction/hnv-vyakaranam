# HNV Platform — Requirements v7

**v7 replaces v6 completely.** v6's product requirements (home page, HNV
module, Scriptures, script engine, audio, SEO, mobile) carry forward almost
unchanged. What v7 changes:

1. **Content store:** Neon Postgres replaces Google Sheets/Docs and local
   `.xlsx` files as the single source of truth.
2. **Editing:** a real admin dashboard (`/admin`) with login, roles, drafts,
   revision history, and bulk import/export replaces "edit the sheet, click
   Publish."
3. **Freshness:** saving in the admin updates the live page within seconds
   (on-demand revalidation). v6's speed goal is kept: visitors are served
   pre-rendered static pages, never live database queries.
4. **Scope:** everything v6 listed as "not part of this build" (practice &
   games, search, wiki, My Notes, bookmarks, history, settings, grammar tools,
   PWA/offline, more editions) is now **in scope, on the roadmap**, built in
   phases (`12-roadmap.md`). Nothing is dropped; things are sequenced.

---

## 1. Absolute rules

1. **Neon Postgres is the only content store.** No content lives in code,
   spreadsheets, or Google Docs after migration (Phase 1). Spreadsheets
   remain only as an *import/export format*.
2. **Visitors never wait on the database.** Public pages are static or ISR
   (`01-architecture.md` §3). Exceptions: the first render of a page that
   has never been cached, and site search queries (CDN-cached per query,
   `11-future-modules.md` §1).
3. **Never invent scripture or sūtra content.** An empty field shows an
   honest empty state ("Vṛtti not yet added"), never generated filler.
4. **No external credit paragraphs and no Vedabase (or other third-party)
   links** on core verse/sūtra content.
5. **Audio is links only.** No audio file is uploaded to or stored by this
   site.
6. **Exactly two Scriptures:** Śrīmad-Bhāgavatam and Bhagavad-gītā. The data
   model is generic; adding a third book is a requirements change, not a
   code change.
7. **Parity first.** Every URL that works today keeps working.
   `/anvyaya/...` permanently (308) redirects to `/scriptures/...`.
8. **Mobile-first**, the Scriptures reader most of all.
9. **Excellent, reliable SEO.** The sitemap is a static file that cannot go
   down; every sūtra and verse has its own indexable URL.
10. **Spelling: "Anvaya"** (not "Anvyaya") in every label, field, and
    identifier.
11. **Correct grammar categories.** Saṁjñā (1–40) and Sandhi (41–86) are
    different topics inside the same chapter. Sandhi has exactly three
    types: Sarveśvara (vowel), Viṣṇujana (consonant), Viṣṇusarga (visarga).

## 2. Users and roles

| Who | What they do | How |
|---|---|---|
| Visitor | Reads, practices, (later) saves notes/bookmarks | Public site, no login (accounts optional, Phase 9) |
| Contributor | Drafts content edits | `/admin`, cannot publish |
| Editor | Edits and publishes content, imports/exports | `/admin` |
| Owner | Everything, plus users, settings, destructive actions | `/admin` |

## 3. Home page

- **Removed:** the two Maṅgalācaraṇa verse display blocks.
- **Verse of the Day:** pool of eligible sūtras/verses stored in the DB and
  baked into the home page; today's pick is computed in the browser from
  the date (so it changes daily without a rebuild). A pinned date wins over
  rotation.
- **Daily Subhāṣita:** same mechanism, its own pool.
- **Ordered home blocks:** admin-managed blocks (kind, title, body, order,
  visibility). Design of the page itself is owned by the site owner in
  `app/page.tsx`; blocks fill defined slots.

Details: `08-home-daily-audio.md`.

## 4. HNV module

- **Editions:** Laghu, Madhyama, Bṛhat — selectable; independent chapters
  and sūtras; only Madhyama populated now. Madhyama stays at `/chapters`.
- **Chapters (Madhyama):**

| Order | Slug | No. | Title | English | Kind | Range |
|---|---|---|---|---|---|---|
| 1 | mangalacarana | — | Maṅgalācaraṇa | Invocation | verses | 0.1.x (6 verses) |
| 2 | samjna-sandhi-prakarana | 1 | Saṁjñā-sandhi-prakaraṇa | Terminology & Phonetic Combination | sūtras | 1–86 |
| 3 | nama-prakarana | 2 | Nāma-prakaraṇa | Noun Declension | sūtras | 87–259 |
| 4 | akhyata-prakarana | 3 | Ākhyāta-prakaraṇa | Verb Conjugation | sūtras | 260–618 |
| 5 | karaka-prakarana | 4 | Kāraka-prakaraṇa | Case Meanings | sūtras | 619–727 |
| 6 | krdanta-prakarana | 5 | Kṛdanta-prakaraṇa | Participles & Kṛt-formations | sūtras | 728–913 |
| 7 | samasa-prakarana | 6 | Samāsa-prakaraṇa | Compounds | sūtras | 914–1041 |
| 8 | taddhita-prakarana | 7 | Taddhita-prakaraṇa | Taddhita-formations | sūtras | 1042–1278 |
| 9 | afterword | — | Afterword | Afterword | verses | 0.2.x (7 verses) |

- **Per sūtra:** subchapter, number (text), Sanskrit, transliteration (stored
  exactly as typed, never auto-converted), synonyms, vṛtti, translation, plus
  any number of **custom fields** defined in the admin (they appear
  automatically, in their defined order). `/` in text means a line break.
- **Sūtra Notes:** rich text per sūtra (formatting preserved), with a
  "Notes" indicator and a site-wide show/hide toggle.
- **Chapter page:** all subchapters on one page; click-to-expand sūtra cards;
  toolbar (expand/collapse all, show/hide/reset, notes toggle); stable
  per-sūtra anchors; "go to sūtra" jump.
- **Sūtra page (new):** every sūtra has its own URL
  (`/chapters/<slug>/<number>`), with prev/next.

Details: `05-hnv-module.md`.

## 5. Scriptures module

- Section and URL renamed to **Scriptures** (`/scriptures`).
- **Śrīmad-Bhāgavatam:** Canto → Chapter → Verse (12 cantos, 335 chapters).
- **Bhagavad-gītā:** Chapter → Verse (18 chapters).
- **Per verse:** verse number (text, exact: `1.12.1`, `18.6`, `16-18`), IAST,
  Devanagari (hidden until clicked), plus custom fields (Anvaya, English
  Translation, Word-for-word, Commentary, …). No external links.
- **Desktop:** two panes (verse text | commentary-type fields), each
  show/hide-able, field switcher when several exist; canto/chapter/verse
  selectors; prev/next; numeric jump; side-by-side dual reading (two books
  or two places in one); script switcher.
- **Mobile:** stacked collapsible panels (≈half-screen each when both open);
  sticky prev/next; dual reading becomes a tab switch.

Details: `06-scriptures-module.md`.

## 6. Script engine

Devanagari / IAST / Bengali / Odia, site-wide, **Sanskrit-language content
only** (sūtra Sanskrit, synonyms, vṛtti, verse text, Sanskrit custom fields).
English content (translations, English custom fields, notes) always displays
exactly as typed. Any field may carry a hand-written override for a script
where automatic conversion is not accurate enough. Details:
`07-script-engine.md`.

## 7. Audio

Any number of audio entries per sūtra, verse, or chapter: title, speaker
(free text), and a link. Links only. Details: `08-home-daily-audio.md`.

## 8. Admin dashboard

Login-protected `/admin`: CRUD for every content type, drafts and publish,
revision history with restore, custom fields, bulk import/export
(XLSX/CSV), notes rich-text editor, users & roles, publishing tools
(revalidate, full rebuild, sitemap status), and an index of any external
sources still referenced. Details: `04-admin.md`.

## 9. SEO

Unique title/description/canonical per sūtra and verse; structured data;
sitemap index + split sitemaps generated as static files at build time and
refreshed nightly; robots.txt points to it; Search Console verification
keeps working. Details: `09-seo-sitemap.md`.

## 10. Practice & games

Chapter → topic → type → difficulty practice flow, available chapter by
chapter as verified questions are written; "Miscellaneous" mixes all
available chapters; Games (Sandhi, Nāma, Dhātu) on the roadmap. Details:
`10-practice-and-games.md`.

## 11. Further modules (all on the roadmap)

Site-wide search, editable Wiki (successor to `public/hnv-wiki.html`),
optional reader accounts (My Notes, bookmarks, reading history, settings
sync), grammar tools (sandhi joiner/splitter, declension & conjugation
tables, dhātupāṭha), PWA/offline reading, Laghu & Bṛhat editions, /more
blog posts. Details: `11-future-modules.md`.

## 12. Non-functional requirements

| Area | Requirement |
|---|---|
| Speed | LCP < 2.0 s on 4G mobile for any reading page; TTFB of cached pages < 200 ms. |
| Freshness | Published edit visible on the live page within 60 s. |
| Availability | If the database is down, already-cached pages keep serving. A failed build never replaces a working deployment. |
| Data safety | Every content change is recoverable (revisions + Neon point-in-time restore + nightly logical backup). |
| Accessibility | WCAG 2.1 AA: keyboard reachable, visible focus, contrast, `lang` attributes on Sanskrit text. |
| Security | Admin behind auth; passwords hashed; CSRF-safe server actions; HTML sanitized on write; secrets only in env vars. |
| Cost | Runs on Neon Free + Vercel Hobby at current scale (`14-operations.md` §6). |

## 13. Open questions (answer before the phase that needs them)

1. Do Laghu/Bṛhat share sūtra numbering with Madhyama, or number
   independently? (Phase 10)
2. Should Subhāṣita have a browsable archive page? (Phase 6)
3. Do reader accounts need email/password, Google sign-in, or both? (Phase 9)
4. Who besides the owner gets admin accounts at launch? (Phase 2)
5. Kṛdanta range: the spreadsheet starts at 729 while the chapter range says
   728 — is sūtra 728 missing, or should the range read 729–913? (Phase 1
   data check; see `15-current-state.md`.)
