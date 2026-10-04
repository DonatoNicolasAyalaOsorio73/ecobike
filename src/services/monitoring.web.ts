import type React from "react";

// Web: no crash reporting. The web build has no Sentry DSN and is a demo, so
// this pair keeps ~2 MB of Sentry (replay, feedback, browser SDK) out of the
// bundle. Same API as monitoring.ts (native).
// ponytail: add @sentry/react here if the web build ever needs reporting.

export function captureError(_error: unknown, _context?: Record<string, unknown>) {}

export function setMonitoringUser(_uid: string | null) {}

export function withMonitoring(Root: React.ComponentType): React.ComponentType {
  return Root;
}
