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
  isUnlocked: (stats: RiderStats) => boolean;
}

export interface UnlockedAchievement {
  code: string;
  unlockedAt: number;
}

// Extensible by design: add an entry here and it's automatically evaluated
// after every completed ride (see gamification.ts evaluateAchievements).
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    code: "first_ride",
    title: "Primera pedalada",
    description: "Completa tu primer recorrido.",
    icon: "bicycle-outline",
    isUnlocked: (s) => s.totalRides >= 1,
  },
  {
    code: "10km_club",
    title: "Club de los 10 km",
    description: "Acumula 10 km recorridos en total.",
    icon: "speedometer-outline",
    isUnlocked: (s) => s.totalDistanceMeters >= 10_000,
  },
  {
    code: "100km_club",
    title: "Club de los 100 km",
    description: "Acumula 100 km recorridos en total.",
    icon: "trophy-outline",
    isUnlocked: (s) => s.totalDistanceMeters >= 100_000,
  },
  {
    code: "century_ride",
    title: "Century ride",
    description: "Completa un solo recorrido de 100 km o más.",
    icon: "medal-outline",
    isUnlocked: (s) => (s.bestRide?.distanceMeters ?? 0) >= 100_000,
  },
  {
    code: "streak_3",
    title: "Racha de 3 días",
    description: "Pedalea 3 días seguidos.",
    icon: "flame-outline",
    isUnlocked: (s) => s.currentStreakDays >= 3,
  },
  {
    code: "streak_7",
    title: "Racha de 7 días",
    description: "Pedalea 7 días seguidos.",
    icon: "flame",
    isUnlocked: (s) => s.currentStreakDays >= 7,
  },
  {
    code: "endurance_1h",
    title: "Resistencia",
    description: "Completa un recorrido de más de 1 hora.",
    icon: "time-outline",
    isUnlocked: (s) => (s.bestRide?.durationSeconds ?? 0) >= 3600,
  },
];
