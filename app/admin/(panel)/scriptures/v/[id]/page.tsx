import { notFound } from "next/navigation";
import { CalendarHeart, Trash2 } from "lucide-react";
import { hasRole, requireUser } from "@/lib/auth/session";
import { getVerseAdmin } from "@/lib/data/scripturesAdmin";
import { addVerseToDaily, deleteVerse, publishDrafts } from "@/lib/actions/scriptures";
import { Panel } from "@/components/admin/ui";
import { Crumbs } from "@/components/admin/hnv/bits";
import { ActionForm, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import VerseEditor from "@/components/admin/scriptures/VerseEditor";
import { StatusPill } from "@/components/admin/scriptures/bits";

export const metadata = { title: "Edit verse" };
export const dynamic = "force-dynamic";

export default async function VersePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await requireUser("viewer");
  const { id } = await params;
  const { created } = await searchParams;
  const data = await getVerseAdmin(Number(id));
  if (!data) notFound();
  const { book, verse: v, ancestors, types, comm, audio, prev, next, index, total, tree } = data;
  const canEdit = hasRole(user, "editor");
  const drafts = comm.filter((c) => c.status === "draft").length;
  const lastDepth = book.levels.length - 1;
  const divisions = tree
    .filter((n) => n.depth === lastDepth || n.id === v.divisionId)
    .map((n) => ({ id: n.id, label: `${n.path.join(".")}${n.title ? ` — ${n.title}` : ""}` }));
  const path = ancestors.map((a) => a.key);
  const translation = types.find((t) => t.key === "translation" || /translation/i.test(t.name));

  return (
    <>
      <Crumbs
        items={[
          { label: "Scriptures", href: "/admin/scriptures" },
          { label: book.title, href: `/admin/scriptures/${book.code}` },
          ...ancestors.map((a) => ({ label: `${book.levels[a.depth] ?? ""} ${a.number}`, href: `/admin/scriptures/d/${a.id}` })),
          { label: `${book.verseLabel} ${v.key}` },
        ]}
      />
      <h1 className="mb-5 flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        {book.abbrev && <span className="text-[var(--a-fg-muted)]">{book.abbrev}</span>} {v.verseNo}
        <StatusPill status={v.status} />
      </h1>

      <VerseEditor
        book={{ code: book.code, abbrev: book.abbrev, title: book.title, verseLabel: book.verseLabel, verseLanguage: book.verseLanguage }}
        verse={{ id: v.id, key: v.key, verseNo: v.verseNo, devanagari: v.devanagari, iast: v.iast, speaker: v.speaker, language: v.language, status: v.status, dailyEligible: v.dailyEligible, divisionId: v.divisionId }}
        publicHref={`/scriptures/${book.code}/${[...path, v.key].join("/")}`}
        divisions={divisions}
        types={types}
        entries={comm.map((c) => ({ typeId: c.typeId, html: c.html, status: c.status }))}
        audio={audio}
        prev={prev}
        next={next}
        position={`${index + 1} / ${total}`}
        canEdit={canEdit}
        canWrite={hasRole(user, "contributor")}
        created={Boolean(created)}
      />

      {canEdit && (
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {drafts > 0 && (
            <Panel title="Drafts waiting" description={`${drafts} commentary draft${drafts === 1 ? "" : "s"} on this verse.`}>
              <ActionForm action={publishDrafts}>
                <input type="hidden" name="verseId" value={v.id} />
                <SubmitButton>Publish drafts</SubmitButton>
              </ActionForm>
            </Panel>
          )}
          <Panel title="Verse of the Day" description="Copy this verse (and a translation) into the Verse-of-the-Day list.">
            <ActionForm action={addVerseToDaily}>
              <input type="hidden" name="id" value={v.id} />
              <select name="typeId" defaultValue={translation?.id ?? ""} className={`${inputCls} mb-3`}>
                <option value="">Without translation</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    With “{t.name}”
                  </option>
                ))}
              </select>
              <SubmitButton variant="ghost">
                <CalendarHeart size={15} /> Add to Verse of the Day
              </SubmitButton>
            </ActionForm>
          </Panel>
          <Panel title={`Delete ${book.verseLabel.toLowerCase()} ${v.key}`}>
            <ActionForm action={deleteVerse} confirm={`Delete ${v.verseNo} with its commentaries?`}>
              <input type="hidden" name="id" value={v.id} />
              <label className="mb-3 flex items-start gap-2 text-sm">
                <input type="checkbox" name="closeGap" className="mt-1" /> Renumber the following (−1)
              </label>
              <SubmitButton variant="danger">
                <Trash2 size={15} /> Delete
              </SubmitButton>
            </ActionForm>
          </Panel>
        </div>
      )}
    </>
  );
}
