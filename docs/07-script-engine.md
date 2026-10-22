# 07 — Script engine (Devanagari / IAST / Bengali / Odia)

## 1. What gets converted

Only **Sanskrit-language** content:

| Content | Language | Converted? |
|---|---|---|
| Sūtra `sanskrit`, `synonyms`, `vrtti` | Sanskrit | yes |
| Sūtra `transliteration` | Sanskrit (IAST, as typed) | shown as-is in IAST mode; never auto-generated |
| Sūtra `translation`, notes | English | **never** |
| Verse `devanagari`, `iast` | Sanskrit | yes / as-is |
| Custom fields | per `field_definitions.language` | only if `sanskrit` |
| Subhāṣita `sanskrit`, `iast` | Sanskrit | yes / as-is |
| UI labels, chapter titles in Latin | English/IAST labels | never |

## 2. Which text is shown for each script

For a Sanskrit field that has a Devanagari source `D` and (optionally) a
typed IAST twin `I` (sūtra `sanskrit`/`transliteration`, verse
`devanagari`/`iast`):

| Selected | Shown, in priority order |
|---|---|
| Devanagari | override(deva) → `D` → convert(`I`, iast→deva) |
| IAST | override(iast) → `I` as typed → convert(`D`, deva→iast) |
| Bengali | override(bengali) → convert(`D`, deva→bengali) → convert(`I`, iast→bengali) |
| Odia | override(odia) → convert(`D`, deva→oriya) → convert(`I`, iast→oriya) |

Fields with no twin (vṛtti, synonyms, Sanskrit custom fields) are stored in
Devanagari and converted the same way. Overrides come from
`script_overrides` (`02-data-model.md` §3.3).

When the sūtra card shows **both** a Sanskrit line and a transliteration
line, IAST mode shows only the IAST line once (no duplicate).

## 3. Library and normalisation

- `@indic-transliteration/sanscript` (scheme names: `devanagari`, `iast`,
  `bengali`, `oriya`).
- Before converting IAST, normalise: `ṁ → ṃ` (Bhaktivedanta-style anusvāra
  used throughout the sheets), NFC Unicode normalisation, collapse
  doubled spaces. Never write normalised text back to the database.
- `/` line-break markers are split **before** conversion (`splitLines`)
  and each line converted separately, so the marker can't be mangled.
- Avagraha `ऽ` and daṇḍas `। ॥` must survive every conversion — covered
  by unit tests (§6).

## 4. Rendering strategy (fast, no layout flash)

1. The static HTML contains **Devanagari and IAST** versions of each
   Sanskrit field (both already exist in the data — no conversion on the
   server). Each is wrapped:
   `<span data-s="deva" lang="sa-Deva">…</span><span data-s="iast" lang="sa-Latn">…</span>`.
2. CSS shows the one matching `<html data-script="…">`:
   `html[data-script="iast"] [data-s="deva"] { display: none }` etc.
3. An inline script in `<head>` (like today's theme script) reads the
   `hnv:script` value from `localStorage` and sets `data-script` before
   first paint → zero flash for Devanagari/IAST readers.
4. For **Bengali/Odia**, a client component `<ScriptRuntime>` lazy-loads
   sanscript (`await import(...)`) and fills `[data-s="beng"]` /
   `[data-s="orya"]` spans from the Devanagari source after hydration.
   Overrides for those scripts are embedded in the HTML (only rows that
   exist — small).
5. The switcher (`components/ScriptSwitcher.tsx`, client) updates
   `localStorage`, the `data-script` attribute, and triggers step 4 if
   needed. Lives in the header and in the reader toolbars.

SEO: search engines see Devanagari and IAST text in the HTML; both are real
content, correctly `lang`-tagged.

## 5. Fonts

| Script | Font | Loading |
|---|---|---|
| Devanagari | Noto Serif Devanagari (current `font-devanagari`) | `next/font`, preload |
| IAST | site Latin font (must include ā ī ū ṛ ṝ ḷ ṃ ḥ ṅ ñ ṭ ḍ ṇ ś ṣ) | preload |
| Bengali | Noto Serif Bengali | `next/font`, `preload: false` |
| Odia | Noto Sans Oriya | `next/font`, `preload: false` |

## 6. Tests (`lib/script/__tests__/convert.test.ts`, Vitest)

Golden cases, each converted to all four scripts and back where lossless:
`नारायणादुद्भूतोऽयं वर्णक्रमः` (sūtra 1, avagraha), `रामः + च` (visarga),
`कृष्णं नमामि` (anusvāra), `गोप्यत्र`, a full verse with `।` and `॥`, an
IAST string with `ṁ`. The test suite fails if any golden output changes.
