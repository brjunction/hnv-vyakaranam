"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { VerseLinesIn } from "@/components/scriptures/ScriptText";
import { ScriptPicker } from "@/components/scriptures/Panes";
import { useReaderPrefs } from "@/components/scriptures/prefs";

// A searchable list (dhātus, avyayas): search in IAST, plain letters or
// English; the Sanskrit follows the chosen script.

export type Col = { key: string; label: string; sa?: boolean; width?: string };
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function WordList({ rows, cols, filters }: { rows: Record<string, string | number>[]; cols: Col[]; filters?: { key: string; label: string; options: { value: string; label: string }[] }[] }) {
  const [prefs, setPrefs] = useReaderPrefs();
  const [q, setQ] = useState("");
  const [f, setF] = useState<Record<string, string>>({});
  const [limit, setLimit] = useState(200);
  const shown = useMemo(() => {
    const k = fold(q.trim());
    return rows.filter((r) => (!k || cols.some((c) => fold(String(r[c.key] ?? "")).includes(k))) && Object.entries(f).every(([key, v]) => !v || String(r[key]) === v));
  }, [rows, cols, q, f]);
  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/92 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
        <label className="ui-trigger min-w-[14rem] flex-1 !pr-3">
          <Search size={15} className="shrink-0 text-[var(--fg-muted)]" />
          <input value={q} onChange={(e) => (setQ(e.target.value), setLimit(200))} placeholder="Search — Sanskrit (with or without diacritics) or English" className="dict-noring min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        {filters?.map((fl) => (
          <select key={fl.key} value={f[fl.key] ?? ""} onChange={(e) => setF({ ...f, [fl.key]: e.target.value })} className="ui-btn" aria-label={fl.label}>
            <option value="">{fl.label}: all</option>
            {fl.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
        <ScriptPicker prefs={prefs} setPrefs={setPrefs} />
        <span className="text-xs text-[var(--fg-muted)]">{shown.length.toLocaleString()} found</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-2)] text-left text-xs uppercase tracking-wider text-[var(--fg-muted)]">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className="px-3 py-2.5 font-semibold" style={{ width: c.width }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, limit).map((r, i) => (
              <tr key={i} className="border-t border-[var(--border)] align-top hover:bg-[var(--bg-2)]">
                {cols.map((c) => (
                  <td key={c.key} className="px-3 py-2">
                    {c.sa ? <VerseLinesIn devanagari="" iast={String(r[c.key] ?? "")} script={prefs.script} className="!text-[0.95rem] !leading-snug" /> : String(r[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + 300)} className="ui-btn mx-auto mt-4 flex">
          Show more ({(shown.length - limit).toLocaleString()} left)
        </button>
      )}
    </div>
  );
}
