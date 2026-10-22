# 04 — Admin dashboard (`/admin`)

Replaces v6's "protected links page." Everything an editor does happens
here; nobody edits the database by hand.

## 1. Routes

| Route | Purpose | Min. role |
|---|---|---|
| `/admin/login` | Email + password | — |
| `/admin` | Dashboard: recent edits, drafts awaiting publish, content gaps (e.g. "Ākhyāta: 359 sūtras without vṛtti") | contributor |
| `/admin/hnv` | Editions → chapters list | contributor |
| `/admin/hnv/[edition]/[chapter]` | Chapter meta, subchapters (reorder), sūtra table | contributor |
| `/admin/hnv/[edition]/sutra/[number]` | Edit one sūtra: all fields, custom fields, notes, audio, script overrides, daily-eligible | contributor |
| `/admin/scriptures/[book]` | Cantos / chapters | contributor |
| `/admin/scriptures/[book]/[canto]/[chapter]` | Verse table | contributor |
| `/admin/scriptures/verse/[id]` | Edit one verse | contributor |
| `/admin/fields` | Custom field definitions (sūtra / verse, per book) | editor |
| `/admin/home` | Home blocks (order, visibility), Subhāṣita pool, daily pins | editor |
| `/admin/posts` | `/more` posts | editor |
| `/admin/practice` | Topics & questions | editor |
| `/admin/import` | XLSX/CSV import with preview & diff | editor |
| `/admin/export` | Exports (`03-content-pipeline.md` §5) | editor |
| `/admin/tools` | Notes import from Google Doc; verify-db; cache revalidation | owner |
| `/admin/publishing` | "Rebuild site now", last build status, sitemap status, external sources index | editor |
| `/admin/history` | All revisions, filter by user/entity, restore | editor |
| `/admin/users` | Users, roles, deactivate, force logout | owner |
| `/admin/settings` | `site_settings` | owner |

All admin routes: `export const dynamic = "force-dynamic"`, `robots:
noindex`, excluded from sitemaps, `X-Frame-Options: DENY`.

## 2. Authentication

Own implementation, deliberately small (no third-party auth beta packages):

- **Passwords:** `bcryptjs`, cost 12. Minimum 12 characters.
- **Session:** a JWT signed with `AUTH_SECRET` (HS256, `jose`), stored in an
  `httpOnly`, `Secure`, `SameSite=Lax`, `Path=/` cookie named `hnv_admin`,
  valid 7 days, refreshed when < 2 days remain. Payload:
  `{ sub: userId, role, sv: sessionVersion }`.
- **Validation per request:** `lib/auth/session.ts → requireUser(minRole)`
  verifies the JWT, loads the user (cached per request with React `cache()`),
  rejects if inactive or `sv !== session_version`, and checks the role.
  **Every server action and every admin page calls it.**
- **Middleware** (`middleware.ts`, matcher `/admin/:path*`) only checks
  that the cookie exists and verifies its signature (edge-safe `jose`), then
  redirects to `/admin/login?next=…` if not. It is a UX fast-path, not the
  security boundary.
- **Rate limiting:** `login_attempts`; 5 failures per email in 15 minutes →
  locked 15 minutes. Same generic error for wrong email and wrong password.
- **Logout:** clears the cookie. "Log out everywhere" bumps
  `session_version`.
- **First owner:** `npx tsx scripts/db/create-owner.ts --email … --name …`
  prompts for the password (never on the command line) and inserts the
  first `owner`. There is no public sign-up.

## 3. Roles

| Action | contributor | editor | owner |
|---|---|---|---|
| Create/edit drafts | ✓ | ✓ | ✓ |
| Publish / unpublish | — | ✓ | ✓ |
| Delete (soft: `archived`) | — | ✓ | ✓ |
| Hard delete | — | — | ✓ |
| Import / export | — | ✓ | ✓ |
| Custom fields, home, posts, practice | — | ✓ | ✓ |
| Restore a revision | — | ✓ | ✓ |
| Users, settings, tools | — | — | ✓ |

## 4. Server action pattern (every write looks like this)

