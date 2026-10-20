// ---------------------------------------------------------------------------
// PASTE YOUR GOOGLE DOC LINKS HERE. This is the only file you need to edit
// to connect the site to your two live Google Docs.
// ---------------------------------------------------------------------------
//
// Before pasting a link, make sure the doc is shared so anyone with the link
// can view it: open the doc → Share → "General access" → "Anyone with the
// link" → Viewer. Without this, the site cannot fetch it.
//
// You can paste the normal edit-mode URL you get from the "Share" or address
// bar (e.g. "https://docs.google.com/document/d/1AbCdEfGhIjKlMnOp/edit") —
// the site extracts the document ID from it automatically. A bare document
// ID also works.
//
// The docs are fetched LIVE on every page view (no caching at all), so an
// edit you make in a Google Doc shows up the moment you refresh the site.
// Tip: use the normal "Anyone with the link → Viewer" share link. Do NOT use
// File → "Publish to web" — Google itself delays that version by ~5 minutes.

// Doc containing all sūtra notes, marked up as:
//   <sutra 42 start>
//   ...rich text notes for that sūtra, exactly as typed/formatted...
//   <sutra 42 end>
// One such block per sūtra, in any order, anywhere in the doc.
export const SUTRA_NOTES_DOC_URL = "https://docs.google.com/document/d/1tkp7nKYIxA1bCsWm_p8r-f2Z3tM4PKOJeNzQNVts8jA/edit?usp=sharing";

// Doc containing the Miscellaneous / blog page, marked up as:
//   <section 1 start>
//   <extra 1 start>
//   title: "..."
//   subtitle: "..."
//   Image: "https://..."
//   <extra 1 body start>
//   ...rich text body...
//   <extra 1 body end>
//   <extra 1 end>
//   <section 1 end>
// See content/GOOGLE_DOCS_FORMAT.md for the full format and an example.
export const MISC_DOC_URL = "https://docs.google.com/document/d/1nWsTb3LkTlypLki2czqjlxviC2njHuASctCtdMN43Oo/edit?usp=sharing";

