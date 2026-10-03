import type { Ride } from "@/types/ride";
import { startOfDay, CO2_KG_PER_KM } from "@/domain/rideStats";
import { verifiedRides } from "@/domain/verified";
import { effectiveDailyGoal } from "@/domain/streak";

export interface Mission {
  id: string;
  title: string;
  icon: string; // Ionicons name
  current: number;
  target: number;
  unit: string;
  done: boolean;
}

interface Kind {
  id: string;
  icon: string;
  unit: string;
  /** Target choices; one is drawn per day. */
  targets: (dailyGoal: number) => number[];
  title: (t: number) => string;
  /** Progress from today's VERIFIED rides. */
  current: (today: Ride[]) => number;
}

const sum = (rides: Ride[], f: (r: Ride) => number) => rides.reduce((s, r) => s + f(r), 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The pool daily missions are drawn from. Everything is measured on rides
 * that earned points (bike-verified), and missions never award points
 * themselves — points come only from the server — so they can't be farmed.
 */
const POOL: Kind[] = [
  { id: "km", icon: "bicycle", unit: "km", targets: () => [3, 5, 8, 12], title: (t) => `Pedalea ${t} km hoy`, current: (d) => r1(sum(d, (r) => r.distanceMeters) / 1000) },
  { id: "pts", icon: "ribbon", unit: "pts", targets: (g) => [Math.max(10, Math.round(g / 2)), g], title: (t) => `Gana ${t} puntos`, current: (d) => sum(d, (r) => r.pointsEarned) },
  { id: "rides", icon: "repeat", unit: "", targets: () => [2, 3], title: (t) => `Completa ${t} recorridos`, current: (d) => d.length },
  { id: "longest", icon: "timer", unit: "min", targets: () => [20, 30, 45], title: (t) => `Rueda ${t} min seguidos`, current: (d) => Math.round(Math.max(0, ...d.map((r) => r.durationSeconds)) / 60) },
  { id: "minutes", icon: "time", unit: "min", targets: () => [30, 45, 60], title: (t) => `Pedalea ${t} min en total`, current: (d) => Math.round(sum(d, (r) => r.durationSeconds) / 60) },
  {
    id: "speed",
    icon: "speedometer",
    unit: "km/h",
    targets: () => [14, 16, 18],
    title: (t) => `Promedia ${t} km/h en un recorrido de 2 km o más`,
    current: (d) => Math.round(Math.max(0, ...d.filter((r) => r.distanceMeters >= 2000).map((r) => r.avgSpeedKmh))),
  },
  { id: "co2", icon: "leaf", unit: "kg", targets: () => [0.5, 1, 1.5], title: (t) => `Evita ${t} kg de CO₂`, current: (d) => r1((sum(d, (r) => r.distanceMeters) / 1000) * CO2_KG_PER_KM) },
  { id: "climb", icon: "trending-up", unit: "m", targets: () => [30, 60, 100], title: (t) => `Sube ${t} m de desnivel`, current: (d) => Math.round(sum(d, (r) => r.elevationGainMeters)) },
  { id: "single", icon: "flag", unit: "km", targets: () => [5, 8, 12], title: (t) => `Haz un recorrido de ${t} km`, current: (d) => r1(Math.max(0, ...d.map((r) => r.distanceMeters)) / 1000) },
  { id: "early", icon: "sunny", unit: "", targets: () => [1], title: () => "Pedalea antes de las 8:00", current: (d) => (d.some((r) => new Date(r.startedAt).getHours() < 8) ? 1 : 0) },
];

/** Deterministic PRNG (mulberry32) so a user's draw is the same on every device all day. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Local calendar day number (missions renew at local midnight). */
function dayIndex(now: Date) {
  const d = startOfDay(now);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/**
 * Today's three missions: drawn at random from POOL for this user and day
 * (stable all day, a new set at midnight, can't be re-rolled by reopening
 * the app), with a random target each. Progress counts verified rides only.
 */
export function dailyMissions(rides: Ride[], dailyGoalPoints: number, now = new Date(), userKey = ""): Mission[] {
  const today = startOfDay(now).getTime();
  const todays = verifiedRides(rides).filter((r) => startOfDay(new Date(r.startedAt)).getTime() === today);
  const rand = rng(hash(`${userKey}|${dayIndex(now)}`));
  const goal = effectiveDailyGoal(dailyGoalPoints);

  const kinds = [...POOL];
  const picked: Kind[] = [];
  while (picked.length < 3) picked.push(kinds.splice(Math.floor(rand() * kinds.length), 1)[0]);

  return picked.map((k) => {
    const options = k.targets(goal);
    const target = options[Math.floor(rand() * options.length)];
    const current = k.current(todays);
    return { id: k.id, title: k.title(target), icon: k.icon, unit: k.unit, target, current: Math.min(current, target), done: current >= target };
  });
}

/** Time left until today's missions are replaced, e.g. "5 h" or "40 min". */
export function renewsIn(now = new Date()): string {
  const next = startOfDay(now);
  next.setDate(next.getDate() + 1);
  const min = Math.max(1, Math.round((next.getTime() - now.getTime()) / 60_000));
  return min >= 60 ? `${Math.floor(min / 60)} h` : `${min} min`;
}
