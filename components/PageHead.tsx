// Compact page heading used by every section page (Scriptures, Practice,
// Tools, About, More …): a slim band, not a tall hero, so the actual
// content is visible without scrolling.

export default function PageHead({
  eyebrow,
  title,
  deva,
  intro,
  meta,
  children,
  width = "max-w-6xl",
  band = true,
  image,
}: {
  /** Small cover thumbnail on the left. */
  image?: string;
  eyebrow?: string;
  title: React.ReactNode;
  /** Devanagari title shown beside the English one. */
  deva?: string;
  intro?: React.ReactNode;
  /** Small chips / counts on the right (wraps below on phones). */
  meta?: React.ReactNode;
  /** Extra row under the heading (e.g. a search box). */
  children?: React.ReactNode;
  width?: string;
  band?: boolean;
}) {
  return (
    <section className={`relative overflow-hidden ${band ? "border-b border-[var(--border)]" : ""}`}>
      {band && <div className="anv-hero-bg absolute inset-0 opacity-70" aria-hidden />}
      <div className={`relative mx-auto ${width} px-5 py-5 sm:py-6`}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 items-center gap-4">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-16 w-auto shrink-0 rounded-md border border-[var(--border)] shadow-sm" />
            )}
          <div className="min-w-0">
            {eyebrow && <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-saffron)]">{eyebrow}</p>}
            <h1 className="flex flex-wrap items-baseline gap-x-3 text-xl font-semibold leading-tight sm:text-2xl">
              {deva && <span className="font-devanagari font-normal">{deva}</span>}
              <span>{title}</span>
            </h1>
            {intro && <p className="mt-1 max-w-2xl text-sm leading-snug text-[var(--fg-muted)]">{intro}</p>}
          </div>
          </div>
          {meta && <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--fg-muted)]">{meta}</div>}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </section>
  );
}

export function MetaChip({ n, label }: { n: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-full border border-[var(--border)] bg-[var(--bg)]/70 px-2.5 py-1">
      <span className="font-semibold tabular-nums text-[var(--accent)]">{n}</span>
      <span>{label}</span>
    </span>
  );
}
