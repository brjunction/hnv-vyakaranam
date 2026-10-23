"use client";

import { useEffect, useState } from "react";
import { BookOpenText, Quote } from "lucide-react";
import { localDate, type DailyEntry, type DailyPayload } from "@/lib/daily/pick";
import { VerseLinesIn } from "@/components/scriptures/ScriptText";
import VaisnavaToday from "@/components/home/VaisnavaToday";
import { useReaderPrefs } from "@/components/scriptures/prefs";
import type { ScriptName } from "@/lib/scriptures/core";

type State = { status: "loading" } | { status: "ready"; data: DailyPayload } | { status: "empty" };

function prettyDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(y, m - 1, d)
  );
}

function DailyCard({ title, entry, icon: Icon, script }: { title: string; entry: DailyEntry; icon: typeof Quote; script: ScriptName }) {
  return (
    <article className="daily-card flex h-full flex-col p-5 sm:p-6">
      <header className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--accent)]">
          <Icon size={16} strokeWidth={1.75} />
        </span>
        <p className="text-sm font-semibold text-[var(--color-saffron)]">{title}</p>
        {entry.source && <p className="ml-auto truncate text-xs text-[var(--fg-muted)]">{entry.source}</p>}
      </header>
      {/* ONE script — the reader's choice (header switcher); made from whichever text was entered */}
      <div className="daily-verse mb-4">
        <VerseLinesIn devanagari={entry.sanskrit} iast={entry.iast} script={script} size="md" />
      </div>
      {entry.translation && <p className="daily-tr mt-auto">{entry.translation}</p>}
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
  const [prefs] = useReaderPrefs();

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
    <section aria-labelledby="today-heading" className="reveal max-w-5xl mx-auto px-5 py-12 sm:py-14">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3">For today</p>
        <h2 id="today-heading" className="text-2xl sm:text-3xl font-semibold">
          {state.status === "ready" ? prettyDate(state.data.date) : " "}
        </h2>
        <div className="mt-4 flex justify-center"><VaisnavaToday /></div>
      </div>

      {state.status === "loading" ? (
        <div className="grid md:grid-cols-2 gap-4" aria-hidden>
          <div className="anv-skeleton !h-40" />
          <div className="anv-skeleton !h-40" />
        </div>
      ) : (
        <div className={`grid gap-5 ${state.data.verseOfDay && state.data.subhashita ? "md:grid-cols-2" : "max-w-2xl mx-auto"}`}>
          {state.data.verseOfDay && <DailyCard title="Verse of the Day" entry={state.data.verseOfDay} icon={BookOpenText} script={prefs.script} />}
          {state.data.subhashita && <DailyCard title="Subhāṣita of the day" entry={state.data.subhashita} icon={Quote} script={prefs.script} />}
        </div>
      )}
    </section>
  );
}
