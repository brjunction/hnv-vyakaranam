"use client";

import { useRef, useState } from "react";
import { Check, Copy, Eraser } from "lucide-react";

// IAST keyboard: type plain letters, then press Left Shift (on its own) to
// turn the letter before the cursor into the next one with a diacritic:
// a → ā → a, s → ś → ṣ → s, n → ṅ → ñ → ṇ … The buttons insert directly.

const CYCLE: Record<string, string> = {};
for (const ring of ["aā", "iī", "uū", "rṛṝ", "lḷḹ", "nṅñṇ", "tṭ", "dḍ", "sśṣ", "mṁṃ", "hḥ", "AĀ", "IĪ", "UŪ", "RṚṜ", "LḶḸ", "NṄÑṆ", "TṬ", "DḌ", "SŚṢ", "MṀṂ", "HḤ"]) {
  const c = [...ring];
  c.forEach((ch, i) => (CYCLE[ch] = c[(i + 1) % c.length]));
}
const KEYS = ["ā", "ī", "ū", "ṛ", "ṝ", "ḷ", "ḹ", "ṅ", "ñ", "ṭ", "ḍ", "ṇ", "ś", "ṣ", "ṁ", "ṃ", "ḥ", "’", "—", "।", "॥"];

export default function IastKeyboard() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [caps, setCaps] = useState(false);
  const shiftAlone = useRef(false);

  const replaceBefore = (fn: (ch: string) => string | null) => {
    const el = ref.current;
    if (!el) return;
    const at = el.selectionStart;
    if (at === 0 || at !== el.selectionEnd) return;
    // the textarea's own value: it is always current, even between quick key presses
    const cur = el.value;
    const next = fn(cur[at - 1]);
    if (!next) return;
    const v = cur.slice(0, at - 1) + next + cur.slice(at);
    el.value = v;
    el.setSelectionRange(at, at);
    setText(v);
  };
  const insert = (s: string) => {
    const el = ref.current;
    if (!el) return;
    const a = el.selectionStart;
    const b = el.selectionEnd;
    const v = el.value.slice(0, a) + s + el.value.slice(b);
    el.value = v;
    el.focus();
    el.setSelectionRange(a + s.length, a + s.length);
    setText(v);
  };

  return (
    <div className="grid gap-4">
      <p className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-4 text-sm leading-relaxed">
        Type normally. To add a diacritic, press <kbd className="rounded border border-[var(--border)] px-1.5">Left Shift</kbd> on its own right after the letter — press it again to go on:
        a → ā, i → ī, u → ū, r → ṛ → ṝ, l → ḷ → ḹ, n → ṅ → ñ → ṇ, t → ṭ, d → ḍ, s → ś → ṣ, m → ṁ → ṃ, h → ḥ. Or tap the letters below.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {KEYS.map((k) => {
          const up = caps && k.toUpperCase() !== k ? k.toUpperCase() : k;
          return (
            <button key={k} type="button" onClick={() => insert(up)} className="ui-btn min-w-[2.6rem] justify-center text-lg">
              {up}
            </button>
          );
        })}
        <button type="button" onClick={() => setCaps((c) => !c)} aria-pressed={caps} className="ui-btn">
          Aa
        </button>
      </div>
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          shiftAlone.current = e.key === "Shift" && e.location === 1;
        }}
        onKeyUp={(e) => {
          if (e.key === "Shift" && e.location === 1 && shiftAlone.current) replaceBefore((ch) => CYCLE[ch] ?? null);
          shiftAlone.current = false;
        }}
        rows={10}
        spellCheck={false}
        autoFocus
        placeholder="Type here… e.g. krsna, then Left Shift after r, s and n"
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 text-xl leading-relaxed outline-none focus:border-[var(--accent)]"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="ui-btn ui-btn-primary"
          disabled={!text}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" className="ui-btn" onClick={() => setText("")} disabled={!text}>
          <Eraser size={15} /> Clear
        </button>
        <a href={`/tools/text/converter`} className="ui-btn">
          Convert to Devanagari →
        </a>
      </div>
    </div>
  );
}
