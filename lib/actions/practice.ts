"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { and, asc, count, desc, eq, gt, lt, max } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { practiceQuestions, practiceTopics, revisions } from "@/lib/db/schema";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { revalidatePractice } from "@/lib/actions/revalidate";
import { fail, ok, type ActionState } from "@/lib/actions/types";
import { slugifyTitle } from "@/lib/hnv/slug";

// Admin › Practice: topics and questions. Editors publish; contributors
// can add and edit questions as drafts. Every question must cite at least
// one sūtra reference, written as free text so all three editions can be
// cited ("B 15 / M 12 / L 9"); it is stored and shown exactly as typed.

const Id = z.coerce.number().int().positive();
const Status = z.enum(["draft", "published", "archived"]);
const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v : "";
};

async function log(user: SessionUser, table: string, id: number, action: "create" | "update" | "delete", before: unknown, after: unknown) {
  await getDb().insert(revisions).values({ entityTable: table, entityId: id, action, before, after, userId: user.id });
}

// ------------------------------------------------------------- topics ---
const TopicInput = z.object({
  id: Id.optional(),
  chapterId: Id,
  title: z.string().trim().min(1, "Give the topic a title.").max(160),
  subtitle: z.string().trim().max(240),
  sutraFrom: z.string().trim().max(60),
  sutraTo: z.string().trim().max(60),
  status: Status,
});

export async function saveTopic(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const p = TopicInput.safeParse({
    id: str(form, "id") || undefined,
    chapterId: str(form, "chapterId"),
    title: str(form, "title"),
    subtitle: str(form, "subtitle"),
    sutraFrom: str(form, "sutraFrom"),
    sutraTo: str(form, "sutraTo"),
    status: str(form, "status") || "published",
  });
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the form.");
  const { id, ...f } = p.data;
  const fields = { ...f, sutraFrom: f.sutraFrom || null, sutraTo: f.sutraTo || null };
  const db = getDb();
  if (id) {
    const [before] = await db.select().from(practiceTopics).where(eq(practiceTopics.id, id)).limit(1);
    if (!before) return fail("That topic no longer exists.");
    await db.update(practiceTopics).set(fields).where(eq(practiceTopics.id, id));
    await log(user, "practice_topics", id, "update", before, { ...before, ...fields });
    revalidatePractice();
    return ok("Topic saved.");
  }
  const taken = new Set((await db.select({ s: practiceTopics.slug }).from(practiceTopics).where(eq(practiceTopics.chapterId, fields.chapterId))).map((r) => r.s));
  let slug = slugifyTitle(fields.subtitle.split(/[—–-]/)[0] || fields.title);
  for (let i = 2; taken.has(slug); i++) slug = `${slugifyTitle(fields.title)}-${i}`;
  const [{ top }] = await db.select({ top: max(practiceTopics.sort) }).from(practiceTopics).where(eq(practiceTopics.chapterId, fields.chapterId));
  const [created] = await db.insert(practiceTopics).values({ ...fields, slug, sort: (top ?? 0) + 10 }).returning();
  await log(user, "practice_topics", created.id, "create", null, created);
  revalidatePractice();
  redirect(`/admin/practice/topics/${created.id}`);
}

export async function moveTopic(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const up = str(form, "dir") === "up";
  const db = getDb();
  const [t] = await db.select().from(practiceTopics).where(eq(practiceTopics.id, id)).limit(1);
  if (!t) return fail("That topic no longer exists.");
  const [o] = await db
    .select()
    .from(practiceTopics)
    .where(and(eq(practiceTopics.chapterId, t.chapterId), up ? lt(practiceTopics.sort, t.sort) : gt(practiceTopics.sort, t.sort)))
    .orderBy(up ? desc(practiceTopics.sort) : asc(practiceTopics.sort))
    .limit(1);
  if (!o) return ok("Already there.");
  await db.batch([
    db.update(practiceTopics).set({ sort: o.sort }).where(eq(practiceTopics.id, t.id)),
    db.update(practiceTopics).set({ sort: t.sort }).where(eq(practiceTopics.id, o.id)),
  ]);
  revalidatePractice();
  return ok("Moved.");
}

