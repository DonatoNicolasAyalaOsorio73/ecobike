import { create } from "zustand";
import { Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { createEmptyRide, type Ride, type RideStatus, type TrackPoint } from "@/types/ride";
import { avgSpeedKmh, estimateCalories, incrementalDistanceMeters, totalElevationGainMeters } from "@/utils/geo";
import { pointsForRide, computeStreakDays, evaluateAchievements } from "@/utils/gamification";
import type { AchievementDef, RiderStats } from "@/types/achievement";
import * as db from "@/services/db";
import { queueRideForSync } from "@/services/rides.service";
import { useAuthStore } from "@/stores/authStore";
import { isFirebaseConfigured } from "@/services/firebase";

interface RideState {
  status: RideStatus;
  ride: Ride | null;
  error: string | null;
  justUnlocked: AchievementDef[];
  currentLocation: { lat: number; lng: number } | null;
  requestPermissions: () => Promise<boolean>;
  startRide: (userId: string) => Promise<void>;
  pauseRide: () => void;
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
}

function onLocations(locs: Location.LocationObject[]) {
  const store = useRideStore;
  for (const loc of locs) {
    const state = store.getState();
    if (state.status !== "ACTIVE" || !state.ride) return;
    if (loc.coords.accuracy != null && loc.coords.accuracy > MAX_ACCURACY_M) continue;
    const point: TrackPoint = {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      altitude: loc.coords.altitude,
      timestamp: loc.timestamp,
      speed: loc.coords.speed,
    };
    const prev = state.ride.points[state.ride.points.length - 1];
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
        maxSpeedKmh: Math.max(state.ride.maxSpeedKmh, (loc.coords.speed ?? 0) * 3.6),
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
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        distanceInterval: 5,
        activityType: Location.ActivityType.Fitness,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "EcoBike está registrando tu recorrido",
          notificationBody: "Toca para volver a la app.",
          notificationColor: "#ADF14B",
        },
      });
      backgroundUpdates = true;
    } else {
      // Foreground only (web, or background permission declined).
      watchSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 3000, distanceInterval: 5 },
        (loc) => onLocations([loc])
      );
    }
  }

  if (!tickInterval) {
    tickInterval = setInterval(() => {
      const state = useRideStore.getState();
      if (state.status !== "ACTIVE" || !state.ride) return;
      const durationSeconds = elapsedSeconds();
      useRideStore.setState({
        ride: { ...state.ride, durationSeconds, avgSpeedKmh: avgSpeedKmh(state.ride.distanceMeters, durationSeconds) },
      });
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

  requestPermissions: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  },

  startRide: async (userId: string) => {
    set({ status: "PREPARING", error: null });
    const granted = await get().requestPermissions();
    if (!granted) {
      set({ status: "ERROR", error: "Permiso de ubicación denegado. Actívalo en Ajustes para registrar recorridos." });
      return;
    }

    const ride = createEmptyRide(userId, `${userId}_${Date.now()}`);
    baseSeconds = 0;
    activeSince = Date.now();
    segmentBreak = true;
    set({ ride, status: "ACTIVE", currentLocation: null });
    try {
      await ensureTracking();
    } catch {
      stopTracking();
      set({ status: "ERROR", error: "No se pudo iniciar el GPS. Revisa que la ubicación esté activada." });
    }
  },

  pauseRide: () => {
    const ride = get().ride;
    if (get().status !== "ACTIVE" || !ride) return;
    baseSeconds = elapsedSeconds();
    activeSince = null;
    segmentBreak = true;
    const paused = { ...ride, durationSeconds: baseSeconds };
    set({ status: "PAUSED", ride: paused });
    db.saveRide(paused);
  },

  resumeRide: () => {
    if (get().status !== "PAUSED") return;
    activeSince = Date.now();
    segmentBreak = true;
    set({ status: "ACTIVE" });
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
      caloriesKcal: estimateCalories(ride.distanceMeters),
    };
    finished.pointsEarned = pointsForRide(finished);

    db.saveRide(finished);

    const history = db.listRides(ride.userId);
    const stats: RiderStats = {
      totalRides: history.length,
      totalDistanceMeters: history.reduce((sum, r) => sum + r.distanceMeters, 0),
      totalDurationSeconds: history.reduce((sum, r) => sum + r.durationSeconds, 0),
      bestRide: history.reduce<Ride | null>(
        (best, r) => (!best || r.distanceMeters > best.distanceMeters ? r : best),
        null
      ),
      currentStreakDays: computeStreakDays(history.map((r) => new Date(r.startedAt))),
      totalPoints: history.reduce((sum, r) => sum + r.pointsEarned, 0),
    };

    const alreadyUnlocked = new Set(db.listUnlockedAchievements(ride.userId).map((a) => a.code));
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
    set({ status: "IDLE", ride: null, currentLocation: null, error: null });
  },

  clearJustUnlocked: () => set({ justUnlocked: [] }),

  recoverInProgressRide: (userId: string) => {
    const rides = db.listRides(userId);
    const inProgress = rides.find((r) => r.endedAt === null);
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
