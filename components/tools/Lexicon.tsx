"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownAZ, ChevronDown, Search, X } from "lucide-react";
import { VerseLinesIn } from "@/components/scriptures/ScriptText";
import { ScriptPicker } from "@/components/scriptures/Panes";
import { useReaderPrefs } from "@/components/scriptures/prefs";

// A real searcher for a word list (dhātus, avyayas): search the headword (with
// or without diacritics, in IAST, Devanagari or Harvard-Kyoto), its Sanskrit
// meaning, its English meaning, or everything; begins-with / contains / exact;
// filter chips; browse by first letter in Sanskrit order; sort; open a card
// for the details and its namesakes.

export type LexField = { key: string; label: string; sa?: boolean };
export type LexChip = { key: string; label: string; options: { value: string; label: string; hint?: string }[]; match?: "exact" | "contains" };
export type LexConfig = {
  head: string; // headword field
  /** the bare word used for "begins with", letters and sorting (e.g. the dhātu without its anubandha) */
  bare?: (r: Record<string, string>) => string;
  fields: LexField[]; // searchable / shown
  chips?: LexChip[];
  badges?: (r: Record<string, string>) => string[];
  placeholder: string;
};

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\[\]()’'`]/g, "")
    .toLowerCase();
// Sanskrit alphabetical order (IAST)
const ORDER = ["a", "ā", "i", "ī", "u", "ū", "ṛ", "ṝ", "ḷ", "ḹ", "e", "ai", "o", "au", "ṁ", "ḥ", "k", "kh", "g", "gh", "ṅ", "c", "ch", "j", "jh", "ñ", "ṭ", "ṭh", "ḍ", "ḍh", "ṇ", "t", "th", "d", "dh", "n", "p", "ph", "b", "bh", "m", "y", "r", "l", "v", "ś", "ṣ", "s", "h"];
const RANK = new Map(ORDER.map((x, i) => [x, i]));
function letters(w: string): string[] {
  const s = w.normalize("NFC").toLowerCase().replace(/[^a-zāīūṛṝḷḹṅñṭḍṇśṣṁṃḥ]/g, "");
  const out: string[] = [];
  for (let i = 0; i < s.length; ) {
    const two = s.slice(i, i + 2);
    if (RANK.has(two) && two.length === 2) {
      out.push(two);
      i += 2;
    } else {
      out.push(s[i] === "ṃ" ? "ṁ" : s[i]);
      i += 1;
    }
  }
  return out;
}
const sortKey = (w: string) => letters(w).map((l) => String((RANK.get(l) ?? 60) + 10).padStart(2, "0")).join("");
const INITIALS = ["a", "ā", "i", "ī", "u", "ū", "ṛ", "e", "ai", "o", "au", "k", "kh", "g", "gh", "c", "ch", "j", "jh", "ṭ", "ḍ", "ṇ", "t", "th", "d", "dh", "n", "p", "ph", "b", "bh", "m", "y", "r", "l", "v", "ś", "ṣ", "s", "h"];

