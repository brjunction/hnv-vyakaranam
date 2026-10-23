import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ListTodo } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { bookProgress, getBookAdmin, missingQueue } from "@/lib/data/scripturesAdmin";
import { Panel } from "@/components/admin/ui";
import { Crumbs } from "@/components/admin/hnv/bits";
import { BookTabs } from "@/components/admin/scriptures/bits";
import { readingOrder } from "@/lib/scriptures/core";

export const metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

const ROLE: Record<string, string> = { anvaya: "Anvaya", translation: "Translation", verse: "Synonyms", commentary: "Commentary" };

function Bar({ value, max, tone = "primary" }: { value: number; max: number; tone?: "primary" | "amber" }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--a-muted)]">
        <div className={`h-full rounded-full ${tone === "amber" ? "bg-amber-500" : "bg-[var(--a-primary)]"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 text-right text-xs tabular-nums text-[var(--a-fg-muted)]">
        {value.toLocaleString()} / {max.toLocaleString()} · {pct}%
      </span>
    </div>
  );
}

export default async function Progress({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ k?: string }> }) {
  await requireUser("viewer");
  const { code } = await params;
  const { k } = await searchParams;
  const data = await getBookAdmin(code);
  if (!data) notFound();
  const { book, tree, types } = data;
  const verseTypes = types.filter((t) => t.appliesTo !== "division");
  const { totals, perType, perDivision } = await bookProgress(book.id);
  const kind = k === "text" ? 0 : Number(k) || verseTypes.find((t) => t.pane === "translation")?.id || verseTypes[0]?.id || 0;
  const queue = await missingQueue(book.id, kind, 40);
  const nodeOf = new Map(tree.map((n) => [n.id, n]));
  const kindName = kind === 0 ? "verse text" : verseTypes.find((t) => t.id === kind)?.name ?? "";

  // chapters furthest behind (for the chosen kind)
  const leaves = readingOrder(tree).filter((n) => n.verses > 0);
  const behind = leaves
    .map((n) => {
      const done = kind === 0 ? null : perDivision.find((d) => d.divisionId === n.id && d.typeId === kind)?.n ?? 0;
      return { n, done: done ?? 0, pct: n.verses ? (done ?? 0) / n.verses : 0 };
    })
    .filter((x) => kind !== 0 && x.pct < 1)
    .sort((a, b) => a.pct - b.pct || b.n.verses - a.n.verses)
    .slice(0, 12);

  return (
    <>
      <Crumbs items={[{ label: "Scriptures", href: "/admin/scriptures" }, { label: book.title, href: `/admin/scriptures/${book.code}` }, { label: "Progress" }]} />
      <h1 className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl">{book.title}</h1>
      <BookTabs code={book.code} active="progress" />

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="min-w-0">
          <Panel title="Completion" description={`${totals.verses.toLocaleString()} ${book.verseLabelPlural.toLowerCase()} entered${totals.drafts ? ` · ${totals.drafts} hidden (draft)` : ""}. Click a row for its work queue.`}>
            <ul className="grid gap-1">
              {[{ id: 0, name: `${book.verseLabel} text`, author: "", pane: "verse-text", n: totals.withText, drafts: 0 }, ...verseTypes.map((t) => ({ ...t, n: perType.find((p) => p.typeId === t.id)?.n ?? 0, drafts: perType.find((p) => p.typeId === t.id)?.drafts ?? 0 }))].map((t) => {
                const active = t.id === kind;
                return (
                  <li key={t.id}>
                    <Link
                      href={`/admin/scriptures/${book.code}/progress?k=${t.id === 0 ? "text" : t.id}`}
                      className={`grid items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2.5 sm:grid-cols-[14rem_1fr] ${active ? "bg-[var(--a-muted)] ring-1 ring-[var(--a-border)]" : "hover:bg-[var(--a-muted)]/60"}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{t.name}</span>
                        <span className="block truncate text-[11px] text-[var(--a-fg-muted)]">
                          {t.id === 0 ? "Devanagari / IAST" : ROLE[t.pane] ?? ""}
                          {t.drafts ? ` · ${t.drafts} draft` : ""}
                        </span>
                      </span>
                      <Bar value={t.n} max={totals.verses} tone={t.id !== 0 && t.pane === "commentary" ? "amber" : "primary"} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {behind.length > 0 && (
            <Panel title={`Chapters behind — ${kindName}`} description="Least complete first.">
              <ul className="grid gap-1">
                {behind.map(({ n, done }) => (
                  <li key={n.id}>
                    <Link href={`/admin/scriptures/d/${n.id}`} className="grid items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2 hover:bg-[var(--a-muted)]/60 sm:grid-cols-[14rem_1fr]">
                      <span className="truncate text-sm">
                        <span className="font-semibold tabular-nums">{n.path.join(".")}</span> {n.title && <span className="text-[var(--a-fg-muted)]">· {n.title}</span>}
                      </span>
                      <Bar value={done} max={n.verses} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <Panel
          title={`Work queue — ${kindName}`}
          description={queue.total ? `${queue.total.toLocaleString()} ${book.verseLabelPlural.toLowerCase()} still need it. Next in reading order:` : "Nothing missing. 🎉"}
          aside={<ListTodo size={18} className="text-[var(--a-fg-muted)]" />}
        >
          <ol className="-my-1 divide-y divide-[var(--a-border)]">
            {queue.items.map((v) => {
              const n = nodeOf.get(v.divisionId);
              const first = (v.deva || v.iast).split(/\s*\/\s*/)[0];
              return (
                <li key={v.id}>
                  <Link href={`/admin/scriptures/v/${v.id}`} className="group flex items-center gap-3 py-2 text-sm">
                    <span className="w-16 shrink-0 font-semibold tabular-nums">{v.verseNo}</span>
                    <span className={`min-w-0 flex-1 truncate ${v.deva ? "font-devanagari" : "italic"} text-[var(--a-fg-muted)]`}>{first || n?.title || "—"}</span>
                    <ArrowRight size={14} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              );
            })}
          </ol>
          {queue.items[0] && (
            <Link href={`/admin/scriptures/v/${queue.items[0].id}`} className="a-btn a-btn-primary mt-4 w-full justify-center">
              Start with {queue.items[0].verseNo}
            </Link>
          )}
        </Panel>
      </div>
    </>
  );
}
