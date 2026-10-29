"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Check as CheckIcon, Copy, Languages, ScanText } from "lucide-react";
import Select from "@/components/ui/Select";
import { SCHEMES, checkText, convertText, detectScheme, type Scheme } from "@/lib/text/convert";

type Mode = "auto" | "sanskrit" | "text";
const FONT: Partial<Record<Scheme, string>> = { devanagari: "font-devanagari", bengali: "font-devanagari", oriya: "font-devanagari" };
const label = (s: Scheme) => SCHEMES.find((x) => x.value === s)?.label ?? s;

/** Tools › Script & font converter: any script to any other, Sanskrit-aware. */
export default function ScriptConverter() {
  const [from, setFrom] = useState<Scheme | "auto">("auto");
  const [to, setTo] = useState<Scheme>("devanagari");
  const [mode, setMode] = useState<Mode>("auto");
  const [text, setText] = useState("");
  const [out, setOut] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("tools:converter") ?? "{}");
      if (p.to) setTo(p.to);
      if (p.from) setFrom(p.from);
      if (p.mode) setMode(p.mode);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("tools:converter", JSON.stringify({ from, to, mode }));
    } catch {}
  }, [from, to, mode]);

  const detected = useMemo(() => (text.trim() ? detectScheme(text) : null), [text]);
  const src: Scheme = from === "auto" ? detected ?? "iast" : from;
  const check = useMemo(() => (text.trim() ? checkText(text, src) : null), [text, src]);
  const sanskrit = mode === "auto" ? check?.sanskrit ?? true : mode === "sanskrit";

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      convertText(text, src, to, sanskrit)
        .then((r) => live && setOut(r))
        .catch(() => live && setOut(""));
    }, 120);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [text, src, to, sanskrit]);

  const swap = () => {
    setFrom(to);
    setTo(src);
    setText(out);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(out);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={from}
          onChange={(v) => setFrom(v as Scheme | "auto")}
          options={[{ value: "auto", label: detected ? `Detect · ${label(detected)}` : "Detect the script", sub: "Recognised from the text" }, ...SCHEMES]}
          icon={<Languages size={15} />}
          width={250}
          searchable={false}
        />
        <button type="button" className="ui-icon-btn" onClick={swap} title="Swap" aria-label="Swap the two scripts">
          <ArrowLeftRight size={16} />
        </button>
        <Select value={to} onChange={(v) => setTo(v as Scheme)} options={SCHEMES} icon={<Languages size={15} />} width={250} searchable={false} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="ui-seg" role="group" aria-label="Kind of text">
          {(
            [
              ["auto", "Check automatically"],
              ["sanskrit", "Sanskrit"],
              ["text", "Normal text"],
            ] as [Mode, string][]
          ).map(([m, l]) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {l}
            </button>
          ))}
        </span>
        {check && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--fg-muted)]" title={check.reasons.join(" · ")}>
            <ScanText size={14} />
            {check.sanskrit ? "Looks like Sanskrit" : "Looks like normal text"}
            {!check.sure && " (not sure)"} — {check.reasons.join(", ")}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--fg-muted)]">{label(src)}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            spellCheck={false}
            placeholder="Paste or type text — e.g. dharma-kṣetre kuru-kṣetre, or Balarama text like kåñëa"
            className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-4 text-lg leading-relaxed outline-none focus:border-[var(--accent)] ${FONT[src] ?? ""}`}
          />
        </label>
        <div className="grid gap-1.5">
          <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.15em] text-[var(--fg-muted)]">
            {label(to)}
            <button type="button" className="ui-btn ui-btn-sm normal-case tracking-normal" onClick={copy} disabled={!out}>
              {copied ? <CheckIcon size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
            </button>
          </span>
          <textarea
            value={out}
            readOnly
            rows={10}
            className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 text-lg leading-relaxed outline-none ${FONT[to] ?? ""}`}
          />
        </div>
      </div>

      <div className="grid gap-2 text-sm text-[var(--fg-muted)]">
        <p>
          <b className="text-[var(--fg)]">Sanskrit</b> is converted as Sanskrit: IAST words written apart are joined by sandhi in Devanagari, Bengali and Odia, compound hyphens
          are dropped, and a final virāma is kept. <b className="text-[var(--fg)]">Normal text</b> (English, or Bengali / Hindi / Odia as languages) is converted letter by letter, words stay
          apart, and the final virāma those languages don&apos;t write is left out.
        </p>
        <p>
          <b className="text-[var(--fg)]">Balarama</b> is the old font of BBT books and the HNV PDFs, where ä stands for ā, ç for ś, å for ṛ and so on. Text copied from such files
          converts to proper Unicode here; text converted <i>to</i> Balarama shows correctly only in the Balarama font.
        </p>
      </div>
    </div>
  );
}
