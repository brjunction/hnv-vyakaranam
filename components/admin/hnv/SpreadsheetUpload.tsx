"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Upload } from "lucide-react";
import { uploadSpreadsheet, type UploadState } from "@/lib/actions/spreadsheet";
import { inputCls } from "@/components/admin/ActionForm";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-50"
    >
      <Upload size={16} /> {pending ? "Reading the sheet…" : "Upload"}
    </button>
  );
}

function List({ title, items, max = 40 }: { title: string; items: string[]; max?: number }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="font-semibold">
        {title} ({items.length})
      </p>
      <p className="text-sm text-[var(--fg-muted)] break-words">
        {items.slice(0, max).join(", ")}
        {items.length > max ? `, … and ${items.length - max} more` : ""}
      </p>
    </div>
  );
}

export default function SpreadsheetUpload({ edition }: { edition: string }) {
  const [state, action] = useActionState<UploadState, FormData>(uploadSpreadsheet, null);
  const r = state?.report;
  return (
    <div>
      <form action={action} className="grid gap-4">
        <input type="hidden" name="edition" value={edition} />
        <input type="file" name="file" required accept=".xlsx,.xls,.ods,.csv" className={inputCls} />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="apply" className="mt-1" />
          <span>
            <strong>Apply the changes.</strong> Leave unticked for a dry run that only shows what would change.
          </span>
        </label>
        <div>
          <Submit />
        </div>
      </form>

      {state && (
        <div
          role="status"
          className={`mt-6 rounded-xl border p-4 ${state.ok ? "border-[var(--success)]/40 bg-[var(--success)]/5" : "border-[var(--danger)]/40 bg-[var(--danger)]/5"}`}
        >
          <p className="mb-3 font-semibold">{state.message}</p>
          {r && (
            <div className="grid gap-3 text-sm">
              <p>
                {r.rows} rows read · {r.sutrasUpdated.length} sūtras {r.dryRun ? "would be" : ""} updated · {r.sutrasCreated.length} new ·{" "}
                {r.commentariesChanged} commentary changes · {r.unchanged} unchanged
              </p>
              {r.errors.length > 0 && (
                <ul className="list-disc pl-5 text-[var(--danger)]">
                  {r.errors.slice(0, 50).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                  {r.errors.length > 50 && <li>… and {r.errors.length - 50} more</li>}
                </ul>
              )}
              <List title="New sūtras" items={r.sutrasCreated} />
              <List title="Updated sūtras" items={r.sutrasUpdated} />
              <List title="New sections" items={r.sectionsCreated} />
              <List title="New chapters" items={r.chaptersCreated} />
              {r.chaptersUpdated > 0 && <p>{r.chaptersUpdated} chapter(s) updated from the Chapters sheet.</p>}
              {r.unknownColumns.length > 0 && (
                <p className="text-[var(--fg-muted)]">
                  Ignored columns: {r.unknownColumns.join(", ")}. (A column for a new commentary needs that commentary added in the admin first.)
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
