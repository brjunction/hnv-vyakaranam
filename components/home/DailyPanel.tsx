"use client";

import { useEffect, useState } from "react";
import { BookOpenText, Quote } from "lucide-react";
import { localDate, type DailyEntry, type DailyPayload } from "@/lib/daily/pick";
import { splitLines } from "@/lib/text";

type State = { status: "loading" } | { status: "ready"; data: DailyPayload } | { status: "empty" };

function prettyDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(y, m - 1, d)
  );
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

function DailyCard({ title, entry, icon: Icon }: { title: string; entry: DailyEntry; icon: typeof Quote }) {
  return (
    <article className="daily-card flex flex-col p-6 sm:p-8">
      <header className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-saffron)]">{title}</p>
          {entry.source && <p className="text-sm text-[var(--fg-muted)]">{entry.source}</p>}
        </div>
      </header>
      <Lines text={entry.sanskrit} lang="sa-Deva" className="font-devanagari text-xl sm:text-2xl leading-relaxed mb-4" />
      <Lines text={entry.iast} lang="sa-Latn" className="text-sm italic text-[var(--fg-muted)] leading-relaxed mb-5" />
      {entry.translation && (
        <blockquote className="mt-auto border-l-2 border-[var(--color-vermillion)] pl-4 leading-relaxed">{entry.translation}</blockquote>
      )}
    </article>
  );
}

/**
 * Verse of the Day + Subhāṣita of the day. The browser computes its own
 * local date and fetches that date's small cached file, so the pick changes
 * at the visitor's midnight without a rebuild (docs/08 §2). Entries are
 * managed in /admin (Verse of the Day, Subhāṣita, Schedule). Hides itself
 * entirely when nothing is published.
 */
export default function DailyPanel() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/daily/${localDate()}`)
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
    <section aria-labelledby="today-heading" className="max-w-5xl mx-auto px-5 py-16">
      <div className="text-center mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3">For today</p>
        <h2 id="today-heading" className="text-2xl sm:text-3xl font-semibold">
          {state.status === "ready" ? prettyDate(state.data.date) : " "}
        </h2>
      </div>

      {state.status === "loading" ? (
        <div className="grid md:grid-cols-2 gap-6" aria-hidden>
          <div className="anv-skeleton !h-72" />
          <div className="anv-skeleton !h-72" />
        </div>
      ) : (
        <div className={`grid gap-6 ${state.data.verseOfDay && state.data.subhashita ? "md:grid-cols-2" : "max-w-2xl mx-auto"}`}>
          {state.data.verseOfDay && <DailyCard title="Verse of the Day" entry={state.data.verseOfDay} icon={BookOpenText} />}
          {state.data.subhashita && <DailyCard title="Subhāṣita of the day" entry={state.data.subhashita} icon={Quote} />}
        </div>
      )}
    </section>
  );
}
