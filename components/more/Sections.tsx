import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Check, CircleDashed, FileText, Globe, GraduationCap, Loader, Pin } from "lucide-react";
import YouTubeCard from "@/components/more/YouTubeCard";
import { STAGE_INFO, formatDate, hasPage, hostOf, itemPath, type MoreItem, type MoreSection } from "@/lib/more/core";

// One renderer per section kind. Server components; only the YouTube
// player is interactive.

const ext = (url: string) => /^https?:\/\//.test(url);

function Empty({ s }: { s: MoreSection }) {
  return <p className="rounded-2xl border border-dashed border-[var(--border)] px-5 py-8 text-center text-sm text-[var(--fg-muted)]">Nothing here yet — coming soon.</p>;
}

function ItemLink({ s, i, children, className }: { s: MoreSection; i: MoreItem; children: React.ReactNode; className?: string }) {
  if (hasPage(s.kind, i)) return <Link href={itemPath(s.key, i.slug)} className={className}>{children}</Link>;
  if (i.url) return <a href={i.url} target={ext(i.url) ? "_blank" : undefined} rel="noopener noreferrer" className={className}>{children}</a>;
  return <div className={className}>{children}</div>;
}

// ---------------------------------------------------------------- posts
function Posts({ s, limit }: { s: MoreSection; limit?: number }) {
  const items = limit ? s.items.slice(0, limit) : s.items;
  if (!items.length) return <Empty s={s} />;
  const [lead, ...rest] = items;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <Link href={itemPath(s.key, lead.slug)} className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:flex-row lg:flex-col">
        {lead.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lead.imageUrl} alt="" className="aspect-[16/9] w-full object-cover sm:w-2/5 lg:w-full" />
        ) : (
          <span className="more-post-fallback aspect-[16/9] w-full sm:w-2/5 lg:w-full" aria-hidden />
        )}
        <div className="flex flex-1 flex-col p-5">
          <PostMeta i={lead} />
          <h3 className="mt-1 text-lg font-semibold leading-snug transition-colors group-hover:text-[var(--accent)]">{lead.title}</h3>
          {lead.subtitle && <p className="mt-1.5 line-clamp-3 text-sm text-[var(--fg-muted)]">{lead.subtitle}</p>}
          <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-[var(--accent)]">
            Read <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
      {rest.length > 0 && (
        <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--bg)]">
          {rest.map((i) => (
            <li key={i.id}>
              <Link href={itemPath(s.key, i.slug)} className="group flex gap-3 p-4 transition-colors hover:bg-[var(--bg-2)]">
                {i.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.imageUrl} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                )}
                <span className="min-w-0">
                  <PostMeta i={i} />
                  <span className="mt-0.5 block font-medium leading-snug group-hover:text-[var(--accent)]">{i.title}</span>
                  {i.subtitle && <span className="mt-0.5 line-clamp-1 block text-sm text-[var(--fg-muted)]">{i.subtitle}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PostMeta({ i }: { i: MoreItem }) {
  const bits = [formatDate(i.date), i.person].filter(Boolean);
  if (!bits.length && !i.pinned && !i.badge) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--fg-muted)]">
      {i.pinned && (
        <span className="inline-flex items-center gap-0.5 text-[var(--color-saffron)]">
          <Pin size={11} /> Pinned
        </span>
      )}
      {i.badge && <span className="more-badge">{i.badge}</span>}
      {bits.join(" · ")}
    </span>
  );
}

// ------------------------------------------------------------- progress
const STAGE_ICON = { done: Check, doing: Loader, planned: CircleDashed } as const;

