/** Below this speed the rider is considered stopped (~4.3 km/h, walking the bike). */
export const MOVING_SPEED_MS = 1.2;
/** Stopped for this long → auto-pause. */
export const AUTO_PAUSE_AFTER_MS = 25_000;

/** Speed from GPS when present, else derived from the distance/time to the previous fix. */
export function speedMs(reported: number | null | undefined, meters: number, ms: number): number {
  if (typeof reported === "number" && reported >= 0) return reported;
  return ms > 0 ? meters / (ms / 1000) : 0;
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
