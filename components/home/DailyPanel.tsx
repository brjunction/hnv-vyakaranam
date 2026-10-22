"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { localDate, type DailyEntry, type DailyPayload } from "@/lib/daily/pick";
import { splitLines } from "@/lib/text";

type State = { status: "loading" } | { status: "ready"; data: DailyPayload } | { status: "empty" };

function prettyDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(new Date(y, m - 1, d));
}

function Lines({ text, className, lang }: { text: string; className: string; lang: string }) {
  const lines = splitLines(text);
  if (lines.length === 0) return null;
  return (
    <p className={className} lang={lang}>
      {lines.map((l, i) => (
        <span key={i} className="block">
          {l}
        </span>
      ))}
    </p>
  );
}

function DailyCard({ title, entry, tone }: { title: string; entry: DailyEntry; tone: "kunkuma" | "haridra" }) {
  return (
    <article className="daily-card flex flex-col p-6 sm:p-8 overflow-hidden">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: tone === "kunkuma" ? "var(--accent)" : "var(--highlight)" }}
      />
      <header className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-4 mb-5">
        <h3 className="font-display text-2xl">{title}</h3>
        <span className="text-sm text-[var(--fg-muted)] sm:text-right">{entry.label}</span>
      </header>
      <Lines text={entry.sanskrit} lang="sa-Deva" className="font-devanagari text-2xl sm:text-[1.7rem] leading-relaxed mb-3" />
      <Lines text={entry.iast} lang="sa-Latn" className="italic text-[var(--fg-muted)] leading-relaxed mb-4" />
      {entry.translation && (
        <p className="border-l-2 pl-4 leading-relaxed" style={{ borderColor: tone === "kunkuma" ? "var(--accent)" : "var(--highlight)" }}>
          {entry.translation}
        </p>
      )}
      <footer className="mt-auto pt-6 flex items-center justify-between gap-4 text-sm text-[var(--fg-muted)]">
        <span>{entry.type === "subhashita" ? entry.source : entry.context}</span>
        {entry.href && (
          <Link href={entry.href} className="font-semibold text-[var(--accent)] hover:underline shrink-0">
            Read in context
          </Link>
        )}
      </footer>
    </article>
  );
}

/**
 * Verse of the Day + Subhāṣita. The browser computes its own local date and
 * fetches the small static file for that date, so the pick changes at the
 * visitor's midnight without any rebuild (docs/08-home-daily-audio.md §2).
 * Hides itself entirely when both pools are empty.
 */
export default function DailyPanel() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const date = localDate();
    let cancelled = false;
    fetch(`/api/daily/${date}`)
      .then((r) => (r.ok ? (r.json() as Promise<DailyPayload>) : Promise.reject(r.status)))
      .then((data) => {
        if (cancelled) return;
        setState(data.verseOfDay || data.subhashita ? { status: "ready", data } : { status: "empty" });
      })
      .catch(() => !cancelled && setState({ status: "empty" }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "empty") return null;

  return (
    <section aria-labelledby="today-heading" className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-8">
        <h2 id="today-heading" className="font-display text-4xl sm:text-5xl">
          For today
        </h2>
        {state.status === "ready" && <p className="text-[var(--fg-muted)]">{prettyDate(state.data.date)}</p>}
      </div>

      {state.status === "loading" ? (
        <div className="grid md:grid-cols-2 gap-6" aria-hidden>
          <div className="anv-skeleton !h-72 !rounded-2xl" />
          <div className="anv-skeleton !h-72 !rounded-2xl" />
        </div>
      ) : (
        <div className={`grid gap-6 ${state.data.verseOfDay && state.data.subhashita ? "md:grid-cols-2" : ""}`}>
          {state.data.verseOfDay && (
            <DailyCard
              title={state.data.verseOfDay.type === "verse" ? "Verse of the day" : "Sūtra of the day"}
              entry={state.data.verseOfDay}
              tone="kunkuma"
            />
          )}
          {state.data.subhashita && <DailyCard title="Subhāṣita of the day" entry={state.data.subhashita} tone="haridra" />}
        </div>
      )}
    </section>
  );
}
