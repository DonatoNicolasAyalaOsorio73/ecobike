export type RideGoal = { kind: "distance"; meters: number } | { kind: "time"; seconds: number };

export interface RideGoalOption {
  id: string;
  label: string;
  subtitle: string;
  icon: string; // Ionicons name
  goal: RideGoal | null;
}

/** Options shown in the map's ride menu. */
export const RIDE_GOAL_OPTIONS: RideGoalOption[] = [
  { id: "free", label: "Recorrido libre", subtitle: "Sin meta, pedalea a tu ritmo", icon: "bicycle", goal: null },
  { id: "5km", label: "5 km", subtitle: "Ideal para ir al trabajo", icon: "flag-outline", goal: { kind: "distance", meters: 5000 } },
  { id: "10km", label: "10 km", subtitle: "Ruta media", icon: "flag", goal: { kind: "distance", meters: 10_000 } },
  { id: "20km", label: "20 km", subtitle: "Reto de fin de semana", icon: "trophy-outline", goal: { kind: "distance", meters: 20_000 } },
  { id: "30min", label: "30 minutos", subtitle: "Sesión rápida", icon: "timer-outline", goal: { kind: "time", seconds: 1800 } },
  { id: "60min", label: "1 hora", subtitle: "Entrenamiento de resistencia", icon: "stopwatch-outline", goal: { kind: "time", seconds: 3600 } },
];

/** 0..1 progress of a ride toward its goal (1 when there's no goal is never used: caller checks goal). */
export function goalProgress(goal: RideGoal, ride: { distanceMeters: number; durationSeconds: number }): number {
  const p = goal.kind === "distance" ? ride.distanceMeters / goal.meters : ride.durationSeconds / goal.seconds;
  return Math.max(0, Math.min(1, p));
}

export function goalLabel(goal: RideGoal): string {
  return goal.kind === "distance" ? `${goal.meters / 1000} km` : goal.seconds >= 3600 ? `${goal.seconds / 3600} h` : `${goal.seconds / 60} min`;
}