function Hl({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const f = fold(text);
  const i = f.indexOf(q);
  if (i < 0) return <>{text}</>;
  // map folded index back (diacritics fold to one char each, so lengths match after NFC)
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-[var(--accent)]/30 px-0.5 text-inherit">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function Lexicon({ rows, config }: { rows: Record<string, string>[]; config: LexConfig }) {
  const [prefs, setPrefs] = useReaderPrefs();
  const [raw, setRaw] = useState("");
  const [q, setQ] = useState("");
  const [where, setWhere] = useState<string>("head");
  const [how, setHow] = useState<"begins" | "contains" | "exact">("contains");
  const [chips, setChips] = useState<Record<string, string>>({});
  const [initial, setInitial] = useState("");
  const [sort, setSort] = useState<"sanskrit" | "list">("sanskrit");
  const [limit, setLimit] = useState(120);
  const [open, setOpen] = useState<number | null>(null);
  const bare = config.bare ?? ((r: Record<string, string>) => r[config.head]);

  // Devanagari / Harvard-Kyoto input → IAST
  useEffect(() => {
    let live = true;
    const t = raw.trim();
    (async () => {
      if (/[ऀ-ॿ]/.test(t)) {
        const { default: S } = await import("@indic-transliteration/sanscript");
        if (live) setQ(fold(S.t(t, "devanagari", "iast")));
      } else if (/[A-Z]/.test(t.slice(1)) && /^[A-Za-z~^ ]+$/.test(t)) {
        const { default: S } = await import("@indic-transliteration/sanscript");
        if (live) setQ(fold(S.t(t, "hk", "iast")));
      } else setQ(fold(t));
    })();
    setLimit(120);
    return () => {
      live = false;
    };
  }, [raw]);

  const indexed = useMemo(() => rows.map((r, i) => ({ r, i, bare: bare(r), sk: sortKey(bare(r)), first: letters(bare(r))[0] ?? "", f: Object.fromEntries(config.fields.map((x) => [x.key, fold(r[x.key] ?? "")])), fb: fold(bare(r)) })), [rows, config.fields, bare]);

  const shown = useMemo(() => {
    const test = (v: string) => (how === "exact" ? v === q : how === "begins" ? v.startsWith(q) || v.split(/[\s,;—-]+/).some((w) => w.startsWith(q)) : v.includes(q));
    let out = indexed.filter((x) => {
      if (initial && x.first !== initial) return false;
      for (const c of config.chips ?? []) {
        const v = chips[c.key];
        if (!v) continue;
        const have = String(x.r[c.key] ?? "");
        if (c.match === "contains" ? !have.split(/[,\s()]+/).includes(v) && !have.includes(v) : have !== v) return false;
      }
      if (!q) return true;
      if (where === "head") return how === "begins" ? x.fb.startsWith(q) : how === "exact" ? x.fb === q || x.f[config.head] === q : x.f[config.head].includes(q) || x.fb.includes(q);
      if (where === "all") return config.fields.some((f) => test(x.f[f.key]));
      return test(x.f[where] ?? "");
    });
    if (sort === "sanskrit") out = [...out].sort((a, b) => (a.sk < b.sk ? -1 : a.sk > b.sk ? 1 : a.i - b.i));
    // the headword that begins with the query comes first
    if (q && where !== "head") out = [...out].sort((a, b) => Number(b.fb.startsWith(q)) - Number(a.fb.startsWith(q)));
    return out;
  }, [indexed, q, where, how, chips, initial, sort, config]);

  const namesakes = (x: (typeof indexed)[number]) => indexed.filter((y) => y.i !== x.i && y.fb === x.fb);
  const firsts = useMemo(() => new Set(indexed.map((x) => x.first)), [indexed]);
  const sa = (v: string, cls = "") => <VerseLinesIn devanagari="" iast={v} script={prefs.script} className={`!leading-snug ${cls}`} />;

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 mb-4 grid gap-2 border-b border-[var(--border)] bg-[var(--bg)]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <label className="ui-trigger min-w-[16rem] flex-1 !pr-2">
            <Search size={16} className="shrink-0 text-[var(--fg-muted)]" />
            <input value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={config.placeholder} className="dict-noring min-w-0 flex-1 bg-transparent text-[0.95rem] outline-none" autoFocus />
            {raw && (
              <button type="button" onClick={() => setRaw("")} aria-label="Clear" className="ui-icon-btn ui-btn-sm !h-7 !w-7">
                <X size={14} />
              </button>
            )}
          </label>
          <ScriptPicker prefs={prefs} setPrefs={setPrefs} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="ui-seg" role="group" aria-label="Search in">
            {[{ key: "head", label: config.fields.find((f) => f.key === config.head)?.label ?? "Word" }, ...config.fields.filter((f) => f.key !== config.head), { key: "all", label: "Everything" }].map((f) => (
              <button key={f.key} type="button" aria-pressed={where === f.key} onClick={() => setWhere(f.key)}>
                {f.label}
              </button>
            ))}
          </span>
          <span className="ui-seg" role="group" aria-label="Match">
            {(["begins", "contains", "exact"] as const).map((h) => (
              <button key={h} type="button" aria-pressed={how === h} onClick={() => setHow(h)}>
                {h === "begins" ? "Begins with" : h === "contains" ? "Contains" : "Exact"}
              </button>
            ))}
          </span>
          <button type="button" className="ui-btn" onClick={() => setSort((s) => (s === "sanskrit" ? "list" : "sanskrit"))} title="Sort order">
            <ArrowDownAZ size={15} /> {sort === "sanskrit" ? "Sanskrit order" : "Book order"}
          </button>
          <span className="ml-auto text-xs text-[var(--fg-muted)]">{shown.length.toLocaleString()} of {rows.length.toLocaleString()}</span>
        </div>
        {config.chips?.map((c) => (
          <div key={c.key} className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="w-16 shrink-0 font-semibold uppercase tracking-wider text-[var(--fg-muted)]">{c.label}</span>
            {c.options.map((o) => (
              <button
                key={o.value}
                type="button"
                title={o.hint}
                onClick={() => setChips({ ...chips, [c.key]: chips[c.key] === o.value ? "" : o.value })}
                className={`rounded-full border px-2.5 py-1 ${chips[c.key] === o.value ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--color-ink)]" : "border-[var(--border)] hover:border-[var(--accent)]"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        ))}
        <div className="flex flex-wrap gap-1 text-sm" aria-label="First letter">
          {INITIALS.filter((l) => firsts.has(l)).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setInitial(initial === l ? "" : l)}
              className={`min-w-[2rem] rounded-lg border px-1.5 py-0.5 ${initial === l ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--color-ink)]" : "border-transparent hover:border-[var(--border)]"}`}
            >
              {sa(l, "!text-sm")}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid gap-2 md:grid-cols-2">
        {shown.slice(0, limit).map((x) => {
          const isOpen = open === x.i;
          const same = isOpen ? namesakes(x) : [];
          return (
            <li key={x.i} className={`rounded-2xl border bg-[var(--bg-2)] ${isOpen ? "border-[var(--accent)] md:col-span-2" : "border-[var(--border)]"}`}>
              <button type="button" onClick={() => setOpen(isOpen ? null : x.i)} className="flex w-full items-start gap-3 p-3 text-left" aria-expanded={isOpen}>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{sa(x.r[config.head])}</span>
                  {config.fields
                    .filter((f) => f.key !== config.head && x.r[f.key])
                    .map((f) => (
                      <span key={f.key} className={`mt-0.5 block text-sm ${f.sa ? "" : "text-[var(--fg-muted)]"}`}>
                        {f.sa ? sa(x.r[f.key], "!text-sm") : <Hl text={x.r[f.key]} q={where === f.key || where === "all" ? q : ""} />}
                      </span>
                    ))}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {config.badges?.(x.r).map((b) => (
                    <span key={b} className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 text-[11px]">
                      {b}
                    </span>
                  ))}
                  <ChevronDown size={15} className={`text-[var(--fg-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-[var(--border)] px-3 pb-3 pt-2 text-sm">
                  <dl className="grid gap-1 sm:grid-cols-[10rem_1fr]">
                    {Object.entries(x.r)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="text-[var(--fg-muted)]">{config.fields.find((f) => f.key === k)?.label ?? config.chips?.find((c) => c.key === k)?.label ?? k}</dt>
                          <dd>{config.fields.find((f) => f.key === k)?.sa ? sa(v, "!text-sm") : (config.chips?.find((c) => c.key === k)?.options.find((o) => o.value === v)?.hint ?? v)}</dd>
                        </div>
                      ))}
                  </dl>
                  {same.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Same word elsewhere</p>
                      <ul className="grid gap-1">
                        {same.map((y) => (
                          <li key={y.i}>
                            <button type="button" className="text-left hover:text-[var(--accent)]" onClick={() => setOpen(y.i)}>
                              {sa(y.r[config.head], "!text-sm inline")} — {config.badges?.(y.r).join(" · ")} — {y.r[config.fields[config.fields.length - 1].key]}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!shown.length && <p className="py-10 text-center text-[var(--fg-muted)]">Nothing found. Try “Contains”, “Everything”, or fewer filters.</p>}
      {shown.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + 200)} className="ui-btn mx-auto mt-4 flex">
          Show more ({(shown.length - limit).toLocaleString()} left)
        </button>
      )}
    </div>
  );
}
