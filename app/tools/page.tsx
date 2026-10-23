import type { Metadata } from "next";
import Link from "next/link";
import { TOOL_GROUPS, toolHref } from "@/lib/tools";
import PageHead from "@/components/PageHead";

export const metadata: Metadata = {
  title: "Tools",
  description: "Sanskrit dictionaries, HNV grammar tools and text utilities.",
};

export default function ToolsPage() {
  return (
    <>
    <PageHead title="Tools" intro="Dictionaries, grammar tools that show the sūtra behind every change, and text utilities." />
    <div className="max-w-6xl mx-auto px-5 py-8">
      <div className="space-y-10">
        {TOOL_GROUPS.map((g) => (
          <section key={g.slug}>
            <h2 className="text-xl font-semibold mb-1">{g.name}</h2>
            <p className="text-sm text-[var(--fg-muted)] mb-5">{g.blurb}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {g.tools.map((t) => {
                const Icon = t.icon;
                return (
                  <Link
                    key={t.slug}
                    href={toolHref(g, t)}
                    className={`group rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                      t.ready ? "border-[var(--accent)]/50 bg-[var(--bg-2)]" : "border-[var(--border)]"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          t.ready ? "bg-[var(--accent)] text-[var(--color-ink)]" : "bg-[var(--bg-2)] text-[var(--fg-muted)] border border-[var(--border)]"
                        }`}
                      >
                        <Icon size={20} strokeWidth={1.75} />
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs ${
                          t.ready ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "border border-[var(--border)] text-[var(--fg-muted)]"
                        }`}
                      >
                        {t.ready ? "Ready" : "Coming soon"}
                      </span>
                    </div>
                    <p className="font-medium group-hover:text-[var(--accent)] transition-colors">{t.name}</p>
                    <p className="text-sm text-[var(--fg-muted)] mt-1">{t.blurb}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
    </>
  );
}