```ts
// lib/actions/sutras.ts
"use server";
import "server-only";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sutras, revisions } from "@/lib/db/schema";
import { revalidateForSutra } from "@/lib/actions/revalidate";
import { eq } from "drizzle-orm";

const SutraInput = z.object({
  id: z.number().int().positive(),
  sanskrit: z.string().max(5000),
  transliteration: z.string().max(5000),
  synonyms: z.string().max(20000),
  vrtti: z.string().max(50000),
  translation: z.string().max(50000),
  extra: z.record(z.string(), z.string().max(50000)),
  status: z.enum(["draft", "published", "archived"]),
  dailyEligible: z.boolean(),
});

export async function updateSutra(raw: unknown): Promise<ActionResult> {
  const user = await requireUser("contributor");
  const input = SutraInput.safeParse(raw);
  if (!input.success) return { ok: false, error: z.prettifyError(input.error) };
  if (input.data.status === "published" && user.role === "contributor")
    return { ok: false, error: "Contributors cannot publish." };

  const before = await db.query.sutras.findFirst({ where: eq(sutras.id, input.data.id) });
  if (!before) return { ok: false, error: "Sūtra not found." };
  await assertExtraKeysExist("sutra", null, input.data.extra);

  const { id, ...fields } = input.data;
  const afterSnapshot = { ...before, ...fields, updatedBy: user.id };
  // One HTTP round-trip, one transaction: the change and its revision
  // either both happen or neither does.
  const [[after]] = await db.batch([
    db.update(sutras).set({ ...fields, updatedBy: user.id }).where(eq(sutras.id, id)).returning(),
    db.insert(revisions).values({
      entityTable: "sutras", entityId: id, action: "update",
      before, after: afterSnapshot, userId: user.id,
    }),
  ]);
  await revalidateForSutra(after);
  return { ok: true };
}
```

Rules:
1. `requireUser()` first, always.
2. zod `safeParse` on the raw input; never trust client types.
3. Read `before`, write change + revision together (`db.batch`).
4. Revalidate through the helper for that entity.
5. Return `{ ok: true } | { ok: false, error }` — never throw to the client
   for expected failures.

`ActionResult` and `assertExtraKeysExist` live in `lib/actions/common.ts`.

## 5. Editing UX

- **Sūtra table:** sortable by position; columns: number, subchapter,
  Sanskrit (first line), status, has-vṛtti, has-translation, has-note.
  Filters: "missing vṛtti", "missing translation", "draft", "has note".
- **Sūtra editor:** two columns on desktop (fields | live preview using the
  real public `SutraCard` component), stacked on mobile. `/` line-break
  hint shown under Sanskrit fields. Unsaved-changes guard on navigation.
  Keyboard: `Ctrl/⌘+S` save, `Ctrl/⌘+Enter` save & next.
- **Reorder:** drag handles (dnd-kit) on subchapters and sūtras; saving
  rewrites `position` in steps of 10.
- **Autosave drafts:** none in v1 — explicit Save avoids accidental
  publishes. The unsaved guard protects work.
- **Optimistic UI:** no; show a spinner, then the server's result.

## 6. Rich text (notes, home blocks, posts)

- Editor: **Tiptap** (StarterKit + Link + TextAlign + Color + TextStyle +
  Table + Image-by-URL). No file uploads (images are URLs).
- Saved as HTML, then **sanitized on the server** with `sanitize-html`:
  - allowed tags: `p, br, strong, b, em, i, u, s, sup, sub, span, a, ul,
    ol, li, blockquote, h2, h3, h4, table, thead, tbody, tr, th, td, img,
    hr, code, pre`
  - allowed attributes: `a[href, title, target, rel]`,
    `img[src, alt, width, height]`, `span|p|td|th[style]`,
    `td|th[colspan, rowspan]`
  - allowed styles: `color`, `background-color`, `text-align`,
    `font-weight`, `font-style`, `text-decoration`, `font-size` (px/em only)
  - URL schemes: `https`, `mailto`; `a` gets `rel="noopener noreferrer"`
- The public site renders the stored HTML inside `.prose-notes` with
  `dangerouslySetInnerHTML` — safe because it was sanitized on write.

## 7. Import & export UI

1. Upload XLSX/CSV, choose target (HNV chapter / scripture canto or chapter
   / practice topic).
2. Server parses (same mapping as `03-content-pipeline.md` §2.3) and shows a
   **diff preview**: new rows, changed rows (field-level before/after),
   unchanged count, rows with errors (with reasons), unknown columns (offer
   "create custom field").
3. Commit applies upserts in batches of 200, writes revisions with
   `action = 'import'`, then revalidates the affected tags once at the end.
4. Import never deletes.

File limits: 10 MB, 20,000 rows. Parsing runs in a server action (Node
runtime, `xlsx` already a dependency).

## 8. Publishing page

- **Rebuild site now** → server action POSTs `VERCEL_DEPLOY_HOOK_URL`. The
  page says: "A new build has started. It usually takes 3–6 minutes. Pages
  stay live during the build." It then polls a small status endpoint
  (`/api/admin/build-status`, which reads the latest deployment state from
  the Vercel API using a read-only `VERCEL_API_TOKEN` — optional; if the
  token isn't set, the page shows only the "started" message).
- **Revalidate everything** (owner): calls `revalidateTag("hnv")`,
  `"scr:sb"`, `"scr:bg"`, `"home"`, … — instant refresh without a rebuild.
- **Sitemap status:** URL count per sitemap file from the last build
  (written to `public/sitemaps/manifest.json` at build time).
- **External sources index:** a table of any external docs/sheets still
  referenced (only the Notes doc until its final import), with plain labels
  — the successor of v6 §9.1.
