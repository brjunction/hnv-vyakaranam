"use client";

import { useEffect, useState } from "react";
import { MoonStar } from "lucide-react";
import type { TodayTithi } from "@/lib/vaisnava/calendar";

// Today in the Vaiṣṇava calendar — calculated in the browser for today's
// date (astronomy at Māyāpur sunrise), so it never needs updating by hand.
export default function VaisnavaToday() {
  const [t, setT] = useState<TodayTithi | null>(null);
  useEffect(() => {
    import("@/lib/vaisnava/calendar").then((m) => setT(m.tithiFor(new Date()))).catch(() => {});
  }, []);
  return (
    <div className="vt-strip" aria-live="polite">
      <span className="vt-moon" aria-hidden>
        <MoonStar size={16} />
      </span>
      {t ? (
        <p className="min-w-0 text-sm">
          <span className="font-semibold">
            {t.paksa} {t.tithi}
          </span>
          {t.ekadasi && <span className="vt-badge">Ekādaśī</span>}
          <span className="text-[var(--fg-muted)]">
            {" "}· {t.month} month · Gaurābda {t.gaurabda}
          </span>
          <span className="block text-[11px] text-[var(--fg-muted)]">Tithi at sunrise in Śrī Māyāpur · calculated automatically</span>
        </p>
      ) : (
        <p className="text-sm text-[var(--fg-muted)]">Today in the Vaiṣṇava calendar…</p>
      )}
    </div>
  );
}
