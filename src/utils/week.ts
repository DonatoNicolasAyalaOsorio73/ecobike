/**
 * ISO week key ("2026-W40") in Colombia time (UTC-5). Must match
 * api/_lib.js weekKey: the server stores weekly league points under it.
 */
export function weekKey(ms: number, tzOffsetHours = -5): string {
  const d = new Date(ms + tzOffsetHours * 3_600_000);
  // ISO-8601: the week belongs to the year of its Thursday.
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  thursday.setUTCDate(thursday.getUTCDate() - ((thursday.getUTCDay() + 6) % 7) + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  firstThursday.setUTCDate(1 + ((4 - firstThursday.getUTCDay() + 7) % 7));
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / 604_800_000);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Days left in the current league week (Sunday counts as 1). */
export function daysLeftInWeek(now = new Date()): number {
  const day = (now.getDay() + 6) % 7;
  return 7 - day;
}
