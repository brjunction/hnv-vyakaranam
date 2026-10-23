import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Music } from "lucide-react";
import { getSongIndex } from "@/lib/data/songs";
import PageHead, { MetaChip } from "@/components/PageHead";
import { comparePlace, songPath } from "@/lib/songs/core";

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [...new Set((await getSongIndex()).map((s) => s.book).filter(Boolean))].map((name) => ({ name }));
}

type P = { params: Promise<{ name: string }> };
const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const name = decode((await params).name);
  return { title: `${name} — songs`, alternates: { canonical: `/songs/book/${encodeURIComponent(name)}` } };
}

export default async function BookPage({ params }: P) {
  const name = decode((await params).name);
  const list = (await getSongIndex()).filter((s) => s.book === name).sort((a, b) => comparePlace(a.bookPlace, b.bookPlace) || a.title.localeCompare(b.title));
  if (!list.length) notFound();
  const authors = [...new Set(list.map((s) => s.author).filter(Boolean))];
  return (
    <>
      <PageHead eyebrow="Vaiṣṇava Bhajans" title={name} intro={authors.join(", ") || undefined} meta={<MetaChip n={list.length} label={list.length === 1 ? "bhajan" : "bhajans"} />} />
      <div className="mx-auto max-w-3xl px-5 pb-16 pt-6">
        <ol className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--bg)]">
          {list.map((s) => (
            <li key={s.slug}>
              <Link href={songPath(s.slug)} className="group flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-2)]">
                <span className="w-16 shrink-0 text-xs tabular-nums text-[var(--fg-muted)]">{s.bookPlace}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium group-hover:text-[var(--accent)]">{s.title}</span>
                  {s.firstLine && s.firstLine.toLowerCase() !== s.title.toLowerCase() && <span className="block truncate text-sm italic text-[var(--fg-muted)]">{s.firstLine}</span>}
                </span>
                <Music size={14} className="shrink-0 text-[var(--fg-muted)]" />
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-6">
          <Link href="/songs" className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]">
            ← All songs
          </Link>
        </p>
      </div>
    </>
  );
}
