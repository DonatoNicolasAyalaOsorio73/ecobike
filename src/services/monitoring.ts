import type React from "react";
import * as Sentry from "@sentry/react-native";

// Crash/error reporting. Off unless EXPO_PUBLIC_SENTRY_DSN is set (a DSN is a
// public ingest key, safe in the bundle). Never sends PII: only the uid.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: !__DEV__,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? "production",
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (dsn) Sentry.captureException(error, context ? { extra: context } : undefined);
}

export function setMonitoringUser(uid: string | null) {
  if (dsn) Sentry.setUser(uid ? { id: uid } : null);
}

/** Wraps the root component so Sentry can capture render errors and touch breadcrumbs. */
export function withMonitoring(Root: React.ComponentType): React.ComponentType {
  return dsn ? (Sentry.wrap(Root) as React.ComponentType) : Root;
}
