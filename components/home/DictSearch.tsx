"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export default function DictSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"word" | "meaning">("word");
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    router.push(`/tools/dictionary/search${t ? `?q=${encodeURIComponent(t)}${mode === "meaning" ? "&mode=meaning" : ""}` : ""}`);
  };
  return (
    <form onSubmit={go} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-[var(--shadow-lift)] sm:p-5">
      <div className="mb-3 ui-seg" role="group" aria-label="Search by">
        <button type="button" aria-pressed={mode === "word"} onClick={() => setMode("word")}>
          Sanskrit word
        </button>
        <button type="button" aria-pressed={mode === "meaning"} onClick={() => setMode("meaning")}>
          English meaning
        </button>
      </div>
      <label className="ui-trigger ui-trigger-lg !pr-2">
        <Search size={17} className="text-[var(--fg-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={mode === "word" ? "कृष्ण · kṛṣṇa · krsna · krishna" : "e.g. lotus, mercy, God"}
          className="dict-noring min-w-0 flex-1 bg-transparent text-base outline-none"
          aria-label="Search the dictionary"
        />
        <button type="submit" className="ui-btn ui-btn-primary ui-btn-sm">
          Search
        </button>
      </label>
      <p className="mt-3 flex flex-wrap gap-1.5 text-xs text-[var(--fg-muted)]">
        Try:
        {["kṛṣṇa", "हरि", "bhakti", "rasa"].map((w) => (
          <button key={w} type="button" onClick={() => router.push(`/tools/dictionary/search?q=${encodeURIComponent(w)}`)} className="rounded-full border border-[var(--border)] px-2 py-0.5 hover:border-[var(--accent)]">
            {w}
          </button>
        ))}
      </p>
    </form>
  );
}
