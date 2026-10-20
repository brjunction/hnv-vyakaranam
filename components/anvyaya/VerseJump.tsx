"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** "Go to verse" box: type 1.12.1 (SB) or 18.6 (BG) and jump straight there. */
export default function VerseJump({ bookCode, hasChapters }: { bookCode: string; hasChapters: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const maxParts = hasChapters ? 3 : 2;
  const example = hasChapters ? "1.12.1" : "18.6";

  function go(e: React.FormEvent) {
    e.preventDefault();
    const parts = value
      .trim()
      .replace(/^(sb|bg)\s*/i, "")
      .split(/[.:/\s]+/)
      .filter(Boolean);
    const ok =
      parts.length >= 1 &&
      parts.length <= maxParts &&
      parts.every((p, i) => (i === parts.length - 1 && parts.length === maxParts ? /^\d+(-\d+)?$/.test(p) : /^\d+$/.test(p)));
    if (!ok) {
      setError(`Try a number like ${example}`);
      return;
    }
    setError("");
    router.push(`/anvyaya/${bookCode}/${parts.join("/")}`);
  }

  return (
    <form onSubmit={go} className="flex flex-col items-center gap-2">
      <div className="flex w-full max-w-sm rounded-full border border-[var(--border)] bg-[var(--bg)] overflow-hidden focus-within:border-[var(--accent)] transition-colors">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Go to verse — e.g. ${example}`}
          aria-label="Go to verse"
          className="flex-1 bg-transparent px-5 py-2.5 text-sm outline-none placeholder:text-[var(--fg-muted)]"
        />
        <button
          type="submit"
          className="px-5 text-sm font-medium bg-[var(--accent)] text-[var(--color-ink)] hover:opacity-90 transition-opacity"
        >
          Go
        </button>
      </div>
      {error && <p className="text-xs text-[var(--color-vermillion)]">{error}</p>}
    </form>
  );
}
