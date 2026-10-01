import type { Ride } from "./ride";

export interface RiderStats {
  totalRides: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  bestRide: Ride | null;
  currentStreakDays: number;
  totalPoints: number;
}

export interface AchievementDef {
  code: string;
  title: string;
  description: string;
  icon: string; // Ionicons name
  /** 0..1 progress toward unlocking; unlocked when it reaches 1. */
  progress: (stats: RiderStats) => number;
}

export interface UnlockedAchievement {
  code: string;
  unlockedAt: number;
}

const ratio = (value: number, target: number) => Math.max(0, Math.min(1, value / target));

// Extensible by design: add an entry here and it's automatically evaluated
// after every completed ride (see gamification.ts evaluateAchievements) and
// shown with its progress bar in Estadísticas.
export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "first_ride", title: "Primera pedalada", description: "Completa tu primer recorrido.", icon: "bicycle-outline", progress: (s) => ratio(s.totalRides, 1) },
  { code: "10km_club", title: "Club de los 10 km", description: "Acumula 10 km recorridos.", icon: "speedometer-outline", progress: (s) => ratio(s.totalDistanceMeters, 10_000) },
  { code: "rides_25", title: "Constante", description: "Completa 25 recorridos.", icon: "repeat-outline", progress: (s) => ratio(s.totalRides, 25) },
  { code: "100km_club", title: "Club de los 100 km", description: "Acumula 100 km recorridos.", icon: "trophy-outline", progress: (s) => ratio(s.totalDistanceMeters, 100_000) },
  { code: "500km_club", title: "Club de los 500 km", description: "Acumula 500 km recorridos.", icon: "rocket-outline", progress: (s) => ratio(s.totalDistanceMeters, 500_000) },
  { code: "streak_3", title: "Racha de 3 días", description: "Pedalea 3 días seguidos.", icon: "flame-outline", progress: (s) => ratio(s.currentStreakDays, 3) },
  { code: "streak_7", title: "Racha de 7 días", description: "Pedalea 7 días seguidos.", icon: "flame", progress: (s) => ratio(s.currentStreakDays, 7) },
  { code: "endurance_1h", title: "Resistencia", description: "Completa un recorrido de más de 1 hora.", icon: "time-outline", progress: (s) => ratio(s.bestRide?.durationSeconds ?? 0, 3600) },
  { code: "half_century", title: "Medio century", description: "Completa un recorrido de 50 km.", icon: "ribbon-outline", progress: (s) => ratio(s.bestRide?.distanceMeters ?? 0, 50_000) },
  { code: "century_ride", title: "Century ride", description: "Completa un recorrido de 100 km.", icon: "medal-outline", progress: (s) => ratio(s.bestRide?.distanceMeters ?? 0, 100_000) },
  { code: "eco_hero", title: "Héroe del clima", description: "Evita 50 kg de CO₂ (≈ 415 km).", icon: "leaf-outline", progress: (s) => ratio(s.totalDistanceMeters, 415_000) },
  { code: "points_1000", title: "Mil puntos", description: "Gana 1.000 puntos pedaleando.", icon: "star-outline", progress: (s) => ratio(s.totalPoints, 1000) },
];
