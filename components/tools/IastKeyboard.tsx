"use client";

import { useRef, useState } from "react";
import { Check, Copy, Eraser } from "lucide-react";

// IAST keyboard: type plain letters, then press Right Shift (on its own) to
// turn the letter before the cursor into the next one with a diacritic:
// a → ā → a, s → ś → ṣ → s, n → ṅ → ñ → ṇ … The buttons insert directly.

const KEYS = ["ā", "ī", "ū", "ṛ", "ṝ", "ḷ", "ḹ", "ṅ", "ñ", "ṭ", "ḍ", "ṇ", "ś", "ṣ", "ṁ", "ṃ", "ḥ", "’", "—", "।", "॥"];

export default function IastKeyboard() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [caps, setCaps] = useState(false);

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
        This works in every text box on the site (search, notes, the converter …). Type normally. To add a diacritic, press <kbd className="rounded border border-[var(--border)] px-1.5">Shift</kbd> (left or right) on its own right after the letter — press again for the next: a → ā, i → ī, u → ū, r → ṛ → ṝ, l → ḷ → ḹ, n → ṇ → ṅ → ñ, t → ṭ, d → ḍ, s → ṣ → ś, m → ṁ → ṃ, h → ḥ. Or tap the letters below.
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
        rows={10}
        spellCheck={false}
        autoFocus
        placeholder="Type here… e.g. kr Shift s Shift n Shift a → kṛṣṇa"
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
