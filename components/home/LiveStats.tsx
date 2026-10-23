"use client";

import { useEffect, useRef, useState } from "react";

// Numbers that count up once when they scroll into view.
function Count({ to }: { to: number }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return setN(to);
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / 1400);
          setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return <span ref={ref}>{n.toLocaleString()}</span>;
}

export default function LiveStats({ items }: { items: { n: number; label: string; sub: string }[] }) {
  const shown = items.filter((i) => i.n > 0);
  if (!shown.length) return null;
  return (
    <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] ${shown.length > 4 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
      {shown.map((i) => (
        <div key={i.label} className="bg-[var(--bg)] px-5 py-6 text-center">
          <p className="text-3xl font-semibold tabular-nums text-[var(--accent)] sm:text-4xl">
            <Count to={i.n} />
          </p>
          <p className="mt-1 text-sm font-medium">{i.label}</p>
          <p className="text-xs text-[var(--fg-muted)]">{i.sub}</p>
        </div>
      ))}
    </div>
  );
}
