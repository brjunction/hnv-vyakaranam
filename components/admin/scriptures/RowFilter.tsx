"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

/** Instant filter for a server-rendered table: hides rows (data-text) and empty groups (data-group). */
export default function RowFilter({ target, placeholder = "Filter…" }: { target: string; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "ready" | "soon">("all");
  useEffect(() => {
    const root = document.getElementById(target);
    if (!root) return;
    const f = q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    root.querySelectorAll<HTMLElement>("[data-text]").forEach((r) => {
      const t = (r.dataset.text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
      const okText = !f || t.includes(f);
      const okState = only === "all" || r.dataset.state === only;
      r.style.display = okText && okState ? "" : "none";
    });
    root.querySelectorAll<HTMLElement>("[data-group]").forEach((g) => {
      const any = [...g.querySelectorAll<HTMLElement>("[data-text]")].some((r) => r.style.display !== "none");
      g.style.display = any ? "" : "none";
    });
  }, [q, only, target]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--a-fg-muted)]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="a-input h-9 w-64 pl-9" />
      </label>
      <div className="inline-flex rounded-lg border border-[var(--a-border)] bg-[var(--a-card)] p-0.5 text-xs">
        {(["all", "ready", "soon"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setOnly(k)} className={`rounded-md px-3 py-1.5 ${only === k ? "bg-[var(--a-primary)] text-[var(--a-primary-fg)]" : "text-[var(--a-fg-muted)]"}`}>
            {k === "all" ? "All" : k === "ready" ? "With text" : "Coming soon"}
          </button>
        ))}
      </div>
    </div>
  );
}
