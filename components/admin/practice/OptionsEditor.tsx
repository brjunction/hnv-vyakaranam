"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Plus, X } from "lucide-react";
import { inputCls } from "@/components/admin/ActionForm";

/** Answer options with a "correct" marker. Submits option_0…option_7 and `correct`. */
export default function OptionsEditor({ initial, initialCorrect }: { initial: string[]; initialCorrect: number }) {
  const [options, setOptions] = useState<string[]>(initial.length >= 2 ? initial : [...initial, "", "", "", ""].slice(0, 4));
  const [correct, setCorrect] = useState(initialCorrect);

  function remove(i: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, k) => k !== i));
    if (correct === i) setCorrect(0);
    else if (correct > i) setCorrect(correct - 1);
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name="correct" value={correct} />
      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCorrect(i)}
            title={correct === i ? "Correct answer" : "Mark as the correct answer"}
            aria-label={correct === i ? `Option ${i + 1} is correct` : `Mark option ${i + 1} correct`}
            className={correct === i ? "text-[var(--success)]" : "text-[var(--fg-faint)] hover:text-[var(--fg)]"}
          >
            {correct === i ? <CheckCircle2 size={22} /> : <Circle size={22} />}
          </button>
          <input
            name={`option_${i}`}
            value={o}
            onChange={(e) => setOptions(options.map((x, k) => (k === i ? e.target.value : x)))}
            placeholder={correct === i ? "Correct answer" : `Wrong option ${i + 1}`}
            className={`${inputCls} font-devanagari text-lg ${correct === i ? "border-[var(--success)]" : ""}`}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={options.length <= 2}
            title="Remove option"
            aria-label={`Remove option ${i + 1}`}
            className="text-[var(--fg-faint)] hover:text-[var(--danger)] disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>
      ))}
      {options.length < 8 && (
        <button
          type="button"
          onClick={() => setOptions([...options, ""])}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-1.5 text-sm hover:border-[var(--fg)]"
        >
          <Plus size={14} /> Add option
        </button>
      )}
      <p className="text-xs text-[var(--fg-muted)]">
        Tap the circle to mark the correct answer. Players always see the options in a random order.
      </p>
    </div>
  );
}
