import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TOOL_GROUPS, findTool, toolHref } from "@/lib/tools";

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOL_GROUPS.flatMap((g) => g.tools.filter((t) => !t.ready).map((t) => ({ group: g.slug, tool: t.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ group: string; tool: string }> }): Promise<Metadata> {
  const { group, tool } = await params;
  const f = findTool(group, tool);
  return f ? { title: f.tool.name, description: f.tool.blurb } : {};
}

export default async function ComingSoon({ params }: { params: Promise<{ group: string; tool: string }> }) {
  const { group, tool } = await params;
  const f = findTool(group, tool);
  if (!f) notFound();
  const Icon = f.tool.icon;
  const ready = TOOL_GROUPS.flatMap((g) => g.tools.filter((t) => t.ready).map((t) => ({ g, t })));
  return (
    <div className="max-w-2xl mx-auto px-5 py-10 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] text-[var(--accent)]">
        <Icon size={22} strokeWidth={1.6} />
      </span>
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-1">{f.group.name}</p>
      <h1 className="text-xl sm:text-2xl font-semibold mb-2">{f.tool.name}</h1>
      <p className="text-[var(--fg-muted)] mb-2">{f.tool.blurb}</p>
      <p className="inline-block rounded-full border border-[var(--border)] px-3 py-1 text-sm text-[var(--fg-muted)] mb-6">Coming soon</p>
      <div className="flex flex-wrap justify-center gap-3">
        {ready.map(({ g, t }) => (
          <Link key={t.slug} href={toolHref(g, t)} className="px-5 py-2.5 rounded-full bg-[var(--accent)] text-[var(--color-ink)] font-medium hover:opacity-90">
            Open the {t.name}
          </Link>
        ))}
        <Link href="/tools" className="px-5 py-2.5 rounded-full border border-[var(--border)] hover:border-[var(--accent)]">
          All tools
        </Link>
      </div>
    </div>
  );
}
