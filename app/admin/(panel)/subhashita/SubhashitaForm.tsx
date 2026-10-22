"use client";

import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { saveSubhashita } from "@/lib/actions/daily";

export type SubhashitaValues = {
  id?: number;
  sanskrit: string;
  iast: string;
  translation: string;
  source: string;
  status: "draft" | "published" | "archived";
};

export default function SubhashitaForm({ initial, canPublish }: { initial?: SubhashitaValues; canPublish: boolean }) {
  const v = initial ?? { sanskrit: "", iast: "", translation: "", source: "", status: "draft" as const };
  return (
    <ActionForm action={saveSubhashita} resetOnSuccess={!initial} className="space-y-4">
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <Field label="Sanskrit (Devanagari)" hint="Use / where a line should break.">
        <textarea name="sanskrit" required rows={3} defaultValue={v.sanskrit} className={`${inputCls} font-devanagari text-lg`} />
      </Field>
      <Field label="Transliteration (IAST)" hint="Shown exactly as typed.">
        <textarea name="iast" rows={3} defaultValue={v.iast} className={`${inputCls} italic`} />
      </Field>
      <Field label="Translation">
        <textarea name="translation" rows={3} defaultValue={v.translation} className={inputCls} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Source" hint="Book, chapter and verse, e.g. Hitopadeśa 1.42">
          <input name="source" defaultValue={v.source} className={inputCls} />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={v.status} className={inputCls}>
            <option value="draft">Draft — not shown</option>
            {canPublish && <option value="published">Published — in the daily pool</option>}
            <option value="archived">Archived</option>
          </select>
        </Field>
      </div>
      <SubmitButton>{v.id ? "Save changes" : "Add Subhāṣita"}</SubmitButton>
    </ActionForm>
  );
}
