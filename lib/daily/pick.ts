// Deterministic "item of the day" selection. Pure and client-safe.
// See docs/08-home-daily-audio.md §2.

export type DailyType = "sutra" | "verse" | "subhashita";

export type DailyEntry = {
  /** Stable key "sutra:42" / "subhashita:7" (entity type + database id). */
  key: string;
  type: DailyType;
  id: number;
  /** Human label, e.g. "Sūtra 42" or "Maṅgalācaraṇa, verse 0.1.1". */
  label: string;
  /** Where the item lives, e.g. the chapter title. */
  context: string;
  sanskrit: string;
  iast: string;
  translation: string;
  source: string;
  href: string | null;
};

export type DailyPayload = {
  date: string;
  verseOfDay: DailyEntry | null;
  subhashita: DailyEntry | null;
};

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Days since 1970-01-01 for a YYYY-MM-DD date (calendar date, no timezone). */
export function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

/**
 * A stride coprime with n, so stepping through the pool by `stride` each
 * day visits every item once per n days in a scattered order (instead of
 * walking sūtra 1, 2, 3 … in sequence).
 */
export function strideFor(n: number): number {
  if (n <= 2) return 1;
  for (const s of [7919, 7907, 7901, 7883, 7879, 7877]) if (gcd(s % n || n, n) === 1) return s % n || 1;
  return 1;
}

/**
 * Picks today's key. `keys` must be in a stable order (the caller sorts).
 * A pin for this date wins if its key is still in the pool.
 */
export function pickKey(keys: string[], date: string, pinnedKey?: string | null): string | null {
  if (keys.length === 0) return null;
  if (pinnedKey && keys.includes(pinnedKey)) return pinnedKey;
  const n = keys.length;
  const idx = ((dayNumber(date) % n) * strideFor(n)) % n;
  return keys[idx];
}

/** The visitor's local calendar date as YYYY-MM-DD. */
export function localDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