function Progress({ s }: { s: MoreSection }) {
  if (!s.items.length) return <Empty s={s} />;
  const stages = (["doing", "planned", "done"] as const).map((k) => ({ k, items: s.items.filter((i) => (i.stage || "planned") === k) }));
  const done = stages[2].items.length;
  const pct = Math.round((done / s.items.length) * 100);
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="h-2 min-w-[10rem] flex-1 overflow-hidden rounded-full bg-[var(--bg-2)]">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm tabular-nums text-[var(--fg-muted)]">
          <strong className="text-[var(--fg)]">{done}</strong> of {s.items.length} done
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {stages.map(({ k, items }) => {
          const Icon = STAGE_ICON[k];
          return (
            <div key={k} className={`more-stage more-stage-${k} rounded-xl p-3`}>
              <p className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold">
                <Icon size={15} className="more-stage-icon" /> {STAGE_INFO[k].label}
                <span className="ml-auto text-xs font-normal tabular-nums text-[var(--fg-muted)]">{items.length}</span>
              </p>
              {items.length ? (
                <ol className="space-y-1.5">
                  {items.map((i) => (
                    <li key={i.id}>
                      <ItemLink s={s} i={i} className="block rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 transition-colors hover:border-[var(--accent)]">
                        <span className="flex items-baseline gap-2">
                          <span className="min-w-0 flex-1 text-sm font-medium leading-snug">{i.title}</span>
                          {i.date && <span className="shrink-0 text-[11px] tabular-nums text-[var(--fg-muted)]">{formatDate(i.date, "month")}</span>}
                        </span>
                        {i.subtitle && <span className="mt-0.5 block text-xs leading-snug text-[var(--fg-muted)]">{i.subtitle}</span>}
                      </ItemLink>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="px-1 text-xs text-[var(--fg-muted)]">—</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------- courses
function initials(name: string) {
  return name
    .replace(/^(HG|HH|Śrī|Sri|Srila|Śrīla)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function Courses({ s }: { s: MoreSection }) {
  if (!s.items.length) return <Empty s={s} />;
  return (
    <div className={`grid gap-4 ${s.items.length > 1 ? "sm:grid-cols-2 xl:grid-cols-3" : "max-w-xl"}`}>
      {s.items.map((i) => (
        <article key={i.id} className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
          <div className="relative aspect-[16/8] overflow-hidden">
            {i.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={i.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            ) : (
              <span className="more-course-fallback absolute inset-0 flex items-center justify-center" aria-hidden>
                <GraduationCap size={40} strokeWidth={1.4} />
              </span>
            )}
            {i.badge && <span className="more-badge more-badge-float absolute left-3 top-3">{i.badge}</span>}
          </div>
          <div className="flex flex-1 flex-col p-4">
            <h3 className="font-semibold leading-snug">{i.title}</h3>
            {i.person && (
              <p className="mt-2 flex items-center gap-2 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[10px] font-bold text-[var(--fg)] ring-1 ring-[var(--accent)]/40">{initials(i.person)}</span>
                <span className="text-[var(--fg-muted)]">{i.person}</span>
              </p>
            )}
            {i.subtitle && <p className="mt-2 line-clamp-3 text-sm text-[var(--fg-muted)]">{i.subtitle}</p>}
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              {i.url && (
                <a href={i.url} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-primary ui-btn-sm">
                  {i.linkLabel || "View course"} <ArrowUpRight size={14} />
                </a>
              )}
              {hasPage(s.kind, i) && (
                <Link href={itemPath(s.key, i.slug)} className="ui-btn ui-btn-sm">
                  Details
                </Link>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

// --------------------------------------------------------------- videos
function Videos({ s }: { s: MoreSection }) {
  if (!s.items.length) return <Empty s={s} />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {s.items.map((i) => (
        <YouTubeCard key={i.id} url={i.url} title={i.title} subtitle={i.subtitle} person={i.person} badge={i.badge} imageUrl={i.imageUrl} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- links
function linkIcon(i: MoreItem) {
  if (/\.pdf($|\?)/i.test(i.url) || /pdf/i.test(i.badge)) return FileText;
  if (/book/i.test(i.badge)) return BookOpen;
  if (/course/i.test(i.badge)) return GraduationCap;
  return Globe;
}

function Links({ s }: { s: MoreSection }) {
  if (!s.items.length) return <Empty s={s} />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {s.items.map((i) => {
        const Icon = linkIcon(i);
        const host = ext(i.url) ? hostOf(i.url) : "harinamamrta-vyakaranam.com";
        return (
          <ItemLink key={i.id} s={s} i={i} className="group flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 transition-all hover:border-[var(--accent)] hover:shadow-sm">
            {i.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={i.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-2)] text-[var(--accent)] ring-1 ring-[var(--border)]">
                <Icon size={18} strokeWidth={1.75} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-start gap-2">
                <span className="min-w-0 flex-1 font-medium leading-snug group-hover:text-[var(--accent)]">{i.title}</span>
                <ArrowUpRight size={15} className="mt-0.5 shrink-0 text-[var(--fg-muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
              </span>
              {i.subtitle && <span className="mt-0.5 line-clamp-2 block text-sm text-[var(--fg-muted)]">{i.subtitle}</span>}
              <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--fg-muted)]">
                {i.badge && <span className="more-badge">{i.badge}</span>}
                {i.person && <span>{i.person}</span>}
                {host && <span className="truncate">{host}</span>}
              </span>
            </span>
          </ItemLink>
        );
      })}
    </div>
  );
}

export function SectionBody({ s, limit }: { s: MoreSection; limit?: number }) {
  switch (s.kind) {
    case "posts":
      return <Posts s={s} limit={limit} />;
    case "progress":
      return <Progress s={s} />;
    case "courses":
      return <Courses s={s} />;
    case "videos":
      return <Videos s={s} />;
    default:
      return <Links s={s} />;
  }
}

export function SectionHeading({ s, link }: { s: MoreSection; link?: boolean }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold sm:text-xl">{s.title}</h2>
        {s.intro && <p className="mt-0.5 max-w-2xl text-sm text-[var(--fg-muted)]">{s.intro}</p>}
      </div>
      {link && (
        <Link href={`/more/${s.key}`} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--fg-muted)] hover:text-[var(--accent)]">
          View all <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