export async function deleteTopic(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const db = getDb();
  const [t] = await db.select().from(practiceTopics).where(eq(practiceTopics.id, id)).limit(1);
  if (!t) return fail("That topic no longer exists.");
  const qs = await db.select().from(practiceQuestions).where(eq(practiceQuestions.topicId, id));
  if (qs.length && str(form, "confirm").trim().toLowerCase() !== "delete") {
    return fail(`This topic has ${qs.length} questions. Type DELETE to remove the topic and its questions.`);
  }
  await db.batch([
    db.insert(revisions).values({ entityTable: "practice_topics", entityId: id, action: "delete", before: { ...t, questions: qs }, after: null, userId: user.id }),
    db.delete(practiceQuestions).where(eq(practiceQuestions.topicId, id)),
    db.delete(practiceTopics).where(eq(practiceTopics.id, id)),
  ]);
  revalidatePractice();
  redirect("/admin/practice");
}

// ---------------------------------------------------------- questions ---
const QuestionInput = z
  .object({
    id: Id.optional(),
    topicId: Id,
    difficulty: z.enum(["easy", "medium", "hard"]),
    type: z.enum(["sandhi", "viccheda"]),
    prompt: z.string().trim().min(1, "The question is required.").max(500),
    promptSub: z.string().trim().max(500),
    options: z
      .array(z.string().trim().max(300))
      .transform((a) => a.filter(Boolean))
      .pipe(z.array(z.string()).min(2, "Give at least two answer options.").max(8, "At most eight options.")),
    correct: z.coerce.number().int().min(0),
    explanation: z.string().trim().min(1, "Explain the answer (with its sūtra).").max(3000),
    sutraRefs: z
      .string()
      .transform((s) => s.split(/[,;\n]+/).map((x) => x.trim().replace(/\s+/g, " ")).filter(Boolean))
      .pipe(z.array(z.string().max(120, "A sūtra reference is too long.")).min(1, "Give the sūtra reference (e.g. B 15 / M 12).").max(10)),
    status: Status,
  })
  .refine((d) => new Set(d.options).size === d.options.length, { message: "Two options are the same." });

export async function saveQuestion(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("contributor");
  // Options arrive as option_0 … option_7; the correct one as its index among the non-empty ones.
  const raw = Array.from({ length: 8 }, (_, i) => str(form, `option_${i}`));
  const correctRaw = Number(str(form, "correct"));
  const correct = raw.slice(0, correctRaw).filter((o) => o.trim()).length;
  if (!raw[correctRaw]?.trim()) return fail("Mark which option is correct (it can't be empty).");
  const p = QuestionInput.safeParse({
    id: str(form, "id") || undefined,
    topicId: str(form, "topicId"),
    difficulty: str(form, "difficulty"),
    type: str(form, "type"),
    prompt: str(form, "prompt"),
    promptSub: str(form, "promptSub"),
    options: raw,
    correct,
    explanation: str(form, "explanation"),
    sutraRefs: str(form, "sutraRefs"),
    status: str(form, "status") || "published",
  });
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the form.");
  const { id, correct: correctIndex, ...f } = p.data;
  if (user.role === "contributor") f.status = "draft";

  const db = getDb();
  const fields = { ...f, correctIndex, updatedBy: user.id };
  if (id) {
    const [before] = await db.select().from(practiceQuestions).where(eq(practiceQuestions.id, id)).limit(1);
    if (!before) return fail("That question no longer exists.");
    await db.update(practiceQuestions).set(fields).where(eq(practiceQuestions.id, id));
    await log(user, "practice_questions", id, "update", before, { ...before, ...fields });
    revalidatePractice();
    return ok(user.role === "contributor" ? "Saved as a draft; an editor will publish it." : "Question saved.");
  }
  const [created] = await db
    .insert(practiceQuestions)
    .values({ ...fields, code: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })
    .returning();
  await db.update(practiceQuestions).set({ code: `q${created.id}` }).where(eq(practiceQuestions.id, created.id));
  await log(user, "practice_questions", created.id, "create", null, created);
  revalidatePractice();
  redirect(`/admin/practice/topics/${f.topicId}?added=${created.id}`);
}

export async function deleteQuestion(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("editor");
  const id = Id.parse(str(form, "id"));
  const db = getDb();
  const [q] = await db.select().from(practiceQuestions).where(eq(practiceQuestions.id, id)).limit(1);
  if (!q) return fail("That question no longer exists.");
  await db.batch([
    db.insert(revisions).values({ entityTable: "practice_questions", entityId: id, action: "delete", before: q, after: null, userId: user.id }),
    db.delete(practiceQuestions).where(eq(practiceQuestions.id, id)),
  ]);
  revalidatePractice();
  redirect(`/admin/practice/topics/${q.topicId}`);
}

/** Admin counts helper (used by the practice overview). */
export async function countQuestions(topicId: number): Promise<number> {
  await requireUser("viewer");
  const [{ n }] = await getDb().select({ n: count() }).from(practiceQuestions).where(eq(practiceQuestions.topicId, topicId));
  return n;
}
