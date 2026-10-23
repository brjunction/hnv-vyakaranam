"use client";

import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { useMarks } from "@/components/scriptures/prefs";

/** "Continue reading" — where this reader left off (one place per book). Renders nothing the first time. */
export default function Shelf({ book }: { book?: string }) {
  const history = useMarks("history");
  const h = history.items.filter((m) => !book || m.book === book).slice(0, book ? 1 : 4);
  if (!h.length) return null;
  return (
    <section className="mb-6">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[var(--fg-muted)]">
        <History size={13} /> Continue reading
      </p>
      <div className="flex flex-wrap gap-2">
        {h.map((m) => (
          <Link key={m.href} href={m.href} className="ui-btn group">
            <span className="font-semibold">{m.ref}</span>
            {!book && <span className="text-[var(--fg-muted)]">{m.title}</span>}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}
