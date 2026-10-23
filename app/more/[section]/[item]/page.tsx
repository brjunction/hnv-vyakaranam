import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getMoreItem, getMoreSections } from "@/lib/data/more";
import { STAGE_INFO, formatDate, hasPage, itemPath } from "@/lib/more/core";

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getMoreSections()).flatMap((s) => s.items.filter((i) => hasPage(s.kind, i)).map((i) => ({ section: s.key, item: i.slug })));
}

type P = { params: Promise<{ section: string; item: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await params;
  const r = await getMoreItem(p.section, p.item);
  if (!r) return {};
  return {
    title: r.item.title,
    description: r.item.subtitle || undefined,
    alternates: { canonical: itemPath(r.section.key, r.item.slug) },
    openGraph: r.item.imageUrl ? { images: [r.item.imageUrl] } : undefined,
  };
}

export default async function ItemPage({ params }: P) {
  const p = await params;
  const r = await getMoreItem(p.section, p.item);
  if (!r || !hasPage(r.section.kind, r.item)) notFound();
  const { section: s, item: i } = r;
  const meta = [formatDate(i.date), i.person].filter(Boolean).join(" · ");
  const others = s.items.filter((x) => x.id !== i.id && hasPage(s.kind, x)).slice(0, 3);

  return (
    <article className="mx-auto max-w-3xl px-5 pb-16 pt-6">
      <Link href={`/more/${s.key}`} className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]">
        <ArrowLeft size={14} /> {s.title}
      </Link>
      <header className="mb-6 mt-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--fg-muted)]">
          {i.badge && <span className="more-badge">{i.badge}</span>}
          {i.stage && <span className="more-badge">{STAGE_INFO[i.stage].label}</span>}
          {meta}
        </div>
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{i.title}</h1>
        {i.subtitle && <p className="mt-2 text-[var(--fg-muted)]">{i.subtitle}</p>}
      </header>
      {i.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={i.imageUrl} alt="" className="mb-6 w-full rounded-2xl border border-[var(--border)] object-cover" />
      )}
      {i.bodyHtml && <div className="rich-content" dangerouslySetInnerHTML={{ __html: i.bodyHtml }} />}
      {i.url && (
        <p className="mt-8">
          <a href={i.url} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-primary">
            {i.linkLabel || (s.kind === "courses" ? "View course" : "Open link")} <ArrowUpRight size={15} />
          </a>
        </p>
      )}
      {others.length > 0 && (
        <aside className="mt-12 border-t border-[var(--border)] pt-6">
          <p className="mb-3 text-sm font-semibold">More in {s.title}</p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={itemPath(s.key, o.slug)} className="block h-full rounded-xl border border-[var(--border)] p-3 text-sm transition-colors hover:border-[var(--accent)]">
                  <span className="font-medium">{o.title}</span>
                  {o.date && <span className="mt-1 block text-xs text-[var(--fg-muted)]">{formatDate(o.date)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
