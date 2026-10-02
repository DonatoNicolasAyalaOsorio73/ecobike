import type { Ride } from "@/types/ride";
import { startOfDay, startOfWeek } from "@/utils/rideStats";
import { DAILY_POINTS_CAP } from "@/utils/rideScore";

export type DayStatus = "done" | "today" | "missed" | "future";

const dayKey = (t: number) => startOfDay(new Date(t)).getTime();

/** Monday..Sunday of the current week, each marked done / today (pending) / missed / future. */
export function weekStreakDots(rides: Ride[], now = new Date()): { label: string; status: DayStatus }[] {
  const days = new Set(rides.map((r) => dayKey(r.startedAt)));
  const start = startOfWeek(now);
  const today = startOfDay(now).getTime();
  return ["L", "M", "X", "J", "V", "S", "D"].map((label, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const t = d.getTime();
    const status: DayStatus = days.has(t) ? "done" : t === today ? "today" : t > today ? "future" : "missed";
    return { label, status };
  });
}

/** Longest run of consecutive calendar days with at least one ride. */
export function longestStreak(rides: Ride[]): number {
  const days = [...new Set(rides.map((r) => dayKey(r.startedAt)))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    // DST-safe: consecutive local midnights differ by 23–25 h.
    run = prev !== null && Math.round((d - prev) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Points earned today (for the daily goal ring). */
export function pointsToday(rides: Ride[], now = new Date()): number {
  const today = startOfDay(now).getTime();
  return rides.filter((r) => dayKey(r.startedAt) === today).reduce((s, r) => s + r.pointsEarned, 0);
}

/** Daily goal presets, Duolingo-style. All reachable under the server's daily cap (150). */
export const DAILY_GOALS = [
  { label: "Casual", points: 25 },
  { label: "Regular", points: 50 },
  { label: "Serio", points: 100 },
  { label: "Intenso", points: 150 },
] as const;

/** A saved goal above the daily points cap (old presets were 200/400) would be impossible: cap it. */
export function effectiveDailyGoal(goal: number): number {
  return Math.max(1, Math.min(goal, DAILY_POINTS_CAP));
}

/** Encouraging line for the streak card, based on today's state. */
export function streakMessage(current: number, rodeToday: boolean): string {
  if (current === 0) return "Pedalea hoy para empezar una racha.";
  if (!rodeToday) return `¡Pedalea hoy para mantener tu racha de ${current} ${current === 1 ? "día" : "días"}!`;
  if (current >= 30) return "¡Imparable! Un mes entero pedaleando.";
  if (current >= 7) return "¡Una semana completa! Sigue así.";
  return "¡Racha asegurada por hoy!";
}
