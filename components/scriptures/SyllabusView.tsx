"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ScriptPicker } from "@/components/scriptures/Panes";
import { useReaderPrefs } from "@/components/scriptures/prefs";
import { convertScript, type ScriptName } from "@/lib/scriptures/core";
import type { Syllabus } from "@/lib/data/scriptures";

// Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura's order of study, exactly as
// printed (Devanagari), in the reader's script. A work that is in our
// library links to it.

type LibBook = { code: string; titleDeva: string; title: string; ready: boolean };

/** Loose key for matching a printed title with a library book. */
const k = (s: string) =>
  s
    .replace(/\(.*?\)/g, "")
    .replace(/^श्री(मद्)?|^श्रीश्री/, "")
    .replace(/[\s\-–—ःंँ्]/g, "")
    .replace(/म$/, "")
    .trim();

type Seg = { text: string; sep: string; code?: string; ready?: boolean };

function segments(item: string, lib: Map<string, LibBook>): Seg[] {
  const parts = item.split(/(,\s*|\s—\s)/);
  const out: Seg[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const text = parts[i];
    const b = lib.get(k(text));
    out.push({ text, sep: parts[i + 1] ?? "", code: b?.code, ready: b?.ready });
  }
  return out;
}

function useConverted(all: string[], script: ScriptName) {
  const [map, setMap] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let live = true;
    if (script === "devanagari") return setMap(new Map());
    const uniq = [...new Set(all)];
    Promise.all(uniq.map((t) => convertScript(t, "devanagari", script))).then((out) => live && setMap(new Map(uniq.map((t, i) => [t, out[i]]))));
    return () => {
      live = false;
    };
  }, [all, script]);
  return (t: string) => (script === "devanagari" ? t : map.get(t) ?? t);
}

export default function SyllabusView({ data, books }: { data: Syllabus; books: LibBook[] }) {
  const [prefs, setPrefs] = useReaderPrefs();
  const lib = useMemo(() => {
    const m = new Map<string, LibBook>();
    for (const b of books) if (b.titleDeva) m.set(k(b.titleDeva), b);
    return m;
  }, [books]);
  const strings = useMemo(() => {
    const s = [data.title, data.subtitle, data.closing];
    for (const x of data.subjects) {
      s.push(x.name, x.primaryLabel, x.secondaryLabel);
      for (const it of [...x.primary, ...x.secondary]) for (const g of segments(it, lib)) s.push(g.text);
    }
    return s;
  }, [data, lib]);
  const t = useConverted(strings, prefs.script);
  const font = prefs.script === "iast" ? "" : "font-devanagari";
  const linked = useMemo(() => data.subjects.flatMap((x) => [...x.primary, ...x.secondary]).flatMap((it) => segments(it, lib)).filter((g) => g.code).length, [data, lib]);

  const Item = ({ it, n }: { it: string; n: number }) => (
    <li className="syl-item">
      <span className="syl-n">{n}</span>
      <span className={font}>
        {segments(it, lib).map((g, i) => (
          <span key={i}>
            {g.code ? (
              <Link href={`/scriptures/${g.code}`} className={`syl-link ${g.ready ? "" : "soon"}`} title={g.ready ? "Read it here" : "In the library — coming soon"}>
                {t(g.text)}
              </Link>
            ) : (
              t(g.text)
            )}
            {g.sep}
          </span>
        ))}
      </span>
    </li>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className={`min-w-0 ${font}`}>
          <p className="text-xl font-semibold leading-snug sm:text-2xl">{t(data.title)}</p>
          <p className="text-base text-[var(--fg-muted)]">{t(data.subtitle)}</p>
        </div>
        <ScriptPicker prefs={prefs} setPrefs={setPrefs} />
      </div>
      <p className="mb-6 text-xs text-[var(--fg-muted)]">
        {data.source}. Ten subjects; under each, the principal (<span className={font}>{t("मुख्य")}</span>) and the secondary (<span className={font}>{t("गौण")}</span>) works.
        {linked > 0 && <> Underlined works are in this library.</>}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.subjects.map((x) => (
          <section key={x.n} className="syl-card">
            <header className="mb-3 flex items-baseline gap-3">
              <span className="syl-badge">{x.n}</span>
              <span className={`text-lg font-semibold ${font}`}>{t(x.name)}</span>
              <span className="text-sm text-[var(--fg-muted)]">{x.nameEn}</span>
            </header>
            <p className={`syl-label ${font}`}>{t(x.primaryLabel)} · principal</p>
            <ol className="mb-3 grid gap-1">
              {x.primary.map((it, i) => (
                <Item key={i} it={it} n={i + 1} />
              ))}
            </ol>
            {x.secondary.length > 0 && (
              <>
                <p className={`syl-label ${font}`}>{t(x.secondaryLabel)} · secondary</p>
                <ol className="grid gap-1 text-[0.95em] text-[var(--fg-muted)]">
                  {x.secondary.map((it, i) => (
                    <Item key={i} it={it} n={i + 1} />
                  ))}
                </ol>
              </>
            )}
          </section>
        ))}
      </div>
      <p className={`mt-6 text-center text-[var(--fg-muted)] ${font}`}>{t(data.closing)}</p>
    </div>
  );
}
