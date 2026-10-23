"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2, Loader2, Repeat2, X } from "lucide-react";
import Reader from "@/components/scriptures/Reader";
import { readingOrder, type BookInfo, type DivisionData, type TreeNode } from "@/lib/scriptures/core";

type Loc = { book: string; path: string[]; verse?: string };
type Loaded = { book: BookInfo; tree: TreeNode[]; data: DivisionData | null; verse: string | null };

const parseLoc = (s: string | null, fallback: string): Loc => {
  const parts = (s || fallback).split("/").filter(Boolean);
  return { book: parts[0] ?? "", path: parts.slice(1) };
};
const locStr = (l: Loaded) => (l.data ? [l.book.code, ...l.data.division.path, l.verse].filter(Boolean).join("/") : l.book.code);

function useLocation(initial: Loc) {
  const [loc, setLoc] = useState<Loc>(initial);
  const [state, setState] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!loc.book) return;
    let live = true;
    setLoading(true);
    fetch(`/api/scriptures/loc?book=${loc.book}&path=${[...loc.path, ...(loc.verse ? [loc.verse] : [])].join("/")}`)
      .then((r) => r.json())
      .then((d: Loaded & { error?: string }) => live && !d.error && setState(d))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [loc.book, loc.path.join("/"), loc.verse]); // eslint-disable-line react-hooks/exhaustive-deps
  return { loc, setLoc, state, loading };
}

/** Two readers side by side (desktop) or as A/B tabs (mobile); the URL keeps both places, so a dual view can be shared. */
export default function DualReader({ books }: { books: { code: string; title: string }[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const first = books[0]?.code ?? "";
  const second = books[1]?.code ?? first;
  const A = useLocation(parseLoc(sp.get("a"), first));
  const B = useLocation(parseLoc(sp.get("b"), second));
  const [tab, setTab] = useState<"a" | "b">("a");
  const [linked, setLinked] = useState(false);
  const [copied, setCopied] = useState(false);

  // keep the URL in sync (shareable)
  useEffect(() => {
    if (!A.state || !B.state) return;
    const u = `/scriptures/read?a=${encodeURIComponent(locStr(A.state))}&b=${encodeURIComponent(locStr(B.state))}`;
    router.replace(u, { scroll: false });
  }, [A.state, B.state, router]);

  // linked navigation: moving one side by one verse moves the other too
  const step = useCallback((s: Loaded | null, dir: 1 | -1): Loc | null => {
    if (!s?.data) return null;
    const vs = s.data.verses;
    const i = vs.findIndex((v) => v.key === s.verse);
    if (i + dir >= 0 && i + dir < vs.length) return { book: s.book.code, path: s.data.division.path, verse: vs[i + dir].key };
    const order = readingOrder(s.tree);
    const oi = order.findIndex((n) => n.id === s.data!.division.id);
    const n = order[oi + dir];
    return n ? { book: s.book.code, path: n.path, verse: (dir === 1 ? n.firstVerse : n.lastVerse) ?? undefined } : null;
  }, []);

  const side = (S: ReturnType<typeof useLocation>, other: ReturnType<typeof useLocation>, name: "a" | "b") => (
    <div className={`min-w-0 ${tab === name ? "" : "hidden lg:block"}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--color-ink)]">{name.toUpperCase()}</span>
        <select
          value={S.loc.book}
          onChange={(e) => S.setLoc({ book: e.target.value, path: [] })}
          className="h-9 flex-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 text-sm font-semibold"
          aria-label={`Scripture ${name.toUpperCase()}`}
        >
          {books.map((b) => (
            <option key={b.code} value={b.code}>
              {b.title}
            </option>
          ))}
        </select>
        {S.loading && <Loader2 size={16} className="animate-spin text-[var(--fg-muted)]" />}
      </div>
      {S.state?.data ? (
        <Reader
          book={S.state.book}
          tree={S.state.tree}
          data={S.state.data}
          verseKey={S.state.verse ?? ""}
          embedded
          side={name}
          onGo={(t) => {
            const before = S.state;
            S.setLoc({ book: S.loc.book, path: t.path, verse: t.verse });
            if (linked && before?.data) {
              const i = before.data.verses.findIndex((v) => v.key === before.verse);
              const j = t.path.join("/") === before.data.division.path.join("/") ? before.data.verses.findIndex((v) => v.key === t.verse) : -2;
              const dir = j === i + 1 || (j === -2 && t.verse === readingOrder(before.tree).find((n) => n.path.join("/") === t.path.join("/"))?.firstVerse) ? 1 : j === i - 1 ? -1 : 0;
              if (dir) {
                const o = step(other.state, dir as 1 | -1);
                if (o) other.setLoc(o);
              }
            }
          }}
        />
      ) : (
        !S.loading && <p className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--fg-muted)]">Nothing to read here yet.</p>
      )}
    </div>
  );

  if (!books.length) return <p className="py-16 text-center text-[var(--fg-muted)]">The scriptures are being prepared.</p>;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)]">Scriptures</p>
          <h1 className="text-2xl font-semibold">Dual reading</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setLinked((l) => !l)}
            aria-pressed={linked}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm ${linked ? "border-[var(--accent)] bg-[var(--accent)]/15" : "border-[var(--border)]"}`}
            title="Move both sides together, verse by verse"
          >
            <Link2 size={15} /> {linked ? "Linked" : "Link both"}
          </button>
          <button
            onClick={() => {
              const a = A.loc;
              A.setLoc(B.loc);
              B.setLoc(a);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border)] px-3 text-sm"
          >
            <Repeat2 size={15} /> Swap
          </button>
          <button
            onClick={async () => {
              await navigator.clipboard?.writeText(window.location.href).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border)] px-3 text-sm"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <a href={A.state ? `/scriptures/${locStr(A.state)}` : "/scriptures"} className="inline-flex h-9 items-center gap-1 rounded-full px-2 text-sm text-[var(--fg-muted)]" title="Close dual reading">
            <X size={16} />
          </a>
        </div>
      </div>
      <div className="mb-4 inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-2)] p-1 lg:hidden" role="tablist">
        {(["a", "b"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-[40px] rounded-full px-5 text-sm ${tab === k ? "bg-[var(--accent)] font-semibold text-[var(--color-ink)]" : ""}`}>
            {k.toUpperCase()} · {(k === "a" ? A : B).state?.book.abbrev || (k === "a" ? A : B).state?.book.title || "…"} {(k === "a" ? A : B).state?.data?.division.path.join(".")}
            {(k === "a" ? A : B).state?.verse ? "." + (k === "a" ? A : B).state?.verse : ""}
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {side(A, B, "a")}
        {side(B, A, "b")}
      </div>
    </div>
  );
}
