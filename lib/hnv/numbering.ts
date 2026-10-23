// Sūtra numbers are text ("42", "0.1.3"). Automatic renumbering works on the
// LAST run of digits; everything before it is a "prefix" that groups numbers
// together ("" for ordinary sūtras, "0.1." for Maṅgalācaraṇa verses).

export type ParsedNumber = { prefix: string; n: number };

export function parseNumber(number: string): ParsedNumber | null {
  const m = number.trim().match(/^(.*?)(\d+)$/);
  if (!m) return null;
  return { prefix: m[1], n: Number(m[2]) };
}

export function formatNumber(p: ParsedNumber): string {
  return `${p.prefix}${p.n}`;
}

/** The number that naturally follows `number` ("42" → "43", "0.1.6" → "0.1.7"). */
export function nextNumber(number: string | null | undefined): string {
  const p = number ? parseNumber(number) : null;
  return p ? formatNumber({ prefix: p.prefix, n: p.n + 1 }) : "1";
}

/** Postgres regex matching every number that shares `prefix`. */
export function prefixRegex(prefix: string): string {
  return `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[0-9]+$`;
}

/** "Sūtras 1–86" style range from a list of numbers (numeric part only). */
export function rangeOf(numbers: string[]): string {
  const ints = numbers.filter((n) => /^\d+$/.test(n)).map(Number);
  if (ints.length === 0) return "";
  const lo = Math.min(...ints);
  const hi = Math.max(...ints);
  return lo === hi ? String(lo) : `${lo}–${hi}`;
}

/** Natural compare: "2" < "10", "0.1.2" < "0.1.10". */
export function compareNumbers(a: string, b: string): number {
  return a.localeCompare(b, "en", { numeric: true });
}
