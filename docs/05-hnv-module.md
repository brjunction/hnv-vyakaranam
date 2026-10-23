# 05 — HNV module

## 1. URLs

| URL | Page | Rendering |
|---|---|---|
| `/chapters` | Table of contents, Madhyama | static |
| `/chapters/[slug]` | Chapter reader (all subchapters, all sūtras) | static, `generateStaticParams` (9) |
| `/chapters/[slug]/[sutra]` | **New:** single sūtra page | static, `generateStaticParams` (~1,290) |
| `/chapters/[slug]#[sutra]` | Anchor inside the chapter reader (kept) | — |
| `/[edition]/chapters/…` | Same pages for `laghu`, `brhat` once published | static |
| `/madhyama/chapters/:path*` | 308 → `/chapters/:path*` | redirect |

Sūtra numbers with dots (`0.1.3`) are valid URL segments as-is.
A request for a sūtra number that exists but belongs to another chapter
(e.g. `/chapters/nama-prakarana/42`) gets a 308 to the correct chapter.

## 2. Data functions (`lib/data/hnv.ts`)

| Function | Returns | Tags |
|---|---|---|
| `getEditions()` | published editions | `hnv` |
| `getChapters(edition)` | chapter list with counts (sūtras, with-vṛtti, with-notes) | `hnv` |
| `getChapterReader(edition, slug)` | chapter + subchapters + published sūtras + notes HTML + audio + overrides | `hnv:<ed>:ch:<slug>` |
| `getSutraPage(edition, number)` | one sūtra + its chapter/subchapter + prev/next numbers + notes + audio + overrides | `hnv:<ed>:su:<number>`, chapter tag |
| `getAllSutraParams(edition)` | `[ { slug, sutra } ]` for `generateStaticParams` and sitemaps | `hnv` |
| `getFieldDefinitions("sutra")` | visible custom fields in order | `hnv` |

The chapter reader for Ākhyāta (359 sūtras) is the largest page. Notes HTML
is included for every sūtra that has one, so the "Notes" toggle needs no
extra request. If a chapter page's HTML ever exceeds ~1.5 MB, notes move
to a per-chapter JSON file fetched on first toggle (documented threshold,
not needed at current sizes).

## 3. Chapter reader (keep current behaviour)

Existing components (`components/ChapterView.tsx`, `SutraCard.tsx`,
`VerseLines.tsx`) keep their behaviour; only their data source changes.

- Header: chapter number label, Sanskrit title, English title, summary,
  range label.
- Toolbar (sticky on scroll, wraps on mobile):
  - Expand all subchapters / Collapse all
  - Show all sūtras / Hide all / Reset
  - Notes: shown / hidden (preference stored in `localStorage`
    `hnv:notes-visible`, default shown)
  - **Go to sūtra** number input → scrolls to `#<number>` and opens it; if
    the number is in another chapter, navigates there.
  - Script switcher (Phase 5)
- Each subchapter is a collapsible section with its sūtra count.
- Each sūtra card: number pill, Sanskrit + transliteration lines; "Notes"
  pill if notes exist; expands to synonyms, vṛtti, translation, custom
  fields (in definition order, with labels), notes, audio links; and a
  "permalink" icon linking to `/chapters/<slug>/<number>`.
- **Empty states:** a field that is empty is *not shown* inside the card;
  if vṛtti **and** translation are both empty the expanded card shows one
  muted line: "Vṛtti and translation not yet added." Never placeholder
  text pretending to be content.
- Deep link `#42` opens and scrolls to sūtra 42 on load (`scroll-mt-24`
  for the sticky header — already present).

## 4. Sūtra page (new)

Layout (mobile first; centred column max-w-3xl on desktop):

1. Breadcrumbs: Chapters › <Chapter> › <Subchapter> › Sūtra 42
2. Large number badge; Sanskrit (Devanagari, large); transliteration
3. Sections in fixed order, each only if non-empty: Synonyms, Vṛtti,
   Translation, custom fields, Notes, Audio
4. Prev / Next sūtra (crosses chapter boundaries; disabled at 1 and the
   last), sticky at the bottom on mobile
5. "View in chapter" → `/chapters/<slug>#42`

Metadata: `07`/`09` docs — title `Sūtra 42 — <first words of
transliteration> | <Chapter title>`, description from translation → vṛtti
→ transliteration (first 155 chars), canonical to itself.

## 5. Sūtra Notes → commentaries (updated 2026-10-23, D-015)

Notes are now one commentary kind ("Notes") among any number per edition:
`commentary_types` + `sutra_commentaries.html`, rendered with
`components/RichText.tsx` inside `.rich-content`. The bullets below are the
original plan, kept for history.

- Stored in `sutra_notes.html` (sanitized).
- Rendered inside `<div class="prose-notes">`. A single stylesheet in
  `globals.css` defines `.prose-notes` typography (it replaces the scoped
  Google-Docs stylesheet once notes are imported).
- Notes are **English-language content**: never transliterated.
- Site-wide toggle as above; the toggle is a client component, the notes
  HTML is in the static page.

## 6. Editions

- `editions.is_published = false` hides an edition everywhere (nav, ToC,
  sitemap, `generateStaticParams`).
- Edition switcher appears in the ToC header only when more than one
  edition is published.
- Each edition's sūtras are fully independent (own numbering, own
  chapters). Open question about shared numbering: `00-requirements.md`
  §13.1.

## 7. Migration of the existing code

| Today | After Phase 1 |
|---|---|
| `lib/content.ts` (`getChapter`, xlsx reading) | `lib/data/hnv.ts` (Neon) — `lib/content.ts` deleted |
| `lib/sutraNotesDoc.ts` (live Google Doc on every request) | `sutra_notes` table — file deleted after Phase 2 import |
| `app/chapters/[slug]/page.tsx` `dynamic = "force-dynamic"` | static + `generateStaticParams`, `revalidate = false` |
| `Sutra` type in `lib/content.ts` | `type Sutra = typeof sutras.$inferSelect` re-exported from `lib/data/hnv.ts` as a plain serialisable shape (dates → ISO strings) |
