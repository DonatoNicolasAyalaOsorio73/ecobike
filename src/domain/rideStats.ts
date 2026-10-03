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

// ─── Richer analytics for the Estadísticas screen ────────────────────────────

const MONTH_LABELS = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export interface Series {
  labels: string[];
  /** Kilometres per bucket. */
  values: number[];
}

/**
 * Distance over time for the selected period: days of the week, days of the
 * month, months of the year, or the last 12 months for "all".
 */
export function trendSeries(rides: Ride[], period: StatsPeriod, now = new Date()): Series {
  if (period === "week") {
    const start = startOfWeek(now).getTime();
    const values = new Array(7).fill(0);
    for (const r of rides) {
      const i = Math.floor((startOfDay(new Date(r.startedAt)).getTime() - start) / 86_400_000);
      if (i >= 0 && i < 7) values[i] += r.distanceMeters / 1000;
    }
    return { labels: WEEKDAY_LABELS, values };
  }
  if (period === "month") {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const values = new Array(days).fill(0);
    for (const r of rides) {
      const d = new Date(r.startedAt);
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) values[d.getDate() - 1] += r.distanceMeters / 1000;
    }
    return { labels: values.map((_, i) => (i % 5 === 0 ? String(i + 1) : "")), values };
  }
  // year: Jan..Dec of this year; all: rolling last 12 months.
  const months: { y: number; m: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = period === "year" ? new Date(now.getFullYear(), i, 1) : new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    months.push({ y: d.getFullYear(), m: d.getMonth() });
  }
  const values = new Array(12).fill(0);
  for (const r of rides) {
    const d = new Date(r.startedAt);
    const i = months.findIndex((x) => x.y === d.getFullYear() && x.m === d.getMonth());
    if (i >= 0) values[i] += r.distanceMeters / 1000;
  }
  return { labels: months.map((x) => MONTH_LABELS[x.m]), values };
}

export interface PeriodTotals {
  distanceMeters: number;
  durationSeconds: number;
  rides: number;
  points: number;
}

function totals(rides: Ride[]): PeriodTotals {
  return {
    distanceMeters: rides.reduce((s, r) => s + r.distanceMeters, 0),
    durationSeconds: rides.reduce((s, r) => s + r.durationSeconds, 0),
    rides: rides.length,
    points: rides.reduce((s, r) => s + r.pointsEarned, 0),
  };
}

/** Start of the period immediately before the current one (null for "all"). */
export function previousPeriodStart(period: StatsPeriod, now = new Date()): Date | null {
  switch (period) {
    case "week": {
      const d = startOfWeek(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    case "year":
      return new Date(now.getFullYear() - 1, 0, 1);
    case "all":
      return null;
  }
}

/** Current period vs. the full previous one, with % change (null when there is no baseline). */
export function periodComparison(rides: Ride[], period: StatsPeriod, now = new Date()) {
  const current = totals(ridesInPeriod(rides, period, now));
  const prevStart = previousPeriodStart(period, now);
  const curStart = startOfPeriod(period, now);
  const previous =
    prevStart && curStart
      ? totals(rides.filter((r) => r.startedAt >= prevStart.getTime() && r.startedAt < curStart.getTime()))
      : null;
  const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);
  return {
    current,
    previous,
    change: previous
      ? {
          distance: pct(current.distanceMeters, previous.distanceMeters),
          duration: pct(current.durationSeconds, previous.durationSeconds),
          rides: pct(current.rides, previous.rides),
          points: pct(current.points, previous.points),
        }
      : null,
  };
}

/** Kilometres by weekday (Monday first). */
export function weekdayDistribution(rides: Ride[]): Series {
  const values = new Array(7).fill(0);
  for (const r of rides) values[(new Date(r.startedAt).getDay() + 6) % 7] += r.distanceMeters / 1000;
  return { labels: WEEKDAY_LABELS, values };
}

/** Number of rides started in each 3-hour slot of the day. */
export function hourDistribution(rides: Ride[]): Series {
  const values = new Array(8).fill(0);
  for (const r of rides) values[Math.floor(new Date(r.startedAt).getHours() / 3)] += 1;
  return { labels: ["0h", "3h", "6h", "9h", "12h", "15h", "18h", "21h"], values };
}

/** Short (< 5 km), medium (5–15 km) and long (> 15 km) ride counts. */
export function distanceBuckets(rides: Ride[]) {
  let short = 0;
  let medium = 0;
  let long = 0;
  for (const r of rides) {
    if (r.distanceMeters < 5000) short++;
    else if (r.distanceMeters <= 15000) medium++;
    else long++;
  }
  return { short, medium, long };
}

// Average-car figures used for the impact card (per km a car didn't drive).
export const CO2_KG_PER_KM = 0.12;
const FUEL_L_PER_KM = 0.08;
const CO2_KG_ABSORBED_PER_TREE_YEAR = 21;

export function environmentalImpact(distanceMeters: number) {
  const km = distanceMeters / 1000;
  const co2Kg = km * CO2_KG_PER_KM;
  return {
    co2Kg,
    fuelLiters: km * FUEL_L_PER_KM,
    treesYear: co2Kg / CO2_KG_ABSORBED_PER_TREE_YEAR,
  };
}
