import { create } from "zustand";
import { Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Haptics from "expo-haptics";
import { goalProgress, type RideGoal } from "@/domain/rideGoals";
import { createEmptyRide, type Ride, type RideStatus, type TrackPoint } from "@/types/ride";
import { avgSpeedKmh, estimateCalories, incrementalDistanceMeters, totalElevationGainMeters } from "@/utils/geo";
import { scoreLocalRide, computeRiderStats, evaluateAchievements, validAchievements } from "@/domain/gamification";
import { capRidePoints } from "@/domain/rideScore";
import type { AchievementDef } from "@/types/achievement";
import * as db from "@/services/db";
import { queueRideForSync } from "@/services/rides.service";
import { useAuthStore } from "@/stores/authStore";
import { isFirebaseConfigured } from "@/services/firebase";
import { useSettingsStore } from "@/stores/settingsStore";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { MOVING_SPEED_MS, autoPauseAction, speedMs } from "@/domain/autoPause";

interface RideState {
  status: RideStatus;
  ride: Ride | null;
  error: string | null;
  justUnlocked: AchievementDef[];
  currentLocation: { lat: number; lng: number } | null;
  /** Optional target chosen in the map's ride menu. */
  goal: RideGoal | null;
  goalReached: boolean;
  /** True when the current pause was triggered by auto-pause (resumes on movement). */
  autoPaused: boolean;
  requestPermissions: () => Promise<boolean>;
  startRide: (userId: string, goal?: RideGoal | null) => Promise<void>;
  pauseRide: (auto?: boolean) => void;
  resumeRide: () => void;
  finishRide: () => Promise<Ride | null>;
  discardRide: () => void;
  clearJustUnlocked: () => void;
  recoverInProgressRide: (userId: string) => Ride | null;
}

const BG_TASK = "ecobike-ride-location";
const MAX_ACCURACY_M = 30; // ignore fixes worse than this
const MAX_JUMP_KMH = 80; // a jump faster than this between fixes is a GPS glitch

let watchSubscription: Location.LocationSubscription | null = null;
let backgroundUpdates = false;
let tickInterval: ReturnType<typeof setInterval> | null = null;
let ticksSinceAutosave = 0;
// Duration comes from the wall clock, not from counting timer ticks: JS
// timers stop while the app is backgrounded, but GPS keeps adding distance,
// which would inflate the average speed (and make the server reject the ride).
let baseSeconds = 0; // accumulated before the current active segment
let activeSince: number | null = null;
let segmentBreak = true; // next fix starts a new segment (after start/pause)
let lastMovingAt = 0;
const KEEP_AWAKE_TAG = "ecobike-ride";

const settings = () => useSettingsStore.getState();
const gpsAccuracy = () => (settings().gpsAccuracy === "balanced" ? Location.Accuracy.Balanced : Location.Accuracy.BestForNavigation);

function elapsedSeconds() {
  return Math.round(baseSeconds + (activeSince ? (Date.now() - activeSince) / 1000 : 0));
}

function stopTracking() {
  watchSubscription?.remove();
  watchSubscription = null;
  if (backgroundUpdates) Location.stopLocationUpdatesAsync(BG_TASK).catch(() => {});
  backgroundUpdates = false;
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = null;
  // Rejects (async on web) when keep-awake was never activated: nothing to undo.
  Promise.resolve()
    .then(() => deactivateKeepAwake(KEEP_AWAKE_TAG))
    .catch(() => {});
}

function onLocations(locs: Location.LocationObject[]) {
  const store = useRideStore;
  for (const loc of locs) {
    if (loc.coords.accuracy != null && loc.coords.accuracy > MAX_ACCURACY_M) continue;
    // Android reports fixes from fake-GPS apps as mocked: never count them.
    if (loc.mocked) continue;
    const before = store.getState();
    if (!before.ride) return;
    const last = before.ride.points[before.ride.points.length - 1];
    const speed = speedMs(
      loc.coords.speed,
      last ? incrementalDistanceMeters(last, { lat: loc.coords.latitude, lng: loc.coords.longitude, altitude: null, timestamp: loc.timestamp, speed: null }) : 0,
      last ? loc.timestamp - last.timestamp : 0
    );
    const moving = speed >= MOVING_SPEED_MS;
    if (moving) lastMovingAt = Date.now();
    if (autoPauseAction({ enabled: settings().autoPause, status: before.status, autoPaused: before.autoPaused, movingNow: moving, lastMovingAt, now: Date.now() }) === "resume") {
      before.resumeRide();
    }
    const state = store.getState();
    if (state.status !== "ACTIVE" || !state.ride) continue;
    const point: TrackPoint = {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      altitude: loc.coords.altitude,
      timestamp: loc.timestamp,
      speed: loc.coords.speed,
    };
    const prev = state.ride.points[state.ride.points.length - 1];
    // A cached fix from before the start, or a repeated/out-of-order one from
    // batched delivery, adds nothing and would only confuse verification.
    if (point.timestamp < state.ride.startedAt - 5_000 || (prev && point.timestamp <= prev.timestamp)) continue;
    let added = 0;
    if (prev && !segmentBreak) {
      added = incrementalDistanceMeters(prev, point);
      const hours = Math.max(1, point.timestamp - prev.timestamp) / 3_600_000;
      if (added / 1000 / hours > MAX_JUMP_KMH) continue;
    }
    segmentBreak = false;
    const points = [...state.ride.points, point];
    store.setState({
      currentLocation: { lat: point.lat, lng: point.lng },
      ride: {
        ...state.ride,
        points,
        distanceMeters: state.ride.distanceMeters + added,
        maxSpeedKmh: Math.max(state.ride.maxSpeedKmh, Math.min(speed, MAX_JUMP_KMH / 3.6) * 3.6),
        elevationGainMeters: totalElevationGainMeters(points),
      },
    });
  }
}

// Must be defined at module scope so the OS can deliver locations while the
// app is in the background (screen locked, phone in pocket).
if (Platform.OS !== "web") {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(BG_TASK, async ({ data, error }) => {
    if (!error && data?.locations) onLocations(data.locations);
  });
}

async function ensureTracking() {
  if (!watchSubscription && !backgroundUpdates) {
    let background = false;
    if (Platform.OS !== "web") {
      const bg = await Location.getBackgroundPermissionsAsync();
      background =
        bg.status === "granted" ||
        (bg.status === "undetermined" && bg.canAskAgain && (await Location.requestBackgroundPermissionsAsync()).status === "granted");
    }
    if (background) {
      await Location.startLocationUpdatesAsync(BG_TASK, {
        accuracy: gpsAccuracy(),
        timeInterval: 3000,
        distanceInterval: 5,
        activityType: Location.ActivityType.Fitness,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "EcoBike está registrando tu recorrido",
          notificationBody: "Toca para volver a la app.",
          notificationColor: "#7BF510",
        },
      });
      backgroundUpdates = true;
    } else {
      // Foreground only (web, or background permission declined).
      watchSubscription = await Location.watchPositionAsync(
        { accuracy: gpsAccuracy(), timeInterval: 3000, distanceInterval: 5 },
        (loc) => onLocations([loc])
      );
    }
  }

  if (settings().keepScreenOn) activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});

  if (!tickInterval) {
    tickInterval = setInterval(() => {
      const state = useRideStore.getState();
      if (state.status !== "ACTIVE" || !state.ride) return;
      if (autoPauseAction({ enabled: settings().autoPause, status: state.status, autoPaused: false, movingNow: false, lastMovingAt, now: Date.now() }) === "pause") {
        state.pauseRide(true);
        return;
      }
      const durationSeconds = elapsedSeconds();
      const ride = { ...state.ride, durationSeconds, avgSpeedKmh: avgSpeedKmh(state.ride.distanceMeters, durationSeconds) };
      const reached = !state.goalReached && !!state.goal && goalProgress(state.goal, ride) >= 1;
      if (reached) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      useRideStore.setState(reached ? { ride, goalReached: true } : { ride });
      if (++ticksSinceAutosave >= 15) {
        ticksSinceAutosave = 0;
        const current = useRideStore.getState().ride;
        if (current) db.saveRide(current);
      }
    }, 1000);
  }
}

