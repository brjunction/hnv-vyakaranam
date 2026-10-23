import { CornerDownRight, Search, Wand2 } from "lucide-react";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { generateDivisions, goToReference, saveDivision } from "@/lib/actions/scriptures";

// Server-safe forms reused by the book page and the division page.

export function AddDivisionForm({ bookId, parentId, level }: { bookId: number; parentId: number | null; level: string }) {
  return (
    <ActionForm action={saveDivision} className="grid gap-3">
      <input type="hidden" name="bookId" value={bookId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <input type="hidden" name="status" value="published" />
      <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
        <Field label="Number">
          <input name="key" required placeholder="1" className={inputCls} />
        </Field>
        <Field label="Title (optional)">
          <input name="title" placeholder={`${level} title`} className={inputCls} />
        </Field>
      </div>
      <div>
        <SubmitButton>
          <CornerDownRight size={15} /> Add {level.toLowerCase()}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function GenerateForm({ bookId, parentId, level, suggestTo }: { bookId: number; parentId: number | null; level: string; suggestTo?: number | null }) {
  return (
    <ActionForm action={generateDivisions} className="grid gap-3">
      <input type="hidden" name="bookId" value={bookId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <input name="from" type="number" min={0} defaultValue={1} className={inputCls} />
        </Field>
        <Field label="To">
          <input name="to" type="number" min={0} defaultValue={suggestTo ?? ""} placeholder="18" className={inputCls} />
        </Field>
      </div>
      {parentId && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="setExpected" /> Also record this as the expected total
        </label>
      )}
      <div>
        <SubmitButton variant="ghost">
          <Wand2 size={15} /> Create {level.toLowerCase()}s
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function GoToForm({ bookId, placeholder }: { bookId: number; placeholder: string }) {
  return (
    <ActionForm action={goToReference} className="flex gap-2">
      <input type="hidden" name="bookId" value={bookId} />
      <div className="relative flex-1">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--a-fg-muted)]" />
        <input name="ref" required placeholder={placeholder} className={`${inputCls} pl-9`} aria-label="Go to" />
      </div>
      <SubmitButton variant="ghost">Go</SubmitButton>
    </ActionForm>
  );
}
