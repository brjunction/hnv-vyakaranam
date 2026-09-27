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
// How often the site re-checks the docs for changes is controlled by
// REVALIDATE_SECONDS below (default: 5 minutes). Edit a doc, wait that long
// (or redeploy / restart the dev server), and the site picks up the change —
// no code changes, no rebuild of any .xlsx file needed.

// Doc containing all sūtra notes, marked up as:
//   <sutra 1.1.1 start>
//   ...rich text notes for that sūtra, exactly as typed/formatted...
//   <sutra 1.1.1 end>
// One such block per sūtra, in any order, anywhere in the doc.
export const SUTRA_NOTES_DOC_URL = "";

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
export const MISC_DOC_URL = "";

export const REVALIDATE_SECONDS = 300;
