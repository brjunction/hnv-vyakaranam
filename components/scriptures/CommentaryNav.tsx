"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquareText } from "lucide-react";
import Select from "@/components/ui/Select";
import { RichIn } from "@/components/scriptures/ScriptText";
import type { ReaderPrefs } from "@/components/scriptures/prefs";
import type { CommentaryType, ScriptName } from "@/lib/scriptures/core";

// Commentaries: ONE dropdown (searchable when there are many). Each entry
// shows the author and a dot: filled = has text for this verse. "All" reads
// every available commentary one after another. [ and ] step through them.
// The Anvaya and the Translation are not here: they belong to the verse.

type SetPrefs = (p: Partial<ReaderPrefs>) => void;
const LANG: Record<string, string> = { sanskrit: "Sanskrit", english: "English", bengali: "Bengali", hindi: "Hindi", nepali: "Nepali", odia: "Odia", other: "" };

function Body({ t, html, script }: { t: CommentaryType; html?: string; script: ScriptName }) {
  return html ? (
    <RichIn html={html} english={t.language === "english"} script={script} className="leading-relaxed" />
  ) : (
    <p className="text-sm italic text-[var(--fg-muted)]">{t.name} has no text for this verse yet.</p>
  );
}

function Byline({ t }: { t: CommentaryType }) {
  if (!t.author && !LANG[t.language]) return null;
  return (
    <p className="mb-4 text-xs text-[var(--fg-muted)]">
      {t.author}
      {t.author && LANG[t.language] ? " · " : ""}
      {LANG[t.language]}
    </p>
  );
}

export function CommentaryNav({
  bookCode, c, types, prefs, setPrefs, keys = false,
}: {
  bookCode: string; c: Record<number, string>; types: CommentaryType[]; prefs: ReaderPrefs; setPrefs: SetPrefs;
  /** compat: ignored (always a dropdown now) */
  variant?: "rail" | "compact"; keys?: boolean;
}) {
  const list = types.filter((t) => t.pane === "commentary" && t.appliesTo !== "division");
  const available = list.filter((t) => c[t.id]);
  const [local, setLocal] = useState<string | null>(null);
  const remembered = local ?? prefs.tab[bookCode];
  const current =
    remembered === "all" ? "all" : list.find((t) => t.key === remembered && (c[t.id] || local))?.key ?? available[0]?.key ?? list[0]?.key ?? "all";
  const pick = (k: string) => {
    setLocal(k);
    setPrefs({ tab: { ...prefs.tab, [bookCode]: k } });
  };
  const step = (dir: 1 | -1) => {
    const seq = (available.length ? available : list).map((t) => t.key);
    const i = seq.indexOf(current);
    const n = seq[(i + dir + seq.length) % seq.length];
    if (n) pick(n);
  };
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!keys) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "]") stepRef.current(1);
      if (e.key === "[") stepRef.current(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keys]);

  if (!list.length) return null;
  const cur = list.find((t) => t.key === current);
  const options = [
    ...list.map((t) => ({
      value: t.key,
      label: t.name,
      sub: [t.author, t.nameDeva].filter(Boolean).join(" · ") || undefined,
      dot: (c[t.id] ? "on" : "off") as "on" | "off",
    })),
    ...(list.length > 1 ? [{ value: "all", label: "All commentaries", sub: `Read the ${available.length} available one after another` }] : []),
  ];

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Select
            value={current}
            onChange={pick}
            options={options}
            size="lg"
            width={340}
            label="Commentary"
            meta={list.length > 1 ? `${available.length} of ${list.length} available` : undefined}
            icon={<MessageSquareText size={17} />}
            searchable={list.length > 7}
          />
        </div>
        {available.length > 1 && current !== "all" && (
          <span className="flex shrink-0 gap-1">
            <button type="button" onClick={() => step(-1)} className="ui-icon-btn" aria-label="Previous commentary" title="Previous commentary  [">
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => step(1)} className="ui-icon-btn" aria-label="Next commentary" title="Next commentary  ]">
              <ChevronRight size={16} />
            </button>
          </span>
        )}
      </div>

      {current === "all" ? (
        <div className="space-y-10">
          {(available.length ? available : list).map((t) => (
            <section key={t.key}>
              <h3 className="text-[1.05em] font-semibold">{t.name}</h3>
              <Byline t={t} />
              <Body t={t} html={c[t.id]} script={prefs.script} />
            </section>
          ))}
        </div>
      ) : cur ? (
        <section>
          <Byline t={cur} />
          <Body t={cur} html={c[cur.id]} script={prefs.script} />
        </section>
      ) : null}
    </div>
  );
}
