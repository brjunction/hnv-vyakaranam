# 10 — Practice & games

## 1. Current state (built, commit `4f73365`)

- `/practice`: chapter select (all 9 Madhyama chapters + "Miscellaneous";
  only Saṁjñā-sandhi-prakaraṇa unlocked) → topic → type (Sandhi /
  Sandhi-viccheda / both) → difficulty → quiz → results.
- Quiz: segmented progress, streak counter, colored feedback with the
  sūtra-cited explanation. Results: medal tier, best streak, CSV export,
  per-question review.
- Games row: Sandhi Games, Nāma Games, Dhātu Games — "Coming soon".
- Data: `lib/practiceData.ts` — 30 verified questions (v1–v12 vowel,
  c1–c7 consonant, s1–s11 visarga), each citing its sūtra.
- Files: `app/practice/{page,PracticeApp}.tsx`,
  `components/practice/{PracticeSetup,QuizRunner,Results}.tsx`.

## 2. Content rules (non-negotiable)

1. Every question cites ≥ 1 real sūtra number (`sutra_refs`), and the
   explanation states the rule in plain words with that number.
2. Saṁjñā (1–40) questions are terminology questions (pratyāhāras, names
   like sarveśvara, viṣṇujana, viṣṇusarga) — never mixed into Sandhi topics.
3. Distractors must be plausible mistakes (wrong rule applied, rule not
   applied, wrong vowel length), never nonsense strings.
4. Each option list has exactly one correct answer; options are distinct.
5. New questions start as `draft` and are published by an editor after
   checking against the HNV text.

## 3. Known data fix

`SANDHI_TOPICS` subtitle says "Vowel Sandhi — sutras 42-60", but the
chapter spreadsheet starts the Sarveśvara-sandhi subchapter at sūtra **41**.
Use **41–60** (the source text's grouping) when the topics move to the
database; check v-questions still cite 42+ correctly (they do: 42–52).

## 4. Moving the bank to Neon (Phase 7)

1. Seed `practice_topics` (`02-data-model.md` §3.5) and import the 30
   questions with their codes.
2. `lib/data/practice.ts → getPracticeBank()` returns chapters with
   availability (a chapter is unlocked when it has ≥ 1 published topic
   with ≥ 10 published questions), topics, and questions. Tag `practice`.
3. `/practice` stays a static page; the bank is passed as props to the
   client `PracticeApp` (≈ 1 kB per question; fine up to ~2,000 questions,
   after which load per chapter from `/api/practice/[chapter]`).
4. "Miscellaneous" = union of all unlocked chapters' topics (already how
   `MISC_CHAPTER` works).
5. Admin `/admin/practice`: topic CRUD; question editor with live preview,
   validation of rules §2.3–2.4, sūtra-ref autocomplete against `sutras`.
6. Delete `lib/practiceData.ts` once the DB version passes parity (same 30
   questions, same quiz flow).

## 5. Expansion plan per chapter

| Chapter | Question kinds |
|---|---|
| Saṁjñā (1–40) | identify term (sarveśvara / viṣṇujana …), pratyāhāra membership |
| Sandhi (41–86) | join, split (current), "which sūtra applies?" |
| Nāma (87–259) | form a case-ending (`rāma` + 6th plural), identify case/number of a form |
| Ākhyāta (260–618) | conjugate (root + lakāra + person + number), identify lakāra |
| Kāraka (619–727) | pick the kāraka/case for a role in a sentence |
| Kṛdanta (728–913) | form participle, identify kṛt suffix |
| Samāsa (914–1041) | identify compound type, dissolve a compound (vigraha) |
| Taddhita (1042–1278) | form the derivative, identify the suffix |

New question kinds extend `practice_questions.type` (text, no migration)
and add a renderer in `components/practice/kinds/<type>.tsx`. Multiple
choice stays the default renderer.

## 6. Games (each is its own small client app under `/practice/games/<slug>`)

| Game | Mechanic | Data |
|---|---|---|
| **Sandhi Match** | Drag the two halves onto the joined form; 8 pairs per round | Sandhi questions of type `sandhi` |
| **Sandhi Sprint** | 60 s timer, as many correct as possible; combo multiplier | all Sandhi questions |
| **Split It** | Tap where the word splits, then pick the original vowels | `viccheda` questions |
| **Nāma Grid** | Fill an 8×3 declension table for a stem; partial credit | generated from Nāma data once tables exist (Phase 10 tools) |
| **Dhātu Ladder** | Climb by conjugating correctly; a miss drops a rung | Ākhyāta data |

Shared game kit (`components/practice/games/kit/*`): timer, score, combo,
sound toggle (off by default), confetti (respects
`prefers-reduced-motion`), end screen reusing `Results` tiers.

## 7. Progress

- Phase 7: `localStorage` `hnv:practice:v1` — per-question last result and
  per-topic best score; "Resume" and "Practice my mistakes" modes.
- Phase 9: synced to the reader account when signed in (merge local →
  server on first sign-in).
