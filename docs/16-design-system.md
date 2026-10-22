# 16 — Design system (the owner's original design)

**Decision (2026-10-22, owner):** the site keeps the owner's own design —
parchment / gold / saffron / vermillion in light mode, deep forest green in
dark mode — and the owner's original fonts. A full redesign ("Śyāma &
Kuṅkuma", Cormorant/Ysabeau, and later Montserrat/Inter) was tried the same
day and **rejected**; do not reintroduce a new palette or new fonts without
the owner asking for it explicitly.

## 1. Fonts — exactly as the owner set them (`app/globals.css` `@theme`)

```css
--font-serif: "Tiro Devanagari Sanskrit", "Noto Serif Devanagari", Georgia, serif;  /* .font-devanagari */
--font-body:  "Inter", ui-sans-serif, system-ui, sans-serif;                          /* body */
```

No font files are downloaded (no @fontsource, no next/font): visitors see
Inter if installed, otherwise their system UI font; Devanagari falls back
to the system's Devanagari font. Headings use the body font
(`font-semibold`). Keep it that way.

## 2. Colors — owner's tokens (unchanged)

`--color-ink #0d1a16`, `--color-parchment #faf6ec`, `--color-parchment-dim
#f1ead6`, `--color-gold #c9a227`, `--color-gold-light #e8c766`,
`--color-saffron #d9622b`, `--color-vermillion #b3341a`; semantic `--bg`,
`--bg-2`, `--fg`, `--fg-muted`, `--accent` (gold), `--border`; `.dark`
overrides to forest green.

**Additive tokens** (appended at the end of globals.css, used by the admin
and new elements — they don't change any existing color): `--surface`,
`--accent-fg`, `--accent-soft`, `--border-strong`, `--fg-faint`,
`--success`, `--danger`, `--ring`, `--highlight`, `--shadow-lift`,
`--color-blue-light` and `--gradient-overlay` (the painting frame's
gradient referenced these but they were never defined).

`dark:` Tailwind utilities follow the site's theme toggle (`.dark` on
`<html>`) via `@custom-variant dark`.

## 3. Home page elements (inside the owner's layout)

Order: hero (+ link to Amṛta's first prayer, the site's motto verse
*svalpāyuṣāṁ kali-yuge 'tra…*) → painting → Amṛta's prayers (`#amrta`) →
**For today** (Verse of the Day + Subhāṣita, `components/home/DailyPanel`)
→ "finest treatise" → **Varṇa-krama board** (`components/home/VarnaBoard`)
→ **seven prakaraṇas** grid → Scriptures → Practice → Explore → websites.

Visual vocabulary to reuse for new elements: small saffron tracked label +
`font-semibold` heading, `anv-card` cards (gold top rule), `anv-hero-bg`
glow sections, `bg-[var(--bg-2)]` alternate bands, pill buttons
(`rounded-full`, gold fill or gold outline).

## 4. Rules

- The motto verse is Amṛta's first prayer (*svalpāyuṣāṁ…*), not sūtra 1.
- `.anv-card` sets `display:block` (unlayered CSS beats Tailwind's
  `flex`), so put `block` on child spans instead of relying on `flex-col`.
- One orchestrated motion per page at most (home: the board's ink-in).
