"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

// Citation generator: a sūtra (Madhyama / Bṛhat / Laghu), a scripture verse,
// or any page of the site — in MLA, APA, Chicago and a short form.

type Kind = "madhyama" | "brhat" | "laghu" | "verse" | "page";
const BOOKS: { code: string; title: string; abbrev: string; author: string }[] = [
  { code: "sb", title: "Śrīmad-Bhāgavatam", abbrev: "SB", author: "Kṛṣṇa-dvaipāyana Vyāsa" },
  { code: "bg", title: "Bhagavad-gītā", abbrev: "Bg.", author: "Kṛṣṇa-dvaipāyana Vyāsa" },
];
const EDITION: Record<string, string> = { madhyama: "Madhyama", brhat: "Bṛhat", laghu: "Laghu" };

export default function CitationGenerator({ site, siteName }: { site: string; siteName: string }) {
  const [kind, setKind] = useState<Kind>("madhyama");
  const [num, setNum] = useState("42");
  const [book, setBook] = useState("sb");
  const [ref, setRef] = useState("1.2.6");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [copied, setCopied] = useState("");
  const today = new Date();
  const accessed = today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const accessedApa = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const c = useMemo(() => {
    let what = "";
    let link = "";
    let author = "Jīva Gosvāmī";
    let container = "Harināmāmṛta-vyākaraṇa";
    if (kind === "madhyama" || kind === "brhat" || kind === "laghu") {
      const n = num.trim() || "1";
      what = `Sūtra ${n}`;
      container = `Harināmāmṛta-vyākaraṇa (${EDITION[kind]} edition)`;
      link = `${site}${kind === "madhyama" ? "" : `/${kind}`}/sutras/${encodeURIComponent(n)}`;
    } else if (kind === "verse") {
      const b = BOOKS.find((x) => x.code === book)!;
      const r = ref.trim().replace(/\s+/g, "") || "1.1";
      what = `${b.abbrev} ${r}`;
      container = b.title;
      author = b.author;
      link = `${site}/scriptures/${b.code}/${r.split(".").join("/")}`;
    } else {
      what = title.trim() || "Page";
      container = siteName;
      author = "";
      link = url.trim() || site;
    }
    const a = author ? `${author}. ` : "";
    return {
      MLA: `${a}“${what}.” ${container}, ${siteName}, ${link}. Accessed ${accessed}.`,
      APA: `${author ? `${author}. ` : ""}(n.d.). ${what}. In ${container}. ${siteName}. Retrieved ${accessedApa}, from ${link}`,
      Chicago: `${a}“${what}.” In ${container}. ${siteName}. Accessed ${accessed}. ${link}.`,
      Short: `${container}, ${what} — ${link}`,
    };
  }, [kind, num, book, ref, url, title, site, siteName, accessed, accessedApa]);

  const copy = async (k: string, v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(k);
      setTimeout(() => setCopied(""), 1500);
    } catch {}
  };
  const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="What to cite">
        {(
          [
            ["madhyama", "Sūtra · Madhyama"],
            ["brhat", "Sūtra · Bṛhat"],
            ["laghu", "Sūtra · Laghu"],
            ["verse", "Scripture verse"],
            ["page", "Any page"],
          ] as [Kind, string][]
        ).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className="ui-btn">
            {l}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {kind === "verse" ? (
          <>
            <label className="grid gap-1 text-sm">
              Scripture
              <select value={book} onChange={(e) => setBook(e.target.value)} className={input}>
                {BOOKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Verse (e.g. 1.2.6)
              <input value={ref} onChange={(e) => setRef(e.target.value)} className={input} />
            </label>
          </>
        ) : kind === "page" ? (
          <>
            <label className="grid gap-1 text-sm">
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="e.g. Sarveśvara-sandhi" />
            </label>
            <label className="grid gap-1 text-sm">
              Link
              <input value={url} onChange={(e) => setUrl(e.target.value)} className={input} placeholder={`${site}/…`} />
            </label>
          </>
        ) : (
          <label className="grid gap-1 text-sm">
            Sūtra number
            <input value={num} onChange={(e) => setNum(e.target.value)} className={input} />
          </label>
        )}
      </div>
      <div className="grid gap-3">
        {Object.entries(c).map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-saffron)]">{k}</span>
              <button type="button" className="ui-btn ui-btn-sm" onClick={() => copy(k, v)}>
                {copied === k ? <Check size={13} /> : <Copy size={13} />} {copied === k ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="break-words text-sm leading-relaxed">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
