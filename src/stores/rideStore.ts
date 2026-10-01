import { create } from "zustand";
import * as Location from "expo-location";
import { createEmptyRide, type Ride, type RideStatus, type TrackPoint } from "@/types/ride";
import { avgSpeedKmh, estimateCalories, incrementalDistanceMeters, totalElevationGainMeters } from "@/utils/geo";
import { pointsForRide, computeStreakDays, evaluateAchievements } from "@/utils/gamification";
import type { AchievementDef, RiderStats } from "@/types/achievement";
import * as db from "@/services/db";
import { queueRideForSync } from "@/services/rides.service";
import { addPointsToProfile } from "@/services/auth.service";
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

let watchSubscription: Location.LocationSubscription | null = null;
let tickInterval: ReturnType<typeof setInterval> | null = null;
let ticksSinceAutosave = 0;

function stopTracking() {
  watchSubscription?.remove();
  watchSubscription = null;
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = null;
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
    set({ ride, status: "ACTIVE", currentLocation: null });

    watchSubscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 3000, distanceInterval: 5 },
      (loc) => {
        const state = get();
        if (state.status !== "ACTIVE" || !state.ride) return;
        const point: TrackPoint = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          altitude: loc.coords.altitude,
          timestamp: loc.timestamp,
          speed: loc.coords.speed,
        };
        const points = [...state.ride.points, point];
        const prev = state.ride.points[state.ride.points.length - 1];
        const addedDistance = prev ? incrementalDistanceMeters(prev, point) : 0;
        const distanceMeters = state.ride.distanceMeters + addedDistance;
        const speedKmh = (loc.coords.speed ?? 0) * 3.6;

        set({
          currentLocation: { lat: point.lat, lng: point.lng },
          ride: {
            ...state.ride,
            points,
            distanceMeters,
            maxSpeedKmh: Math.max(state.ride.maxSpeedKmh, speedKmh),
            elevationGainMeters: totalElevationGainMeters(points),
          },
        });
      }
    );

    tickInterval = setInterval(() => {
      const state = get();
      if (state.status !== "ACTIVE" || !state.ride) return;
      const durationSeconds = state.ride.durationSeconds + 1;
      set({
        ride: {
          ...state.ride,
          durationSeconds,
          avgSpeedKmh: avgSpeedKmh(state.ride.distanceMeters, durationSeconds),
        },
      });

      ticksSinceAutosave++;
      if (ticksSinceAutosave >= 15) {
        ticksSinceAutosave = 0;
        const current = get().ride;
        if (current) db.saveRide(current);
      }
    }, 1000);
  },

  pauseRide: () => {
    if (get().status !== "ACTIVE") return;
    set({ status: "PAUSED" });
    const ride = get().ride;
    if (ride) db.saveRide(ride);
  },

  resumeRide: () => {
    if (get().status !== "PAUSED") return;
    set({ status: "ACTIVE" });
  },

  finishRide: async () => {
    const { ride, status } = get();
    if (!ride || (status !== "ACTIVE" && status !== "PAUSED")) return null;
    set({ status: "FINISHING" });
    stopTracking();

    const finished: Ride = {
      ...ride,
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

    // Real accounts (not a local guest id) get their points written to the
    // same `puntosAcumulados` field the mobile app reads — a ride tracked
    // on web shows up in the mobile app's balance, and vice versa. Guests
    // have no Firebase Auth session, so `usuarios/{uid}` writes would always
    // be permission-denied for them anyway — skip the pointless round trip.
    if (isFirebaseConfigured && !ride.userId.startsWith("guest_")) {
      queueRideForSync(finished).catch(() => {
        // Sync is best-effort; the ride is already safe on-device (rule:
        // never lose a completed ride because the network isn't available).
        // A reconnect listener (app/_layout.tsx) retries unsynced rides.
      });
      addPointsToProfile(ride.userId, finished.pointsEarned).catch(() => {});
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
      set({ ride: inProgress, status: "PAUSED" });
      return inProgress;
    }
    return null;
  },
}));
