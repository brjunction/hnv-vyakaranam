"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { moreItems, moreSections, revisions } from "@/lib/db/schema";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { revalidateMore } from "@/lib/actions/revalidate";
import { fail, ok, type ActionState } from "@/lib/actions/types";
import { sanitizeRich } from "@/lib/html/sanitize";

// Admin writes for the More page (editor and above). Logged in `revisions`;
// every write rebuilds /more.

const Id = z.coerce.number().int().positive();
const Plain = (n: number) => z.string().trim().max(n);
const Url = z
  .string()
  .trim()
  .max(2000)
  .refine((s) => !s || /^(https?:\/\/|\/)/.test(s), "Links must start with https:// (or / for a page on this site).");
const Slug = z
  .string()
  .trim()
  .max(80)
  .transform((s) => slugify(s))
  .refine((s) => !s || !["new", "edit"].includes(s), "That address is reserved.");

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}
const err = (e: z.ZodError) => fail(e.issues[0]?.message ?? "Check the form.");
async function log(user: SessionUser, table: string, id: number, action: "create" | "update" | "delete", before: unknown, after: unknown) {
  await getDb().insert(revisions).values({ entityTable: table, entityId: id, action, before, after, userId: user.id, note: "" });
}

// ------------------------------------------------------------ sections
const SectionInput = z.object({
  id: Id.optional(),
  title: Plain(120).min(1, "Give the section a title."),
  key: Slug,
  intro: Plain(600),
  kind: z.enum(["posts", "progress", "courses", "videos", "links"]),
  isVisible: z.boolean(),
});

export async function saveMoreSection(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const p = SectionInput.safeParse({
    id: str(form, "id") || undefined,
    title: str(form, "title"),
    key: str(form, "key"),
    intro: str(form, "intro"),
    kind: str(form, "kind") || "posts",
    isVisible: form.get("isVisible") === "on",
  });
  if (!p.success) return err(p.error);
  const { id, ...f } = p.data;
  const key = f.key || slugify(f.title) || "section";
  const db = getDb();
  const clash = await db
    .select({ id: moreSections.id })
    .from(moreSections)
    .where(id ? and(eq(moreSections.key, key), ne(moreSections.id, id)) : eq(moreSections.key, key))
    .limit(1);
  if (clash.length) return fail(`Another section already uses the address /more/${key}.`);
  if (id) {
    const [before] = await db.select().from(moreSections).where(eq(moreSections.id, id)).limit(1);
    if (!before) return fail("Not found.");
    await db.update(moreSections).set({ ...f, key, updatedBy: user.id }).where(eq(moreSections.id, id));
    await log(user, "more_sections", id, "update", before, { ...before, ...f, key });
    revalidateMore();
    return ok("Section saved.");
  }
  const all = await db.select({ sort: moreSections.sort }).from(moreSections);
  const [created] = await db
    .insert(moreSections)
    .values({ ...f, key, sort: Math.max(0, ...all.map((s) => s.sort)) + 10, updatedBy: user.id })
    .returning();
  await log(user, "more_sections", created.id, "create", null, created);
  revalidateMore();
  redirect(`/admin/more/${created.id}`);
}

export async function moveMoreSection(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const up = str(form, "dir") === "up";
  const db = getDb();
  const list = await db.select({ id: moreSections.id }).from(moreSections).orderBy(asc(moreSections.sort), asc(moreSections.id));
  const i = list.findIndex((x) => x.id === id);
  const j = up ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return ok("");
  [list[i], list[j]] = [list[j], list[i]];
  await db.batch(list.map((x, k) => db.update(moreSections).set({ sort: (k + 1) * 10 }).where(eq(moreSections.id, x.id))) as never);
  revalidateMore();
  return ok("Order saved.");
}

export async function deleteMoreSection(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const db = getDb();
  const [s] = await db.select().from(moreSections).where(eq(moreSections.id, id)).limit(1);
  if (!s) return fail("Not found.");
  await db.delete(moreSections).where(eq(moreSections.id, id)); // items cascade
  await log(user, "more_sections", id, "delete", s, null);
  revalidateMore();
  redirect("/admin/more");
}

// --------------------------------------------------------------- items
const ItemInput = z.object({
  id: Id.optional(),
  sectionId: Id,
  title: Plain(200).min(1, "Give it a title."),
  slug: Slug,
  subtitle: Plain(600),
  bodyHtml: z.string().max(400_000),
  url: Url,
  linkLabel: Plain(60),
  imageUrl: Url,
  person: Plain(200),
  badge: Plain(40),
  stage: z.enum(["", "done", "doing", "planned"]),
  date: z
    .string()
    .trim()
    .refine((s) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s), "Use a full date.")
    .transform((s) => s || null),
  pinned: z.boolean(),
  status: z.enum(["draft", "published", "archived"]),
});

