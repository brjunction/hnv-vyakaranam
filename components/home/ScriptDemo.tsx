"use client";

import { useState } from "react";
import { VerseLinesIn } from "@/components/scriptures/ScriptText";
import type { ScriptName } from "@/lib/scriptures/core";

// Bhagavad-gītā 2.47, stored once in IAST — every script below is made from it on the fly.
const IAST = "karmaṇy evādhikāras te mā phaleṣu kadācana / mā karma-phala-hetur bhūr mā te saṅgo 'stv akarmaṇi";
const OPTS: [ScriptName, string][] = [
  ["devanagari", "देवनागरी"],
  ["iast", "IAST"],
  ["bengali", "বাংলা"],
  ["oriya", "ଓଡ଼ିଆ"],
];

export default function ScriptDemo() {
  const [s, setS] = useState<ScriptName>("devanagari");
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 shadow-[var(--shadow-lift)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--color-saffron)]">Bhagavad-gītā 2.47</span>
        <div className="ui-seg" role="group" aria-label="Script">
          {OPTS.map(([v, l]) => (
            <button key={v} type="button" aria-pressed={s === v} onClick={() => setS(v)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-[5.5rem]">
        <VerseLinesIn devanagari="" iast={IAST} script={s} size="lg" lineClass="py-0.5" />
      </div>
      <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs text-[var(--fg-muted)]">
        Typed once in IAST. Every script is made from it — with the words joined just as the books print them.
      </p>
    </div>
  );
}
