import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Ride } from "@/types/ride";

export type StatsPeriod = "week" | "month" | "year" | "all";

/** Local midnight for a timestamp — all bucketing here is calendar-day based,
 * not 24h-window based, so "today" means today wherever the rider is. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday-based week start, matching how the weekly chart labels (L M X J V S D) read. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  // getDay(): 0 = Sunday. Shift so Monday is 0.
  const offset = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - offset);
  return day;
}

export function startOfPeriod(period: StatsPeriod, now = new Date()): Date | null {
  switch (period) {
    case "week":
      return startOfWeek(now);
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
      return null;
  }
}

export function ridesInPeriod(rides: Ride[], period: StatsPeriod, now = new Date()): Ride[] {
  const start = startOfPeriod(period, now);
  if (!start) return rides;
  const from = start.getTime();
  return rides.filter((r) => r.startedAt >= from);
}

/** Metres ridden since the start of the current (Monday-based) week. */
export function distanceThisWeek(rides: Ride[], now = new Date()): number {
  return ridesInPeriod(rides, "week", now).reduce((sum, r) => sum + r.distanceMeters, 0);
}

export interface PersonalRecords {
  longestRideMeters: number;
  longestDurationSeconds: number;
  fastestAvgSpeedKmh: number;
  mostPointsInRide: number;
  bestDayMeters: number;
}

export function personalRecords(rides: Ride[]): PersonalRecords {
  const byDay = new Map<number, number>();
  for (const r of rides) {
    const key = startOfDay(new Date(r.startedAt)).getTime();
    byDay.set(key, (byDay.get(key) ?? 0) + r.distanceMeters);
  }

  return {
    longestRideMeters: rides.reduce((m, r) => Math.max(m, r.distanceMeters), 0),
    longestDurationSeconds: rides.reduce((m, r) => Math.max(m, r.durationSeconds), 0),
    // A ride with no elapsed time has a meaningless avg speed (division by a
    // near-zero duration), so it can't be allowed to win this record.
    fastestAvgSpeedKmh: rides.reduce((m, r) => (r.durationSeconds > 0 ? Math.max(m, r.avgSpeedKmh) : m), 0),
    mostPointsInRide: rides.reduce((m, r) => Math.max(m, r.pointsEarned), 0),
    bestDayMeters: Math.max(0, ...byDay.values()),
  };
}

export interface HeatmapCell {
  /** Local-midnight timestamp for the day this cell represents. */
  date: number;
  meters: number;
  /** 0–4 bucket for colour intensity; 0 means no activity at all. */
  level: 0 | 1 | 2 | 3 | 4;
}

/**
 * GitHub-contributions-style grid of the last `days` calendar days, oldest
 * first. Levels are relative to the rider's own best day in the window, so
 * the grid stays readable for a 3 km/day commuter and a 60 km/day tourer
 * alike rather than being calibrated to some absolute distance.
 */
export function activityHeatmap(rides: Ride[], days = 84, now = new Date()): HeatmapCell[] {
  const byDay = new Map<number, number>();
  for (const r of rides) {
    const key = startOfDay(new Date(r.startedAt)).getTime();
    byDay.set(key, (byDay.get(key) ?? 0) + r.distanceMeters);
  }

  const today = startOfDay(now);
  const cells: HeatmapCell[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    cells.push({ date: d.getTime(), meters: byDay.get(d.getTime()) ?? 0, level: 0 });
  }

  const max = Math.max(0, ...cells.map((c) => c.meters));
  if (max === 0) return cells;

  return cells.map((c) => {
    if (c.meters === 0) return c;
    const ratio = c.meters / max;
    const level = ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
    return { ...c, level: level as 1 | 2 | 3 | 4 };
  });
}

/** Groups rides into "septiembre 2026"-style buckets, newest month first. */
export function groupRidesByMonth(rides: Ride[]): { key: string; label: string; rides: Ride[] }[] {
  const groups = new Map<string, Ride[]>();
  const sorted = [...rides].sort((a, b) => b.startedAt - a.startedAt);

  for (const ride of sorted) {
    const d = new Date(ride.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = groups.get(key);
    if (existing) existing.push(ride);
    else groups.set(key, [ride]);
  }

  return [...groups.entries()].map(([key, groupRides]) => {
    // date-fns rather than toLocaleDateString: Hermes' Intl support varies by
    // platform/engine build, and the rest of the app already formats dates
    // with this exact locale, so this can't drift from the rows above it.
    const label = format(new Date(groupRides[0].startedAt), "LLLL yyyy", { locale: es });
    return { key, label, rides: groupRides };
  });
}
