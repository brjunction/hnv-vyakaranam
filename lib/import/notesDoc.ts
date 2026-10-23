import "server-only";
import { and, eq } from "drizzle-orm";
import { parse, HTMLElement } from "node-html-parser";
import { getDb } from "@/lib/db";
import { commentaryTypes, editions, revisions, sutraCommentaries, sutras } from "@/lib/db/schema";
import { getSutraNotes } from "@/lib/sutraNotesDoc";
import { sanitizeRich } from "@/lib/html/sanitize";

// One-time import of the old sūtra-notes Google Doc into the "Notes"
// commentary (Madhyama). Google's export styles text with classes (".c3");
// those rules are copied onto each element as inline styles first, so the
// colours/bold/alignment survive. Never overwrites a note already in the
// database (admin edits win).

function classRules(css: string, scopeClass: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = new RegExp(`\\.${scopeClass}\\s+\\.([\\w-]+)\\{([^}]*)\\}`, "g");
  for (const m of css.matchAll(re)) map.set(m[1], (map.get(m[1]) ?? "") + m[2] + ";");
  return map;
}

function inlineStyles(html: string, rules: Map<string, string>): string {
  const root = parse(`<div>${html}</div>`);
  for (const el of root.querySelectorAll("*") as HTMLElement[]) {
    const cls = el.getAttribute("class");
    if (!cls) continue;
    const decl = cls
      .split(/\s+/)
      .map((c) => rules.get(c) ?? "")
      .join("");
    el.removeAttribute("class");
    const own = el.getAttribute("style") ?? "";
    if (decl || own) el.setAttribute("style", `${decl}${own}`);
  }
  return root.firstChild ? (root.firstChild as HTMLElement).innerHTML : "";
}

export type NotesImportReport = { found: number; imported: number; skipped: string[] };

export async function importNotesFromGoogleDoc(userId: number): Promise<NotesImportReport> {
  const db = getDb();
  const notes = await getSutraNotes();
  const rules = classRules(notes.styleCss, notes.scopeClass);

  const [ed] = await db.select().from(editions).where(eq(editions.slug, "madhyama")).limit(1);
  if (!ed) throw new Error("The Madhyama edition is missing.");
  let [type] = await db
    .select()
    .from(commentaryTypes)
    .where(and(eq(commentaryTypes.editionId, ed.id), eq(commentaryTypes.key, "notes")))
    .limit(1);
  if (!type) {
    [type] = await db
      .insert(commentaryTypes)
      .values({ editionId: ed.id, key: "notes", name: "Notes", sort: 10, updatedBy: userId })
      .returning();
  }

  const report: NotesImportReport = { found: notes.html.size, imported: 0, skipped: [] };
  for (const [number, raw] of notes.html) {
    const html = sanitizeRich(inlineStyles(raw, rules));
    const [s] = await db
      .select({ id: sutras.id })
      .from(sutras)
      .where(and(eq(sutras.editionId, ed.id), eq(sutras.number, number)))
      .limit(1);
    if (!s || !html) {
      report.skipped.push(number);
      continue;
    }
    const [row] = await db
      .insert(sutraCommentaries)
      .values({ sutraId: s.id, commentaryTypeId: type.id, html, updatedBy: userId })
      .onConflictDoNothing()
      .returning();
    if (row) {
      report.imported++;
      await db.insert(revisions).values({
        entityTable: "sutra_commentaries",
        entityId: row.id,
        action: "import",
        after: row,
        userId,
        note: "Imported from the sūtra-notes Google Doc",
      });
    } else report.skipped.push(number);
  }
  return report;
}
