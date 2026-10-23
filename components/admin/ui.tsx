// Presentational helpers for admin pages (server-safe), shadcn-style.
export function PageHeader({ title, intro, actions }: { title: string; intro?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {intro && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--a-fg-muted)]">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  description,
  children,
  aside,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="a-card mb-6 overflow-visible">
      {(title || aside) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--a-border)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold leading-tight">{title}</h2>}
            {description && <p className="mt-1 text-sm text-[var(--a-fg-muted)]">{description}</p>}
          </div>
          {aside}
        </div>
      )}
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

export function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="a-card p-5">
      <p className="text-sm font-medium text-[var(--a-fg-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-[var(--a-fg-muted)]">{note}</p>}
    </div>
  );
}

/** Today's date in Nepal (the editors' timezone), YYYY-MM-DD. */
export function todayInNepal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date());
}
