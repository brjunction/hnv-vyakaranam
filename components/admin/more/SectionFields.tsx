import { Field, inputCls } from "@/components/admin/ActionForm";
import { KIND_INFO, type MoreKind } from "@/lib/more/core";

// Section settings fields (shared by "Add section" and the section's settings).
export default function SectionFields({ s }: { s?: { title: string; key: string; intro: string; kind: MoreKind; isVisible: boolean } }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <input name="title" required defaultValue={s?.title} placeholder="e.g. Online courses" className={inputCls} />
        </Field>
        <Field label="Address" hint="/more/… — leave empty to make it from the title.">
          <input name="key" defaultValue={s?.key} placeholder="auto" className={`${inputCls} font-mono text-xs`} />
        </Field>
      </div>
      <Field label="Introduction" hint="One line under the section title (optional).">
        <input name="intro" defaultValue={s?.intro} className={inputCls} />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Type — decides the design</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(KIND_INFO) as MoreKind[]).map((k) => (
            <label key={k} className="flex cursor-pointer flex-col gap-0.5 rounded-lg border border-[var(--a-border)] p-3 text-sm has-[:checked]:border-[var(--a-primary)] has-[:checked]:bg-[var(--a-muted)]">
              <span className="flex items-center gap-2 font-medium">
                <input type="radio" name="kind" value={k} defaultChecked={(s?.kind ?? "posts") === k} className="accent-[var(--a-primary)]" />
                {KIND_INFO[k].label}
              </span>
              <span className="text-xs leading-snug text-[var(--a-fg-muted)]">{KIND_INFO[k].hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isVisible" defaultChecked={s?.isVisible ?? true} className="accent-[var(--a-primary)]" /> Show this section on the website
      </label>
    </div>
  );
}
