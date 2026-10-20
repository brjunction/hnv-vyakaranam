import type { BookConfig } from "@/lib/anvyayaBooks";

/** The attribution shown on every Anvyaya page. */
export default function CreditBox({ book }: { book: BookConfig }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)]/80 p-5 text-left">
      <p className="anv-label mb-3">Sources &amp; credits</p>
      <div className="space-y-2.5 text-sm leading-relaxed text-[var(--fg-muted)]">
        <p className="flex gap-3">
          <span className="text-[var(--accent)] shrink-0" aria-hidden>◆</span>
          <span>{book.anvyayaCredit}</span>
        </p>
        <p className="flex gap-3">
          <span className="text-[var(--accent)] shrink-0" aria-hidden>◆</span>
          <span>{book.translationCredit}</span>
        </p>
      </div>
    </div>
  );
}
