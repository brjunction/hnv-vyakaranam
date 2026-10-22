# 16 — Design system: "Śyāma & Kuṅkuma"

Introduced 2026-10-22 with the home redesign. Defined in `app/globals.css`.
**Components use semantic tokens only** (`--bg`, `--fg`, `--accent` …), so
light/dark and any future re-theme happen in one file.

## 1. Palette (raw)

| Name | Hex | Meaning / use |
|---|---|---|
| śyāma 900 | `#111a3a` | Kṛṣṇa's complexion. Hero and footer ground, dark-mode base, ink. |
| śyāma 950 | `#0b1129` | Deepest night (hero gradient end). |
| kuṅkuma | `#b42e2e` | Tilaka red. **Light-mode accent**: buttons, links, active nav. |
| haridrā | `#e8b04a` | Turmeric gold. **Dark-mode accent**, highlights, hero CTA, painting frame. |
| yamunā | `#2f58a8` / light `#7ea3e8` | Scriptures section, focus ring (light). |
| tulasī | `#2d7a55` / light `#6cc39a` | Practice section, success states. |
| śaṅkha | `#f5f5f1` | Conch white. Light-mode ground. |

## 2. Semantic tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#f5f5f1` | `#0e1531` | page |
| `--bg-2` | `#ebece9` | `#162042` | alternate section band |
| `--surface` | `#ffffff` | `#1a2549` | cards, panels, inputs |
| `--fg` / `--fg-muted` / `--fg-faint` | ink / `#535a72` / `#7a8098` | `#eef0f7` / `#a8b0cc` / `#7a84a8` | text |
| `--border` / `--border-strong` | `#d9dbe2` / `#b9bdca` | `#283358` / `#3a4775` | lines |
| `--accent` / `--accent-fg` | kuṅkuma / white | haridrā / śyāma | primary action; text placed ON accent |
| `--accent-soft` | 9 % kuṅkuma | 12 % haridrā | active/hover tint |
| `--highlight` | `#c8901f` | haridrā | gold details, ornaments |
| `--scripture` / `--practice` | yamunā / tulasī | light variants | section identity |
| `--success` / `--danger` | tulasī / kuṅkuma | light variants | feedback |
| `--ring` | yamunā | haridrā | focus outline |

Rules:
- Text on an accent background **always** uses `--accent-fg` (never a fixed
  color — the accent changes between themes).
- Hard-coded hex values are not allowed in components. Add a token.
- `.hero-night` is the one place a section is dark in both themes (hero,
  footer, admin sidebar, login panel). Inside it use `--hero-fg`,
  `--hero-muted`, `--hero-line`.
- Legacy names (`--color-saffron`, `--color-vermillion`, `--color-gold`,
  `--color-ink`) still exist and point into this palette so older pages keep
  working; new code uses semantic tokens.

## 3. Type

| Role | Face | Notes |
|---|---|---|
| Display: h1–h3, wordmark, numerals | **Cormorant** 500–700 (+500 italic) | `font-display`. High-contrast Garamond; large sizes only (≥ 1.25 rem). |
| Body & UI | **Ysabeau Office** 400–700 (+400 italic) | Same designer as Cormorant's Garamond lineage (Christian Thalmann); humanist sans, very legible. |
| Sanskrit (Devanagari) | **Tiro Devanagari Sanskrit** 400 (+italic) | `font-devanagari`. Designed for Sanskrit; full conjunct support. |

All three are self-hosted from `@fontsource/*` (imported in
`app/layout.tsx`; browsers download only the unicode ranges they need).

**Why these:** checked with fontTools on 2026-10-22 — they cover every IAST
character the content uses, including **ṁ** (Bhaktivedanta-style anusvāra),
ṝ, ḹ. Inter, Figtree, Hanken Grotesk, Instrument Sans, Manrope, IBM Plex Sans,
Newsreader and many others **miss** ṛ/ṃ/ḥ/ṭ etc. and must not be used for
text that may contain IAST. Before adding any font, run the coverage check
in `docs/13-engineering-standards.md` §11 (pitfalls) — or simply don't.

Type rules:
- Sentence case everywhere. No tracked all-caps labels in new UI
  (`.anv-label` was converted to sentence case).
- Sanskrit always carries `lang="sa-Deva"` (Devanagari) or `lang="sa-Latn"`
  (IAST); IAST is set in italic.
- Measure ≤ 75 characters for reading text.

## 4. Components & primitives

| Class / component | What |
|---|---|
| `.btn` + `.btn-primary` / `.btn-ghost` / `.btn-on-dark` | Pill buttons, min height 44 px. |
| `.hero-night` | Dark śyāma band with blue/red glows. |
| `.varna-tile`, `.varna-board`, `.varna-wide`, `.varna-ink` | Varṇa-krama board (home hero). The ink-in animation is the page's single orchestrated motion. |
| `.painting-frame` | Gilded frame around the Ṣaḍ-Gosvāmī painting. |
| `.daily-card` | Verse of the Day / Subhāṣita cards (colored top rule = section color). |
| `.anv-card`, `.anv-verse`, `.anv-pill`, `.anv-label`, `.anv-skeleton` | Shared cards/labels used by Scriptures, Practice, HNV. |
| `components/admin/ActionForm.tsx` | `ActionForm`, `SubmitButton`, `Field`, `inputCls` for every admin form. |
| `components/admin/ui.tsx` | `PageHeader`, `Panel`, `Stat`. |

## 5. Motion & accessibility

- One orchestrated motion per page at most (home: the board's ink-in).
  Everything else moves only in response to the reader.
- `prefers-reduced-motion: reduce` disables all animation (global rule).
- Visible focus: 2 px `--ring` outline on `:focus-visible`.
- Tap targets ≥ 44 px on touch layouts.
