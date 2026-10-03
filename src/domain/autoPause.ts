/** Below this speed the rider is considered stopped (~4.3 km/h, walking the bike). */
export const MOVING_SPEED_MS = 1.2;
/** Stopped for this long → auto-pause. */
export const AUTO_PAUSE_AFTER_MS = 25_000;

/**
 * The higher of the GPS-reported speed and the speed derived from the
 * distance/time to the previous fix. Android's fused provider often reports
 * ~0 (0.0 or 1e-4 m/s) for fixes that clearly moved, which would auto-pause a
 * moving rider for good. ponytail: GPS drift while standing can read as slow
 * movement and delay an auto-pause; that only costs a few idle seconds.
 */
export function speedMs(reported: number | null | undefined, meters: number, ms: number): number {
  const derived = ms > 0 ? meters / (ms / 1000) : 0;
  return typeof reported === "number" && reported > 0 ? Math.max(reported, derived) : derived;
}

export type AutoPauseAction = "pause" | "resume" | null;

/**
 * Decides what auto-pause should do given the ride status and how long ago
 * the rider last moved. Only resumes rides that auto-pause itself paused
 * (a manual pause stays paused).
 */
export function autoPauseAction(opts: {
  enabled: boolean;
  status: "ACTIVE" | "PAUSED" | string;
  autoPaused: boolean;
  movingNow: boolean;
  lastMovingAt: number;
  now: number;
}): AutoPauseAction {
  if (!opts.enabled) return null;
  if (opts.status === "ACTIVE" && !opts.movingNow && opts.now - opts.lastMovingAt >= AUTO_PAUSE_AFTER_MS) return "pause";
  if (opts.status === "PAUSED" && opts.autoPaused && opts.movingNow) return "resume";
  return null;
}