export const useRideStore = create<RideState>((set, get) => ({
  status: "IDLE",
  ride: null,
  error: null,
  justUnlocked: [],
  currentLocation: null,
  goal: null,
  goalReached: false,
  autoPaused: false,

  requestPermissions: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  },

  startRide: async (userId: string, goal: RideGoal | null = null) => {
    set({ status: "PREPARING", error: null });
    const granted = await get().requestPermissions();
    if (!granted) {
      set({ status: "ERROR", error: "Permiso de ubicación denegado. Actívalo en Ajustes para registrar recorridos." });
      return;
    }

    const ride = createEmptyRide(userId, `${userId}_${Date.now()}`);
    baseSeconds = 0;
    activeSince = Date.now();
    lastMovingAt = Date.now();
    segmentBreak = true;
    set({ ride, status: "ACTIVE", currentLocation: null, goal, goalReached: false, autoPaused: false });
    try {
      await ensureTracking();
    } catch {
      stopTracking();
      set({ status: "ERROR", error: "No se pudo iniciar el GPS. Revisa que la ubicación esté activada." });
    }
  },

  pauseRide: (auto = false) => {
    const ride = get().ride;
    if (get().status !== "ACTIVE" || !ride) return;
    baseSeconds = elapsedSeconds();
    activeSince = null;
    segmentBreak = true;
    const paused = { ...ride, durationSeconds: baseSeconds };
    set({ status: "PAUSED", ride: paused, autoPaused: auto });
    if (auto) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    db.saveRide(paused);
  },

  resumeRide: () => {
    if (get().status !== "PAUSED") return;
    activeSince = Date.now();
    lastMovingAt = Date.now();
    segmentBreak = true;
    set({ status: "ACTIVE", autoPaused: false });
    // A ride recovered after an app restart has no GPS subscription yet.
    ensureTracking().catch(() => set({ error: "No se pudo reanudar el GPS." }));
  },

  finishRide: async () => {
    const { ride, status } = get();
    if (!ride || (status !== "ACTIVE" && status !== "PAUSED")) return null;
    set({ status: "FINISHING" });
    stopTracking();

    const durationSeconds = elapsedSeconds();
    activeSince = null;
    const finished: Ride = {
      ...ride,
      durationSeconds,
      avgSpeedKmh: avgSpeedKmh(ride.distanceMeters, durationSeconds),
      endedAt: Date.now(),
      caloriesKcal: estimateCalories(ride.distanceMeters, settings().weightKg),
    };
    // Same verdict and daily caps the server will apply (rideScore.ts), so the
    // finish screen never promises points the sync then takes away.
    const score = scoreLocalRide(finished);
    const dayAgo = Date.now() - 24 * 3600_000;
    const today = db.listRides(ride.userId).filter((r) => r.id !== ride.id && r.startedAt >= dayAgo);
    const capped = capRidePoints(score.points, score.reason, today.reduce((sum, r) => sum + r.pointsEarned, 0), today.length);
    finished.pointsEarned = capped.points;
    finished.verified = score.points > 0;
    finished.pointsReason = capped.reason;

    db.saveRide(finished);

    const stats = computeRiderStats(db.listRides(ride.userId));

    // Stored unlocks the verified history no longer supports don't count as
    // "already unlocked": earning them for real still celebrates.
    const alreadyUnlocked = validAchievements(new Set(db.listUnlockedAchievements(ride.userId).map((a) => a.code)), stats);
    const newlyUnlocked = evaluateAchievements(stats, alreadyUnlocked);
    newlyUnlocked.forEach((a) => db.unlockAchievement(ride.userId, a.code));

    // Real accounts: the server awards the points on sync (api/rides.js) to
    // the shared `puntosAcumulados`, so web and mobile see the same balance.
    // Guests have no account — their points stay local.
    if (isFirebaseConfigured && !ride.userId.startsWith("guest_")) {
      queueRideForSync(finished)
        .then(() => useAuthStore.getState().refreshProfile())
        .catch(() => {
          // Ride is already safe on-device; the reconnect listener
          // (app/_layout.tsx) retries unsynced rides.
        });
    }

    set({ status: "COMPLETED", ride: finished, justUnlocked: newlyUnlocked });
    return finished;
  },

  discardRide: () => {
    stopTracking();
    const ride = get().ride;
    if (ride) db.deleteRide(ride.id);
    set({ status: "IDLE", ride: null, currentLocation: null, error: null, goal: null, goalReached: false });
  },

  clearJustUnlocked: () => set({ justUnlocked: [] }),

  recoverInProgressRide: (userId: string) => {
    const found = db.listRides(userId).find((r) => r.endedAt === null);
    const inProgress = found ? db.getRide(found.id) : null; // with its track
    if (inProgress) {
      baseSeconds = inProgress.durationSeconds;
      activeSince = null;
      segmentBreak = true;
      set({ ride: inProgress, status: "PAUSED" });
      return inProgress;
    }
    return null;
  },
}));

// Dev-only hook for manual QA / E2E on web (stripped from production builds).
if (__DEV__ && Platform.OS === "web" && typeof window !== "undefined") {
  (window as any).__ecobikeRideStore = useRideStore;
}
