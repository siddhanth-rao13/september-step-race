/**
 * Deterministic formatting helpers.
 *
 * Nothing in here reads the clock, the browser locale or the browser timezone,
 * so the server HTML and the browser always produce the exact same text and
 * React never reports a hydration mismatch.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 37614 -> "37,614" */
export function formatSteps(value: number): string {
  const negative = value < 0;
  const digits = String(Math.round(Math.abs(value)));
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ",";
    out += digits[i];
  }
  return negative ? `-${out}` : out;
}

/** Missing data must never look like a zero. */
export function formatStepCount(value: number | null): string {
  return value === null ? "Not updated" : formatSteps(value);
}

/**
 * 5000 -> "5K", 300000 -> "300K", 0 -> "0K".
 * Values that are not whole thousands keep one decimal, e.g. 2500 -> "2.5K".
 */
export function formatMilestoneLabel(value: number): string {
  const thousands = value / 1000;
  if (Number.isInteger(thousands)) return `${thousands}K`;
  return `${thousands.toFixed(1)}K`;
}

/** "2026-09-05" -> "5 Sep 2026". Parsed as text, never as a Date. */
export function formatDayLabel(isoDate: string | null): string {
  if (!isoDate) return "No step data yet";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

/**
 * "2026-09-11T09:00:00+05:30" -> "11 Sep 2026 · 9:00 AM".
 *
 * The wall-clock time written in the config is shown exactly as written. The
 * trailing offset is deliberately ignored so the label is identical on every
 * device, in every timezone.
 */
export function formatTimestampLabel(isoTimestamp: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(isoTimestamp);
  if (!match) return isoTimestamp;
  const [, year, month, day, hourText, minute] = match;
  const hour24 = Number(hourText);
  const suffix = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? month} ${year} · ${hour12}:${minute} ${suffix}`;
}

export function formatRank(rank: number | null): string {
  return rank === null ? "Unranked" : `#${rank}`;
}
