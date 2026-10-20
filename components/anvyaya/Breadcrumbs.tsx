import Link from "next/link";

export type Crumb = { label: string; href?: string };

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[var(--fg-muted)] flex flex-wrap items-center gap-x-2 gap-y-1">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden className="text-[var(--accent)]">›</span>}
          {c.href ? (
            <Link href={c.href} className="hover:text-[var(--accent)] transition-colors">
              {c.label}
            </Link>
          ) : (
            <span className="text-[var(--fg)]">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
