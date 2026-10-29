import Link from "next/link";
import { BookOpen, ExternalLink, FileSpreadsheet, Gauge, ListTree, MessageSquareText, Settings2 } from "lucide-react";

// Small server-safe pieces shared by the Scriptures admin pages.

export function BookTabs({ code, active }: { code: string; active: "structure" | "progress" | "commentaries" | "spreadsheet" | "ebooks" | "settings" }) {
  const tabs = [
    { k: "structure", label: "Structure", href: `/admin/scriptures/${code}`, icon: ListTree },
    { k: "progress", label: "Progress", href: `/admin/scriptures/${code}/progress`, icon: Gauge },
    { k: "commentaries", label: "Commentaries", href: `/admin/scriptures/${code}/commentaries`, icon: MessageSquareText },
    { k: "spreadsheet", label: "Spreadsheet", href: `/admin/scriptures/${code}/spreadsheet`, icon: FileSpreadsheet },
    ...(code === "sb" || code === "bg" ? ([{ k: "ebooks", label: "Import e-books", href: `/admin/scriptures/${code}/import-ebooks`, icon: BookOpen }] as const) : []),
    { k: "settings", label: "Settings", href: `/admin/scriptures/${code}/settings`, icon: Settings2 },
  ] as const;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--a-border)]">
      <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Book sections">
        {tabs.map(({ k, label, href, icon: Icon }) => (
          <Link
            key={k}
            href={href}
            aria-current={active === k ? "page" : undefined}
            className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              active === k ? "border-[var(--a-primary)] text-[var(--a-fg)]" : "border-transparent text-[var(--a-fg-muted)] hover:text-[var(--a-fg)]"
            }`}
          >
            <Icon size={15} /> {label}
          </Link>
        ))}
      </nav>
      <a href={`/scriptures/${code}`} target="_blank" rel="noreferrer" className="mb-2 inline-flex items-center gap-1 text-sm text-[var(--a-fg-muted)] hover:text-[var(--a-fg)]">
        View on site <ExternalLink size={13} />
      </a>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  if (status === "published") return null;
  const cls =
    status === "draft"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-[var(--a-border)] bg-[var(--a-muted)] text-[var(--a-fg-muted)]";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>{status}</span>;
}

export function Progress({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} title={`${value} of ${max}`}>
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--a-muted)]">
        <span className="block h-full rounded-full bg-[var(--a-primary)]" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs tabular-nums text-[var(--a-fg-muted)]">{pct}%</span>
    </span>
  );
}

/** One dot per commentary kind: filled = published, ring = draft, faint = missing. */
export function Coverage({ types, cov }: { types: { id: number; name: string }[]; cov: Record<number, string> }) {
  return (
    <span className="inline-flex items-center gap-1">
      {types.map((t) => {
        const s = cov[t.id];
        return (
          <span
            key={t.id}
            title={`${t.name}: ${s ? (s === "draft" ? "draft" : "added") : "missing"}`}
            className={`h-2.5 w-2.5 rounded-full ${
              s === "published" ? "bg-[var(--a-success)]" : s ? "border-2 border-amber-500" : "bg-[var(--a-muted)] ring-1 ring-inset ring-[var(--a-border)]"
            }`}
          />
        );
      })}
    </span>
  );
}

