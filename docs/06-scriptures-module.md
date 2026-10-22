# 06 — Scriptures module

## 1. URLs and redirects

Canonical URLs use **lowercase** book codes:

| URL | Page | Rendering |
|---|---|---|
| `/scriptures` | The two books | static |
| `/scriptures/sb` | Bhāgavatam: 12 cantos | static |
| `/scriptures/sb/[canto]` | Canto: its chapters (list) | static (12) |
| `/scriptures/sb/[canto]/[chapter]` | Chapter reader: all verses | static (335) |
| `/scriptures/sb/[canto]/[chapter]/[verse]` | Single verse | **on-demand ISR** (~18k) |
| `/scriptures/bg` | Gītā: 18 chapters | static |
| `/scriptures/bg/[chapter]` | Chapter reader | static (18) |
| `/scriptures/bg/[chapter]/[verse]` | Single verse | static (~700) |
| `/scriptures/read` | Dual reader (two locations side by side) | static shell, client loads JSON |

Redirects (all **308 permanent**), in `next.config.ts` `redirects()` plus
`middleware.ts` for case normalisation:

| From | To |
|---|---|
| `/anvyaya`, `/Anvyaya`, `/ANVYAYA` | `/scriptures` |
| `/anvyaya/:book/:rest*` (any case) | `/scriptures/<lowercase book>/:rest*` |
| `/scriptures/SB/...`, `/scriptures/BG/...` | lowercase |
| `/api/anvyaya/:book/:division/:chapter` | `/api/scriptures/...` (kept working for one release, then removed) |
| verse given as a number inside a range, e.g. `/scriptures/sb/1/1/17` when the row is `16-18` | `/scriptures/sb/1/1/16-18` |

`middleware.ts` lowercases only the book segment and only under
`/scriptures` and `/anvyaya` — never other paths.

## 2. Data functions (`lib/data/scriptures.ts`)

| Function | Tags |
|---|---|
| `getBooks()` | `scr:sb`, `scr:bg` |
| `getBookOverview(code)` — cantos or chapters, with entered/expected counts | `scr:<code>` |
| `getCanto(code, canto)` — chapter list with verse counts | `scr:<code>` |
| `getChapterVerses(code, canto, chapter)` — all published verses of one chapter, field definitions, audio | `scr:<code>:<canto>:<chapter>` |
| `getVerse(code, canto, chapter, key)` — one verse + prev/next keys (crossing chapter and canto boundaries) | `scr:<code>:<canto>:<chapter>` |
| `getVerseParams(code)` — for `generateStaticParams` (BG) and sitemaps (both) | `scr:<code>` |
| `getChapterJson(...)` — same as `getChapterVerses`, for the dual reader | same |

The dual reader fetches `/api/scriptures/[book]/[canto]/[chapter]` (a
cached route handler, `revalidate = false`, tagged like the chapter page)
so it can switch locations without a page navigation.

## 3. Content rules

- Verse number displayed exactly as stored (`verse_no`).
- IAST shown by default; Devanagari collapsed behind "Show Devanagari"
  (per v6), remembered in `localStorage` `scr:show-deva`.
- Custom fields (Anvaya, English Translation, Word for word, Commentary…)
  appear in `field_definitions.sort` order; `is_commentary = true` fields
  go in the commentary pane.
- **Removed:** Vedabase links (`autoVedabaseLink`, the `vedabaseLink`
  field) and `CreditBox` credit paragraphs (rule 4). If attribution is
  needed it becomes a neutral one-line note authored in `books.description`
  by the owner — not a third-party link.
- Empty chapter → "Verses for this chapter haven't been added yet." Never
  generated text.

## 4. Reader — desktop (≥ 1024 px)

```
┌ Book ▾ │ Canto ▾ │ Chapter ▾ │ Verse ▾ │ [ jump: 1.12.1 ] │ Aa script ▾ │ ⇆ dual ┐
├───────────────────────────────┬────────────────────────────────────────────┤
│ VERSE PANE            [hide]  │ COMMENTARY PANE  [Anvaya|Translation|…] [hide] │
│ 1.12.1                        │                                            │
│ IAST lines                    │ selected field's text                      │
│ ▸ Show Devanagari             │                                            │
│ audio links                   │                                            │
├───────────────────────────────┴────────────────────────────────────────────┤
│ ← 1.11.39                                                     1.12.2 →    │
└────────────────────────────────────────────────────────────────────────────┘
```

- Panes are resizable (CSS `grid-template-columns` with a drag handle,
  default 50/50, stored in `localStorage`).
- Hiding one pane gives the other full width.
- Field switcher: segmented control when 2–4 fields, dropdown beyond 4.
  "All" option shows every field stacked.
- Keyboard: `←`/`→` prev/next verse, `j` focuses the jump box, `d`
  toggles Devanagari.
- **Jump box** accepts `1.12.1`, `1 12 1`, `12.1` (current canto), `18.6`
  (BG), `16-18`, and resolves ranges.
- **Dual reading** (`/scriptures/read?a=sb/1/12/1&b=bg/2/13`): two full
  readers side by side, each with its own selectors; URL updates with
  `router.replace` so a dual view can be shared.

## 5. Reader — mobile (< 1024 px)

```
┌ SB 1.12.1                         Aa  ⋮ ┐  ← compact top bar; selectors in a bottom sheet
├────────────────────────────────────────┤
│ ▾ Verse                                │  ← collapsible, ~50vh max when both open
│   IAST lines …                         │
│   ▸ Show Devanagari                    │
├────────────────────────────────────────┤
│ ▾ Anvaya | Translation | …             │  ← collapsible, scrolls internally
│   text …                               │
├────────────────────────────────────────┤
│  ←  Prev        1 / 39        Next  →  │  ← sticky bottom bar, safe-area padding
└────────────────────────────────────────┘
```

- Both panels open: each gets `max-height: 50dvh` with internal scroll.
  One collapsed: the other grows.
- Swipe left/right on the verse panel = next/prev (with a 60 px threshold
  and no conflict with horizontal text selection).
- Dual reading becomes two tabs ("A" / "B") at the top.
- Tap targets ≥ 44 px. Bottom bar respects `env(safe-area-inset-bottom)`.

## 6. Chapter reader (list of verses)

- All verses of the chapter, each a card (number, IAST first line,
  expand for everything) — the existing `DivisionView`/`VerseCard`
  behaviour, minus the on-demand API loading (each chapter is now its own
  static page, so loading on demand is no longer needed for speed;
  a canto page lists chapters and links to them).
- "Open in reader" on each card → the verse page.

## 7. Migration of existing code

| Today | After Phase 3 |
|---|---|
| `app/anvyaya/[book]/[[...rest]]/page.tsx` (one catch-all) | Separate route files under `app/scriptures/…` per level (clearer `generateStaticParams`) |
| `lib/anvyayaData.ts` (xlsx) | `lib/data/scriptures.ts` (Neon) |
| `lib/anvyayaBooks.ts` | `books`/`cantos` tables; a tiny `lib/scriptures/paths.ts` keeps `versePath()` |
| `lib/anvyayaTypes.ts` | Types inferred from schema in `lib/data/scriptures.ts` |
| `components/anvyaya/*` | `components/scriptures/*` (renamed; "Anvaya" spelling) |
| `/api/anvyaya/...` | `/api/scriptures/...` |
| Header nav "Scripture Anvyayas" → `/anvyaya` | "Scriptures" → `/scriptures` |
