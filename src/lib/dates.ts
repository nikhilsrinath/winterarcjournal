// All journal dates are plain "YYYY-MM-DD" strings (no timestamps), so no
// timezone conversion can ever shift an entry onto a different day.

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_RE = /^\d{4}-\d{2}$/;

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Today's calendar date in the given IANA timezone. */
export function todayIn(tz: string, now: Date = new Date()): string {
  const safe = isValidTimezone(tz) ? tz : "UTC";
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: safe,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isValidDate(s: string | undefined | null): s is string {
  if (!s || !DATE_RE.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function isValidMonth(s: string | undefined | null): s is string {
  return !!s && MONTH_RE.test(s) && isValidDate(s + "-01");
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function monthRange(month: string): { from: string; to: string } {
  return { from: month + "-01", to: addDays(addMonths(month, 1) + "-01", -1) };
}

export interface CalendarCell {
  date: string;
  inMonth: boolean;
}

/** Monday-first grid covering whole weeks for a month. */
export function monthGrid(month: string): CalendarCell[] {
  const first = new Date(month + "-01T00:00:00Z");
  const offset = (first.getUTCDay() + 6) % 7; // Monday = 0
  const start = addDays(month + "-01", -offset);
  const { to } = monthRange(month);
  const lastOffset = (new Date(to + "T00:00:00Z").getUTCDay() + 6) % 7;
  const total = offset + Number(to.slice(8)) + (6 - lastOffset);
  return Array.from({ length: total }, (_, i) => {
    const date = addDays(start, i);
    return { date, inMonth: date.startsWith(month) };
  });
}

const fmt = (opts: Intl.DateTimeFormatOptions, date: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(new Date(date + "T00:00:00Z"));

export const formatLong = (d: string) => fmt({ weekday: "long", day: "2-digit", month: "long", year: "numeric" }, d);
export const formatShort = (d: string) => fmt({ day: "2-digit", month: "short", year: "numeric" }, d);
export const formatMonth = (m: string) => fmt({ month: "long", year: "numeric" }, m + "-01");
export const weekdayOf = (d: string) => fmt({ weekday: "long" }, d);

export function timeAgo(iso: string, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