export async function saveMoreItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const p = ItemInput.safeParse({
    id: str(form, "id") || undefined,
    sectionId: str(form, "sectionId"),
    title: str(form, "title"),
    slug: str(form, "slug"),
    subtitle: str(form, "subtitle"),
    bodyHtml: str(form, "bodyHtml"),
    url: str(form, "url"),
    linkLabel: str(form, "linkLabel"),
    imageUrl: str(form, "imageUrl"),
    person: str(form, "person"),
    badge: str(form, "badge"),
    stage: str(form, "stage"),
    date: str(form, "date"),
    pinned: form.get("pinned") === "on",
    status: str(form, "status") || "published",
  });
  if (!p.success) return err(p.error);
  const { id, ...f } = p.data;
  const db = getDb();
  const [sec] = await db.select().from(moreSections).where(eq(moreSections.id, f.sectionId)).limit(1);
  if (!sec) return fail("That section no longer exists.");
  const values = { ...f, bodyHtml: f.bodyHtml.trim() && f.bodyHtml !== "<p></p>" ? sanitizeRich(f.bodyHtml) : "" };

  // unique slug within the section
  const taken = new Set(
    (await db.select({ slug: moreItems.slug, id: moreItems.id }).from(moreItems).where(eq(moreItems.sectionId, f.sectionId)))
      .filter((r) => r.id !== id)
      .map((r) => r.slug)
  );
  const base = f.slug || slugify(f.title) || "item";
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

  if (id) {
    const [before] = await db.select().from(moreItems).where(eq(moreItems.id, id)).limit(1);
    if (!before) return fail("Not found.");
    await db.update(moreItems).set({ ...values, slug, updatedBy: user.id }).where(eq(moreItems.id, id));
    await log(user, "more_items", id, "update", before, { ...before, ...values, slug });
    revalidateMore();
    return ok(slug !== base && f.slug ? `Saved — the address was taken, so it is /${slug}.` : "Saved.");
  }
  const sorts = await db.select({ sort: moreItems.sort }).from(moreItems).where(eq(moreItems.sectionId, f.sectionId));
  const [created] = await db
    .insert(moreItems)
    .values({ ...values, slug, sort: Math.min(0, ...sorts.map((s) => s.sort)) - 10, updatedBy: user.id }) // new items go on top
    .returning();
  await log(user, "more_items", created.id, "create", null, created);
  revalidateMore();
  redirect(`/admin/more/${f.sectionId}?saved=${created.id}`);
}

export async function moveMoreItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const up = str(form, "dir") === "up";
  const db = getDb();
  const [it] = await db.select({ sectionId: moreItems.sectionId }).from(moreItems).where(eq(moreItems.id, id)).limit(1);
  if (!it) return fail("Not found.");
  const list = await db.select({ id: moreItems.id }).from(moreItems).where(eq(moreItems.sectionId, it.sectionId)).orderBy(asc(moreItems.sort), asc(moreItems.id));
  const i = list.findIndex((x) => x.id === id);
  const j = up ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return ok("");
  [list[i], list[j]] = [list[j], list[i]];
  await db.batch(list.map((x, k) => db.update(moreItems).set({ sort: (k + 1) * 10 }).where(eq(moreItems.id, x.id))) as never);
  revalidateMore();
  return ok("Order saved.");
}

/** Quick toggles from the list: pin / unpin, publish / unpublish. */
export async function flagMoreItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const what = z.enum(["pin", "unpin", "publish", "draft"]).parse(str(form, "what"));
  const db = getDb();
  const [before] = await db.select().from(moreItems).where(eq(moreItems.id, id)).limit(1);
  if (!before) return fail("Not found.");
  const patch =
    what === "pin" ? { pinned: true } : what === "unpin" ? { pinned: false } : what === "publish" ? { status: "published" as const } : { status: "draft" as const };
  await db.update(moreItems).set({ ...patch, updatedBy: user.id }).where(eq(moreItems.id, id));
  await log(user, "more_items", id, "update", before, { ...before, ...patch });
  revalidateMore();
  return ok({ pin: "Pinned to the top.", unpin: "Unpinned.", publish: "Published.", draft: "Hidden (draft)." }[what]);
}

export async function deleteMoreItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const db = getDb();
  const [it] = await db.select().from(moreItems).where(eq(moreItems.id, id)).limit(1);
  if (!it) return fail("Not found.");
  await db.delete(moreItems).where(eq(moreItems.id, id));
  await log(user, "more_items", id, "delete", it, null);
  revalidateMore();
  if (str(form, "back")) redirect(`/admin/more/${it.sectionId}`);
  return ok(`“${it.title}” deleted.`);
}
