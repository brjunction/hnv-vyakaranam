import { Field, inputCls } from "@/components/admin/ActionForm";

type T = { chapterId: number; title: string; subtitle: string; sutraFrom: string | null; sutraTo: string | null; status: string };

export default function TopicFields({ t, chapters }: { t: T; chapters: { id: number; title: string; titleEn: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Chapter">
        <select name="chapterId" defaultValue={t.chapterId} className={inputCls}>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} — {c.titleEn}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Status" hint="Hidden topics don't appear in Practice.">
        <select name="status" defaultValue={t.status} className={inputCls}>
          <option value="published">Published</option>
          <option value="draft">Draft (hidden)</option>
          <option value="archived">Archived (hidden)</option>
        </select>
      </Field>
      <Field label="Title">
        <input name="title" required defaultValue={t.title} className={inputCls} placeholder="Sarveśvara-sandhi" />
      </Field>
      <Field label="Subtitle">
        <input name="subtitle" defaultValue={t.subtitle} className={inputCls} placeholder="Vowel Sandhi — sutras 41-60" />
      </Field>
      <Field label="From sūtra" hint="Text, e.g. M 41 or B 50 / M 41">
        <input name="sutraFrom" defaultValue={t.sutraFrom ?? ""} className={inputCls} />
      </Field>
      <Field label="To sūtra" hint="Text, e.g. M 60">
        <input name="sutraTo" defaultValue={t.sutraTo ?? ""} className={inputCls} />
      </Field>
    </div>
  );
}
