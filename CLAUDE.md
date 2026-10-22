# CLAUDE.md — read this before touching anything

This repo is the Harināmāmṛta-Vyākaraṇam (HNV) study platform. The full,
authoritative plan lives in **`docs/`**. This file is the short version that
must never be forgotten.

## Read order (every session)
1. `docs/README.md` — index, and how the docs are organised.
2. `docs/15-current-state.md` — what actually exists in code *right now* and
   known problems. Trust this over memory.
3. `docs/12-roadmap.md` — the phase being worked on and its acceptance
   criteria. Work on the current phase only unless the user says otherwise.
4. The module doc for whatever you are changing (05–11).
5. `docs/13-engineering-standards.md` before writing any code.

## Non-negotiable rules
1. **Neon Postgres is the single source of truth for all content.** Content
   is edited through the `/admin` dashboard. Once Phase 1 is done, no new
   content goes into `.xlsx` files, TS constants, or Google Docs.
   Neon project: `hnv-vyakaranam` (id `crimson-rice-97594890`, AWS
   Singapore). Branch `main` = production, branch `dev` = development.
2. **Never invent scripture or sūtra content.** Empty field → honest empty
   state. Practice questions must cite a real sūtra number from the source.
3. **Saṁjñā (sūtras 1–40) is not Sandhi.** Sandhi is sūtras 41–86:
   Sarveśvara (vowel, 41–60), Viṣṇujana (consonant, 61–78), Viṣṇusarga
   (visarga, 79–86).
4. **Spelling is "Anvaya"**, never "Anvyaya", in all new labels, columns and
   identifiers. Old `/anvyaya` URLs survive only as redirects.
5. **No Vedabase or other third-party links and no external credit
   paragraphs** on verse/sūtra content.
6. **Audio = links only.** Never upload or store audio files.
7. **Exactly two scriptures** for now: Śrīmad-Bhāgavatam and Bhagavad-gītā.
   The schema supports more; adding one needs a requirements change.
8. **Parity first.** Every URL that works today keeps working (directly or
   via a permanent redirect).
9. **Public pages are static/ISR.** A visitor's request never waits on a
   database query, except the first render of a not-yet-cached page.
10. **Mobile-first**, especially the Scriptures reader.
11. **Keep the owner's design and fonts** (`docs/16-design-system.md`). Add
    new elements inside it; never replace the palette or fonts unless the
    owner explicitly asks — show a preview first.
12. **Verse of the Day = scripture verses entered in the admin**, never
    sūtras. Don't add ślokas to the hero/subtitles; Amṛta's prayers live only
    in their own section (and on the admin sign-in page).

## Code rules that have already caused real bugs here
- A file without `"use client"` is a **Server Component**: no `onClick`,
  `onMouseEnter`, `useState`, `useEffect`, or browser APIs in it. Put
  interactivity in a small `"use client"` child, or use CSS (`:hover`).
- Anything importing `lib/db/*` starts with `import "server-only";` and is
  never imported from a client component.
- Validate every admin input with zod on the server.
- Secrets live only in `.env.local` (local) and Vercel env vars. Never commit
  them, never paste them into docs.
- Before saying work is done: `npm run typecheck && npm run lint && npm run
  build`, then smoke-test the routes you touched (`docs/13` §9).

## Git
- Always `git pull` before starting; the owner pushes design changes directly.
- Small, focused commits.
