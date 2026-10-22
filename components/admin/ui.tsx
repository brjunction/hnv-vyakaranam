// Small presentational helpers for admin pages (server-safe).
export function PageHeader({ title, intro }: { title: string; intro?: string }) {
  return (
    <header className="mb-8">
      <h1 className="font-semibold text-4xl mb-2">{title}</h1>
      {intro && <p className="text-[var(--fg-muted)] max-w-2xl">{intro}</p>}
    </header>
  );
}

export function Panel({ title, children, aside }: { title?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 mb-6">
      {(title || aside) && (
        <div className="flex items-baseline justify-between gap-4 mb-4">
          {title && <h2 className="font-semibold text-2xl">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-sm text-[var(--fg-muted)] mb-1">{label}</p>
      <p className="font-semibold text-4xl sutra-number">{value}</p>
      {note && <p className="text-xs text-[var(--fg-faint)] mt-1">{note}</p>}
    </div>
  );
}

/** Today's date in Nepal (the editors' timezone), YYYY-MM-DD. */
export function todayInNepal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date());
}
