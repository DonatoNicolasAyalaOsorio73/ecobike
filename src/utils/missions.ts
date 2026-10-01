import type { Ride } from "@/types/ride";
import { startOfDay } from "@/utils/rideStats";

export interface Mission {
  id: string;
  title: string;
  icon: string; // Ionicons name
  accent: "green" | "blue" | "orange" | "gold" | "purple";
  current: number;
  target: number;
  unit: string;
  done: boolean;
}

/** Simple deterministic daily rotation so missions vary day to day. */
function daySeed(now: Date) {
  return Math.floor(startOfDay(now).getTime() / 86_400_000);
}

/**
 * Today's three missions (Duolingo "daily quests"), computed from local rides:
 * distance, number of rides, and points (target scaled to the daily goal).
 */
export function dailyMissions(rides: Ride[], dailyGoalPoints: number, now = new Date()): Mission[] {
  const today = startOfDay(now).getTime();
  const todays = rides.filter((r) => startOfDay(new Date(r.startedAt)).getTime() === today);
  const km = todays.reduce((s, r) => s + r.distanceMeters, 0) / 1000;
  const pts = todays.reduce((s, r) => s + r.pointsEarned, 0);
  const longest = todays.reduce((m, r) => Math.max(m, r.durationSeconds), 0) / 60;

  const seed = daySeed(now);
  const kmTarget = [3, 5, 8][seed % 3];
  const thirdKind = seed % 2 === 0 ? "rides" : "minutes";

  const m = (x: Omit<Mission, "done">): Mission => ({ ...x, current: Math.min(x.current, x.target), done: x.current >= x.target });
  return [
    m({ id: "km", title: `Pedalea ${kmTarget} km hoy`, icon: "bicycle", accent: "green", current: Math.round(km * 10) / 10, target: kmTarget, unit: "km" }),
    m({ id: "pts", title: `Gana ${dailyGoalPoints} puntos`, icon: "ribbon", accent: "gold", current: pts, target: dailyGoalPoints, unit: "pts" }),
    thirdKind === "rides"
      ? m({ id: "rides", title: "Completa 2 recorridos", icon: "repeat", accent: "blue", current: todays.length, target: 2, unit: "" })
      : m({ id: "minutes", title: "Rueda 20 min seguidos", icon: "timer", accent: "purple", current: Math.round(longest), target: 20, unit: "min" }),
  ];
}
