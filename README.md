# Hari-nāmāmṛta Vyākaraṇa

Next.js 15 (App Router) + Tailwind CSS v4, TypeScript.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Where to add content

Sūtra content now lives in plain files, **not in code**. You never need to
touch a `.tsx` file to add or edit a sūtra.

### 1. The sūtras themselves — one Excel file per chapter

`content/chapters/<chapter-slug>.xlsx`

One file already exists for every chapter (e.g.
`content/chapters/samjna-sandhi-prakarana.xlsx`). Open it in Excel, Google
Sheets (upload it, or just open with "File → Open" after downloading), or
LibreOffice. Columns:

| S.No | Subchapter | Sutra Number | Sanskrit | Transliteration | Vrtti | Translation |
|------|------------|--------------|----------|------------------|-------|-------------|
| 1 | Sārvēśvara-sandhi | 1.1.1 | अइउण् | a i u Ṇ | ... | ... |

- **Subchapter** is free text — every distinct value automatically becomes a
  collapsible section on the chapter page, in the order it first appears.
  You don't need to register sections anywhere else.
- **Sutra Number** is whatever numbering you use (`1.1.1`, `42`, etc.) — it's
  also the anchor link (`/chapters/<slug>#1.1.1`) and the value used to match
  a sūtra to its notes in the Google Doc (see below).
- Row order within a subchapter = display order.
- Column order doesn't matter and header names are matched loosely
  (`Sutra Number`, `sutra_number`, `Number` all work) — but don't rename the
  columns to something unrecognizable.

**Workflow with Google Sheets:** keep a Google Sheet per chapter (or one
sheet with a tab per chapter), share it with yourself/editors, and whenever
you want to publish updates: `File → Download → Microsoft Excel (.xlsx)`,
then drop that file into `content/chapters/`, replacing the old one, and
redeploy. No code changes required.

### 2. Notes on a sūtra — **one Google Doc, live**

Unlike the sūtra text, notes are fetched **live from a Google Doc every time
the site checks for updates** — no download/re-upload step, no rebuild. You
just keep typing in the Doc.

**⭐ Paste your Google Doc link into `lib/config.ts` → `SUTRA_NOTES_DOC_URL`.
That's the only place you need to touch.**

Setup, one time:

1. Create a Google Doc. Share it: **Share → General access → "Anyone with
   the link" → Viewer.** (Required — the site can't fetch it otherwise.)
2. Copy its URL and paste it into `SUTRA_NOTES_DOC_URL` in `lib/config.ts`.

Then, for every sūtra you want to annotate, write in the doc:

```
<sutra 1.1.1 start>
Write anything here — bold, italic, colored text, bullet lists, tables,
pasted images, links — using the Doc's normal formatting toolbar. It is
rendered on the site exactly as it looks in the Doc: same fonts, same
colors, same alignment, same images.
<sutra 1.1.1 end>
```

Rules:
- `<sutra 1.1.1 start>` and `<sutra 1.1.1 end>` must each be on their own
  line/paragraph, with nothing else on that line.
- `1.1.1` must exactly match the **Sutra Number** column in that chapter's
  `.xlsx`.
- You can put these blocks anywhere in the doc, in any order, mixed with
  other content in between (anything outside a `<sutra ... start>` /
  `<sutra ... end>` pair is simply ignored) — one doc covers every chapter.
- The site re-checks the doc every `REVALIDATE_SECONDS` (default 300s = 5
  min, also editable in `lib/config.ts`). Edit the doc, wait, refresh the
  site.

### 3. Chapter titles/summaries (rarely changes)

`lib/content.ts` — a short static list (slug, chapter number, title, English
title, one-paragraph summary, sūtra range). Add an entry here (and a
matching blank `.xlsx` in `content/chapters/`) only when you're adding a
brand-new chapter.

### 4. Miscellaneous / blog page — **also one live Google Doc**

`/more` is driven by a second Google Doc, also just a link away in
`lib/config.ts` → `MISC_DOC_URL` (same "Anyone with the link → Viewer"
sharing requirement).

Structure — sections, each containing one or more cards ("extras"):

