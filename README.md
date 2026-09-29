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
| 1 | Sārvēśvara-sandhi | 1 | अइउण् | a i u Ṇ | ... | ... |

- **Subchapter** is free text — every distinct value automatically becomes a
  collapsible section on the chapter page, in the order it first appears.
  You don't need to register sections anywhere else.
- **Sutra Number** is whatever numbering you use (`42`, `42`, etc.) — it's
  also the anchor link (`/chapters/<slug>#42`) and the value used to match
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
<sutra 42 start>
Write anything here — bold, italic, colored text, bullet lists, tables,
pasted images, links — using the Doc's normal formatting toolbar. It is
rendered on the site exactly as it looks in the Doc: same fonts, same
colors, same alignment, same images.
<sutra 42 end>
```

Rules:
- `<sutra 42 start>` and `<sutra 42 end>` must each be on their own
  line/paragraph, with nothing else on that line.
- `42` must exactly match the **Sutra Number** column in that chapter's
  `.xlsx`.
- You can put these blocks anywhere in the doc, in any order, mixed with
  other content in between (anything outside a `<sutra ... start>` /
  `<sutra ... end>` pair is simply ignored) — one doc covers every chapter.
- The doc is fetched **live on every page view — no caching at all.** Edit
  the doc, refresh the site, and the change is there. (Use the normal
  "Anyone with the link → Viewer" share link. Do **not** use File → "Publish
  to web": Google itself delays that version by about 5 minutes.)

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

### 6. Scripture Anvyayas (Śrīmad-Bhāgavatam, Bhagavad-gītā)

Data lives in Excel files — one folder per book:

```
content/anvyaya/sb/   sb-01.xlsx … sb-09.xlsx, sb-10-part-1 … sb-10-part-4, sb-11, sb-12
content/anvyaya/bg/   bg-01.xlsx … bg-18.xlsx
```

Columns (row 1 = header):

| S.N | Chapter No | Chapter Name | File Number | Verse No | IAST-Verse | Devanagari-Verse | Vedabase Link | Anvyaya | English Translation |
|---|---|---|---|---|---|---|---|---|---|

- **Verse No**: `1.12.1` for the Bhāgavatam (canto.chapter.verse), `18.6` for the
  Gītā (chapter.verse). Combined verses work too: `1.16-18`. **Keep the Verse No
  column formatted as Text** (the templates already are) — otherwise Excel turns
  `18.10` into `18.1`.
- **Vedabase Link** may be left empty: the site then builds it itself
  (`https://vedabase.io/en/library/sb/1/12/1/`).
- A file belongs to canto/chapter *N* if its name starts with `sb-N` / `bg-N`.
  You can add extra files for a canto (e.g. a 16th file) — they are merged
  automatically. Drop the files in the folder, push to GitHub, Vercel redeploys.
- **Line breaks in verses:** write `/` where a line should break, in IAST,
  Devanagari (and in the HNV sūtra/vṛtti columns too). `uddhava uvāca / tataḥ sa
  āgatya …` shows one line per part, with the `/` removed. A real line break
  typed inside the Excel cell (Alt+Enter) works as well.
- The Devanagari is hidden until a verse is clicked. The attribution (who wrote
  the anvyayas / translations) is set in `lib/anvyayaBooks.ts`.
- To add another book later, add one entry to `BOOKS` in `lib/anvyayaBooks.ts`
  and create `content/anvyaya/<dir>/` with its files.

Addresses (capital `/Anvyaya/…` and `sb`/`SB` both work):

| Address | Shows |
|---|---|
| `/anvyaya` | the books |
| `/anvyaya/SB` | Bhāgavatam — all 12 cantos |
| `/anvyaya/SB/1` | canto 1 — all chapters, expandable |
| `/anvyaya/SB/1/12` | canto 1 with chapter 12 opened |
| `/anvyaya/SB/1/12/1` | verse 1.12.1 |
| `/anvyaya/BG` · `/anvyaya/BG/18` · `/anvyaya/BG/18/6` | Gītā book · chapter · verse |

Chapters of a canto load on demand (a canto can hold thousands of verses), so
pages stay fast.

### 7. The website address

`site.config.json` (repo root) holds the site address — used by
`lib/site.ts` (page metadata), and by `scripts/generate-sitemap.mjs` (the
sitemap/robots.txt generator below). Change it in that **one** file if you
ever get a custom domain; both stay in sync automatically.

### 8. HNV-Wiki

`public/hnv-wiki.html` is a full, self-contained reference page (its own
`<html>`, styles and scripts — nothing external). It's served as-is at
`/hnv-wiki` (also `/HNV-Wiki`, `/wiki`), with a small "← Back to Homepage"
bar added at the very top so people can get back to the rest of the site —
nothing else in the file was changed.

To replace it with an updated version: drop the new file in as
`public/hnv-wiki.html`, re-open it and paste the same "← Back to Homepage"
bar back in near the top of `<body>` (or ask me and I'll do it for you).

## Sitemap & robots.txt — now fully static

`public/sitemap.xml` and `public/robots.txt` are **plain static files**,
regenerated automatically every time you run `npm run build` (the
`prebuild` script runs `scripts/generate-sitemap.mjs` first). This is
deliberate: the previous version generated them from a serverless function
(`app/sitemap.ts`/`app/robots.ts`), and if that function fails at request
time in production — even briefly, even just once — Google Search Console
reports exactly what you saw: "couldn't fetch" / "no sitemap found". A
static file under `/public` can't fail that way: it's served byte-for-byte
by Vercel's CDN, no code runs, nothing to 500.

The generator walks every `.xlsx` file (both `content/chapters/` and
`content/anvyaya/`) and lists:
- the homepage, `/chapters`, `/anvyaya`, `/hnv-wiki`, `/about`, `/more`
- every HNV chapter page
- every Anvyaya book, canto/chapter page, **and every individual verse
  page** — so once you fill in real verses, each one gets its own indexed,
  searchable URL automatically, with no extra step.

Run it by hand any time with `npm run sitemap`.

**Once deployed:** open `https://<your-site>/sitemap.xml` in a browser and
confirm it's real XML with real URLs (not an error page), then in Google
Search Console → Sitemaps, submit exactly `sitemap.xml`. If it still says
"couldn't fetch", it almost always means the deploy hasn't gone out yet, or
the URL in `site.config.json` doesn't match the address you're actually
using — check both.

### Making every sūtra and verse searchable

**Anvyaya verses are already there:** every SB/BG verse gets its own real
URL (`/anvyaya/SB/1/12/1`, etc.), its own page, its own entry in the
sitemap — Google can index each one individually as soon as there's real
data in the spreadsheets.

**HNV sūtras are not there yet.** Right now all the sūtras of a chapter live
on one page (`/chapters/<slug>`) as expandable cards with anchors like
`#42` — great for reading, but an anchor isn't a separate URL, so Google
can only index the *chapter*, not each sūtra on its own. Giving every sūtra
its own address (something like `/chapters/nama-prakarana/42`, mirroring
exactly how Anvyaya verses already work) would fix that — it's a
well-scoped follow-up, not done in this pass. Ask any time and I'll build
it the same way.

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
anchor for deep-linking (e.g. `/chapters/akhyata-prakarana#42`).

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
