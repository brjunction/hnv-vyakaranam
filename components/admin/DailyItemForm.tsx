"use client";

import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { saveDailyItem } from "@/lib/actions/daily";

export type DailyItemValues = {
  id?: number;
  sanskrit: string;
  iast: string;
  translation: string;
  source: string;
  status: "draft" | "published" | "archived";
};

const COPY = {
  verse_of_day: {
    source: "Reference",
    sourceHint: "e.g. Bhagavad-gītā 2.47 or Śrīmad-Bhāgavatam 1.2.6",
    published: "Published — in the Verse of the Day rotation",
    add: "Add verse",
  },
  subhashita: {
    source: "Source",
    sourceHint: "e.g. Cāṇakya-nīti 2.13 or Hitopadeśa 1.42",
    published: "Published — in the Subhāṣita rotation",
    add: "Add Subhāṣita",
  },
} as const;

export default function DailyItemForm({
  pool,
  initial,
  canPublish,
}: {
  pool: "verse_of_day" | "subhashita";
  initial?: DailyItemValues;
  canPublish: boolean;
}) {
  const v = initial ?? { sanskrit: "", iast: "", translation: "", source: "", status: canPublish ? ("published" as const) : ("draft" as const) };
  const c = COPY[pool];
  return (
    <ActionForm action={saveDailyItem} resetOnSuccess={!initial} className="space-y-4">
      <input type="hidden" name="pool" value={pool} />
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <Field label="Sanskrit (Devanagari)" hint="Use / where a line should break.">
        <textarea name="sanskrit" required rows={4} defaultValue={v.sanskrit} className={`${inputCls} font-devanagari text-lg`} />
      </Field>
      <Field label="Transliteration (IAST)" hint="Shown exactly as typed. Use / for line breaks.">
        <textarea name="iast" rows={4} defaultValue={v.iast} className={`${inputCls} italic`} />
      </Field>
      <Field label="Translation">
        <textarea name="translation" rows={3} defaultValue={v.translation} className={inputCls} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={c.source} hint={c.sourceHint}>
          <input name="source" defaultValue={v.source} className={inputCls} />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={v.status} className={inputCls}>
            {canPublish && <option value="published">{c.published}</option>}
            <option value="draft">Draft — saved, not shown</option>
            <option value="archived">Archived — kept, not shown</option>
          </select>
        </Field>
      </div>
      {canPublish && (
        <div className="sm:w-1/2">
          <Field label="Also show it on a specific date (optional)" hint="Leave empty to let the automatic rotation decide.">
            <input name="scheduleOn" type="date" className={inputCls} />
          </Field>
        </div>
      )}
      <SubmitButton>{v.id ? "Save changes" : c.add}</SubmitButton>
    </ActionForm>
  );
}