```
<section 1 start>
<extra 1 start>
title: "HNV Grammar Importance"
subtitle: "This is regarding the importance of Extra 1"
Image: "https://your-image-host.com/picture.jpg"
<extra 1 body start>
Write the card's body here with the Doc's normal formatting — bold,
colors, links, tables, pasted images — rendered exactly as it looks here.
<extra 1 body end>
<extra 1 end>

<extra 2 start>
title: "Another card"
<extra 2 body start>
...
<extra 2 body end>
<extra 2 end>
<section 1 end>

<section 2 start>
...
<section 2 end>
```

Rules:
- Every marker line (`<section N start>`, `<extra N start>`, `<extra N body
  start>`, and their `end` counterparts) must be its own paragraph with
  nothing else on it.
- `title:` / `subtitle:` / `Image:` are plain lines placed right after
  `<extra N start>`, before `<extra N body start>`. Quotes around the value
  are optional. `subtitle:` and `Image:` are optional; `title:` defaults to
  "Extra N" if omitted.
- `Image:` should be a direct, publicly reachable image URL (e.g. an image
  hosted on Imgur, your own site, or a published Google Drive image link) —
  not a Google Drive "share" link, which isn't a direct image URL.
- `N` in `<section N ...>` / `<extra N ...>` is just a label you choose
  (numbers, words, whatever) — it only needs to match between that block's
  own start/end pair.
- You can optionally give a section a title too: put a `title: "..."` line
  right after `<section N start>`, before the first `<extra ...>` marker.
  Otherwise it defaults to "Section N".

### 5. Other pages

- **Homepage copy** — `app/page.tsx`
- **About page** — `app/about/page.tsx` (currently a placeholder about the
  text itself — replace the two sections with your own write-up)

## How rich formatting is preserved

Both Google Docs are fetched as HTML (`.../export?format=html`), which
includes a stylesheet describing the doc's real colors, bold/italic, text
alignment, fonts, etc. That stylesheet is kept (not stripped down to plain
text) and scoped so it only affects the sūtra-notes/misc-page content on the
site — it can't leak out and restyle the rest of the site, and the rest of
the site's styling can't override it. Tables, inline images, links, and
nested formatting all come through as they appear in the Doc.

## How the chapter page works

Each chapter is a **single page** (`/chapters/<slug>`) with a toolbar at the
top:

- **Expand all subchapters / Collapse all** — every subchapter (section) is
  a collapsible block; all of them live on the same page, no separate pages
  per subchapter.
- **Show all sūtras / Hide all sūtras / Reset** — force every sūtra card
  open or closed at once, or go back to click-to-expand per card.
- **Notes: shown/hidden** — toggle whether the notes block (from the Google
  Doc) appears inside opened sūtra cards. A small "Notes" pill appears on
  any sūtra card that has a note, so you can see at a glance which ones are
  annotated.

Each sūtra card is independently click-to-expand (showing Sanskrit,
transliteration, vṛtti, translation, and notes), and has a stable `id`
anchor for deep-linking (e.g. `/chapters/akhyata-prakarana#1.1.1`).

## Structure

- Chapters (`lib/content.ts`) → Sections/Subchapters (auto-derived from the
  `Subchapter` column in each chapter's `.xlsx`) → Sūtras (from the same
  file, with optional live notes merged in from the sūtra-notes Google Doc)
- Dark/light mode toggle in the header (persisted via localStorage)
- `app/sitemap.ts` + `app/robots.ts` auto-generate for SEO
- `lib/googleDocs.ts` — shared "fetch + scope the stylesheet" logic
- `lib/sutraNotesDoc.ts` — splits the sūtra-notes doc by `<sutra ... start/end>`
- `lib/miscDoc.ts` — splits the Miscellaneous doc by
  `<section ...>` / `<extra ...>` / `<extra ... body ...>`

## Regenerating a blank template

`scripts/make_templates.py` (Python, needs `pip install openpyxl`) is what
generated the starter `.xlsx` files. Run it again if you ever want a fresh
blank template for a chapter — it's not part of the running site.

## Design tokens

Defined in `app/globals.css` under `@theme` and `:root`/`.dark`:
ink (`--color-ink`), parchment, gold, saffron, vermillion.
