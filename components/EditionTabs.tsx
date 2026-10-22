import Link from "next/link";
import { EDITIONS, type EditionSlug } from "@/lib/editions";

/** Switch bar between the three editions, shown at the top of the chapter lists. */
export default function EditionTabs({ active }: { active: EditionSlug }) {
  return (
    <nav aria-label="Edition" className="mb-10">
      <div className="inline-flex w-full sm:w-auto rounded-full border border-[var(--border)] bg-[var(--bg-2)] p-1">
        {EDITIONS.map((e) => {
          const on = e.slug === active;
          return (
            <Link
              key={e.slug}
              href={e.href}
              aria-current={on ? "page" : undefined}
              className={`flex-1 sm:flex-none text-center rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                on ? "bg-[var(--accent)] text-[var(--color-ink)] shadow-sm" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
            >
              {e.name}
              <span className="hidden sm:inline font-devanagari text-xs opacity-70 ml-1.5">{e.deva}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
