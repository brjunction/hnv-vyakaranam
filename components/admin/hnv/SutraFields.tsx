import RichTextEditor from "@/components/admin/RichTextEditor";
import RichText from "@/components/RichText";
import { Field, inputCls } from "@/components/admin/ActionForm";

// The fields of one sūtra plus one rich-text editor per commentary kind.
// Used by the edit page and the "new sūtra" page.

type SutraValues = {
  number: string;
  subchapterId: number | null;
  sanskrit: string;
  transliteration: string;
  synonyms: string;
  vrtti: string;
  translation: string;
  status: string;
};

export function SutraFields({
  values,
  sections,
  coreLocked,
  numberHint,
}: {
  values: SutraValues;
  sections: { id: number; title: string }[];
  /** Contributors may only edit commentaries. */
  coreLocked: boolean;
  numberHint?: string;
}) {
  return (
    <fieldset disabled={coreLocked} className="grid gap-5 disabled:opacity-70">
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr_10rem]">
        <Field label="Number" hint={numberHint}>
          <input name="number" required defaultValue={values.number} className={`${inputCls} sutra-number`} />
        </Field>
        <Field label="Section">
          <select name="subchapterId" defaultValue={values.subchapterId ?? ""} className={inputCls} required>
            {sections.map((s, i) => (
              <option key={s.id} value={s.id}>
                {i + 1}. {s.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={values.status} className={inputCls}>
            <option value="published">Published</option>
            <option value="draft">Draft (hidden)</option>
            <option value="archived">Archived (hidden)</option>
          </select>
        </Field>
      </div>
      <Field label="Sūtra (Devanagari)" hint="Use “/” for a line break.">
        <textarea name="sanskrit" rows={2} defaultValue={values.sanskrit} className={`${inputCls} font-devanagari text-lg`} />
      </Field>
      <Field label="Transliteration (IAST)" hint="Stored exactly as typed. “/” = line break.">
        <textarea name="transliteration" rows={2} defaultValue={values.transliteration} className={`${inputCls} italic`} />
      </Field>
      {coreLocked ? (
        <>
          {(
            [
              ["Vṛtti", values.vrtti],
              ["Translation", values.translation],
              ["Synonyms", values.synonyms],
            ] as const
          ).map(([label, v]) => (
            <div key={label}>
              <span className="mb-1.5 block text-sm font-semibold">{label}</span>
              {v ? <RichText value={v} className="rounded-lg border border-[var(--border)] p-3" /> : <p className="text-sm text-[var(--fg-muted)]">—</p>}
            </div>
          ))}
        </>
      ) : (
        <>
          <div>
            <span className="mb-1.5 block text-sm font-semibold">Vṛtti</span>
            <RichTextEditor name="vrtti" defaultValue={values.vrtti} devanagari placeholder="Vṛtti…" />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-semibold">Translation</span>
            <RichTextEditor name="translation" defaultValue={values.translation} placeholder="Translation…" />
          </div>
          <details open={Boolean(values.synonyms)}>
            <summary className="cursor-pointer text-sm font-semibold">Synonyms (word for word)</summary>
            <div className="mt-2">
              <RichTextEditor name="synonyms" defaultValue={values.synonyms} minHeight={90} placeholder="Synonyms…" />
            </div>
          </details>
        </>
      )}
    </fieldset>
  );
}

export function CommentaryFields({
  types,
  entries,
  canPublish,
}: {
  types: { id: number; name: string; author: string; description: string; isVisible: boolean }[];
  entries: { commentaryTypeId: number; html: string; status: string }[];
  canPublish: boolean;
}) {
  if (types.length === 0) return null;
  return (
    <div className="grid gap-6">
      {types.map((t) => {
        const e = entries.find((x) => x.commentaryTypeId === t.id);
        return (
          <div key={t.id}>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">
                {t.name}
                {t.author && <span className="font-normal text-[var(--fg-muted)]"> · {t.author}</span>}
                {!t.isVisible && <span className="ml-2 text-xs font-normal text-[var(--fg-muted)]">(hidden on the site)</span>}
              </span>
              {canPublish ? (
                <select name={`cs_${t.id}`} defaultValue={e?.status ?? "published"} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs">
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              ) : (
                <span className="text-xs text-[var(--fg-muted)]">{e?.status === "published" ? "Published — your edit will be a draft" : "Draft"}</span>
              )}
            </div>
            <RichTextEditor name={`c_${t.id}`} defaultValue={e?.html ?? ""} placeholder={t.description || `${t.name}…`} />
          </div>
        );
      })}
    </div>
  );
}
