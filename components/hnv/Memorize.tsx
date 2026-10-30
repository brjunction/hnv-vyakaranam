"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Type } from "lucide-react";
import type { MemoChapter } from "@/lib/data/hnv";
import { ScriptPicker } from "@/components/scriptures/Panes";
import { useReaderPrefs } from "@/components/scriptures/prefs";
import { VerseLinesIn } from "@/components/scriptures/ScriptText";

/**
 * Every sūtra at once, small, in columns — for memorisation. Only the sūtra
 * and its number (no vṛtti, translation or commentary). Size and number of
 * columns can be changed; the choice is remembered on this device.
 */
export default function Memorize({ chapters, sutraBase }: { chapters: MemoChapter[]; sutraBase: string }) {
  const [prefs, setPrefs] = useReaderPrefs();
  const [size, setSize] = useState(0.85);
  const [cols, setCols] = useState(4);
  const [only, setOnly] = useState("");
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("hnv:memorize") ?? "{}");
      if (p.size) setSize(p.size);
      if (p.cols) setCols(p.cols);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("hnv:memorize", JSON.stringify({ size, cols }));
    } catch {}
  }, [size, cols]);
  const shown = only ? chapters.filter((c) => c.slug === only) : chapters;
  const total = chapters.reduce((n, c) => n + c.sections.reduce((m, s) => m + s.sutras.length, 0), 0);

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/92 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
        <ScriptPicker prefs={prefs} setPrefs={setPrefs} />
        <select value={only} onChange={(e) => setOnly(e.target.value)} className="ui-btn" aria-label="Prakaraṇa">
          <option value="">All prakaraṇas ({total})</option>
          {chapters.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
        <span className="ui-seg" role="group" aria-label="Text size">
          <button type="button" onClick={() => setSize((s) => Math.max(0.6, +(s - 0.05).toFixed(2)))} aria-label="Smaller">
            <Minus size={14} />
          </button>
          <span className="inline-flex items-center gap-1 px-1.5 text-xs leading-none tabular-nums">
            <Type size={13} className="shrink-0" /> {Math.round(size * 100)}%
          </span>
          <button type="button" onClick={() => setSize((s) => Math.min(1.4, +(s + 0.05).toFixed(2)))} aria-label="Larger">
            <Plus size={14} />
          </button>
        </span>
        <span className="ui-seg" role="group" aria-label="Columns">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button key={n} type="button" aria-pressed={cols === n} onClick={() => setCols(n)} title={`${n} column${n > 1 ? "s" : ""}`}>
              {n}
            </button>
          ))}
        </span>
      </div>

      {shown.map((c) => (
        <section key={c.slug} className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-[var(--color-saffron)]">{c.title}</h2>
          {c.sections.map((s, k) => (
            <div key={k} className="mb-5">
              {s.title && <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--fg-muted)]">{s.title}</h3>}
              <ol className="memo-cols" style={{ columnCount: cols, fontSize: `${size}rem` }}>
                {s.sutras.map((x) => (
                  <li key={x.n} className="memo-item">
                    <a href={`${sutraBase}/${encodeURIComponent(x.n)}`} className="memo-num" title={`Sūtra ${x.n}`}>
                      {x.n}
                    </a>
                    <VerseLinesIn devanagari={x.d} iast={x.i} script={prefs.script} className="memo-text" size="md" />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      ))}
      {!shown.length && <p className="text-[var(--fg-muted)]">No sūtras yet.</p>}
    </div>
  );
}
