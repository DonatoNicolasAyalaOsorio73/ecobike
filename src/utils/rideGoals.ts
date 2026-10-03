export type RideGoal = { kind: "distance"; meters: number } | { kind: "time"; seconds: number };

/** 0..1 progress of a ride toward its goal (1 when there's no goal is never used: caller checks goal). */
export function goalProgress(goal: RideGoal, ride: { distanceMeters: number; durationSeconds: number }): number {
  const p = goal.kind === "distance" ? ride.distanceMeters / goal.meters : ride.durationSeconds / goal.seconds;
  return Math.max(0, Math.min(1, p));
}

export function goalLabel(goal: RideGoal): string {
  return goal.kind === "distance" ? `${goal.meters / 1000} km` : goal.seconds >= 3600 ? `${goal.seconds / 3600} h` : `${goal.seconds / 60} min`;
}
