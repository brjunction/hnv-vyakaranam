import Link from "next/link";
import { Plus } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { levelCountsByChapter, listTopicsAdmin, madhyamaChapters } from "@/lib/data/practiceAdmin";
import { moveTopic, saveTopic } from "@/lib/actions/practice";
import { PageHeader } from "@/components/admin/ui";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { MoveButtons, StatusBadge } from "@/components/admin/hnv/bits";
import { SectionIcon } from "@/components/practice/icons";
import { sectionFor, SECTIONS } from "@/lib/practice/sections";

export const metadata = { title: "Practice" };

const LEVELS = [
  ["easy", "Easy", "#4caf7d"],
  ["medium", "Medium", "var(--color-saffron)"],
  ["hard", "Hard", "var(--color-vermillion)"],
] as const;

export default async function PracticeAdmin() {
  const user = await requireUser("viewer");
  const [chapters, topics, levels] = await Promise.all([madhyamaChapters(), listTopicsAdmin(), levelCountsByChapter()]);
  const canEdit = hasRole(user, "editor");
  const total = topics.reduce((n, t) => n + t.published, 0);
  // Only real prakaraṇas (those with a practice section), in book order.
  const list = chapters.filter((c) => SECTIONS.some((s) => s.slug === c.slug));

  return (
    <>
      <PageHeader
        title="Practice"
        intro={`Each prakaraṇa has its own topics and its own kinds of question — Sandhi is not Nāma, and Nāma is not Ākhyāta. ${total} published questions in all. A prakaraṇa goes live on the site as soon as it has a published topic with published questions.`}
      />
      <p className="-mt-4 mb-6 text-sm">
        <a href="/practice" target="_blank" rel="noreferrer" className="underline">Open Practice on the site</a>
      </p>

      <div className="grid gap-5">
        {list.map((c) => {
          const sec = sectionFor(c.slug);
          const ts = topics.filter((t) => t.chapterId === c.id);
          const lv = levels.get(c.id) ?? {};
          const n = ts.reduce((a, t) => a + t.published, 0);
          return (
            <section key={c.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-2)]" style={{ borderTop: `4px solid ${sec.color}` }}>
              <header className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: sec.color }}>
                  <SectionIcon name={sec.icon} size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-devanagari text-xl leading-tight">{c.title}</h2>
                  <p className="text-sm text-[var(--fg-muted)]">{c.titleEn} · kinds: {sec.types.map((t) => t.label.split(" — ")[0]).join(" · ")}</p>
                </div>
                <div className="flex gap-2 text-xs">
                  {LEVELS.map(([k, label, col]) => (
                    <span key={k} className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 tabular-nums">
                      <b style={{ color: col }}>{lv[k] ?? 0}</b> {label}
                    </span>
                  ))}
                </div>
              </header>

              {ts.length === 0 ? (
                <p className="px-5 pb-4 text-sm text-[var(--fg-muted)]">No topics yet — {n === 0 ? "this prakaraṇa shows “Coming soon” on the site." : ""}</p>
              ) : (
                <ol className="divide-y divide-[var(--border)] border-t border-[var(--border)] px-4 sm:px-5">
                  {ts.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 py-3">
                      <Link href={`/admin/practice/topics/${t.id}`} className="group min-w-0 flex-1">
                        <span className="block font-devanagari text-lg group-hover:underline">{t.title}</span>
                        <span className="block text-sm text-[var(--fg-muted)]">
                          {t.subtitle ? `${t.subtitle} · ` : ""}
                          {t.published} published{t.total !== t.published ? ` · ${t.total - t.published} hidden/draft` : ""}
                        </span>
                      </Link>
                      <StatusBadge status={t.status} />
                      {canEdit && <MoveButtons action={moveTopic} id={t.id} />}
                    </li>
                  ))}
                </ol>
              )}

              {canEdit && (
                <details className="border-t border-[var(--border)] px-4 py-3 sm:px-5">
                  <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold" style={{ color: sec.color }}>
                    <Plus size={15} /> Add a topic to {sec.short}
                  </summary>
                  <ActionForm action={saveTopic} className="mt-4 grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="chapterId" value={c.id} />
                    <input type="hidden" name="status" value="published" />
                    <Field label="Title">
                      <input name="title" required className={inputCls} placeholder={c.slug === "nama-prakarana" ? "Sarveśvarānta-puruṣottama-liṅgaḥ" : "Topic title"} />
                    </Field>
                    <Field label="Subtitle">
                      <input name="subtitle" className={inputCls} placeholder="A short line under the title" />
                    </Field>
                    <Field label="From sūtra" hint="Text, e.g. M 41">
                      <input name="sutraFrom" className={inputCls} />
                    </Field>
                    <Field label="To sūtra" hint="Text, e.g. M 60">
                      <input name="sutraTo" className={inputCls} />
                    </Field>
                    <div className="sm:col-span-2">
                      <SubmitButton>Add topic</SubmitButton>
                    </div>
                  </ActionForm>
                </details>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
