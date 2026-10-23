import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import type { ActionState } from "@/lib/actions/types";

// Small shared pieces for the Chapters & sūtras admin (server-safe).

export const EDITION_NAMES: Record<string, string> = { madhyama: "Madhyama", brhat: "Bṛhat", laghu: "Laghu" };
export const PUBLIC_BASE: Record<string, string> = { madhyama: "/chapters", brhat: "/brhat/chapters", laghu: "/laghu/chapters" };

export function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-[var(--fg-muted)]">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRight size={14} className="opacity-60" />}
          {it.href ? (
            <Link href={it.href} className="hover:text-[var(--fg)] hover:underline">
              {it.label}
            </Link>
          ) : (
            <span className="text-[var(--fg)]">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function EditionSwitch({ active, editions }: { active: string; editions: { slug: string; name: string }[] }) {
  return (
    <div className="mb-6 inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
      {editions.map((e) => (
        <Link
          key={e.slug}
          href={`/admin/hnv/${e.slug}`}
          aria-current={e.slug === active ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            e.slug === active ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
          }`}
        >
          {e.name}
        </Link>
      ))}
    </div>
  );
}

type Act = (prev: ActionState, form: FormData) => Promise<ActionState>;

/** ↑ / ↓ buttons bound to a move action ({id, dir}). */
export function MoveButtons({ action, id }: { action: Act; id: number }) {
  return (
    <span className="inline-flex gap-1">
      {(["up", "down"] as const).map((dir) => (
        <ActionForm key={dir} action={action} className="inline">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="dir" value={dir} />
          <button
            type="submit"
            title={dir === "up" ? "Move up" : "Move down"}
            aria-label={dir === "up" ? "Move up" : "Move down"}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] hover:border-[var(--fg)]"
          >
            {dir === "up" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </ActionForm>
      ))}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "published") return null;
  return (
    <span className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--fg-muted)]">
      {status}
    </span>
  );
}

export { SubmitButton };
