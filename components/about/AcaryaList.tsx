"use client";

import Link from "next/link";
import { useState } from "react";
import type { MoreItem } from "@/lib/more/core";

// The paramparā as a vertical line of succession, or the same names A–Z.
export default function AcaryaList({ items, base }: { items: MoreItem[]; base: string }) {
  const [view, setView] = useState<"parampara" | "az">("parampara");
  const list = view === "az" ? [...items].sort((a, b) => a.title.localeCompare(b.title)) : items;
  return (
    <div>
      <div className="lib-tabs mb-6" role="tablist" aria-label="Order">
        <button role="tab" aria-selected={view === "parampara"} onClick={() => setView("parampara")}>Disciplic succession</button>
        <button role="tab" aria-selected={view === "az"} onClick={() => setView("az")}>A–Z</button>
      </div>
      <ol className={view === "parampara" ? "acarya-line" : "grid gap-2 sm:grid-cols-2"}>
        {list.map((i, n) => {
          const inner = (
            <>
              {view === "parampara" && <span className="acarya-dot">{n + 1}</span>}
              <span className="min-w-0">
                <span className="block font-medium">{i.title}</span>
                {i.subtitle && <span className="block text-xs text-[var(--fg-muted)]">{i.subtitle}</span>}
              </span>
              {i.bodyHtml.trim() && <span className="ml-auto text-xs text-[var(--accent)]">Read →</span>}
            </>
          );
          return (
            <li key={i.id}>
              {i.bodyHtml.trim() ? (
                <Link href={`${base}/${i.slug}`} className="acarya-row lift">{inner}</Link>
              ) : (
                <div className="acarya-row">{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
