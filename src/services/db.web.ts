import type { Ride } from "@/types/ride";
import type { UnlockedAchievement } from "@/types/achievement";
import type { Redemption } from "@/types/reward";

// Web has no SQLite; mirrors db.native.ts's API using localStorage so the
// same store/hook code works on every platform without an `if (web)` branch
// at every call site. Fine for a single-user browser session — if EcoBike
// Web needs multi-tab consistency later, swap this for IndexedDB.
//
// Summaries and GPS tracks are stored apart (spine AD-6): RIDES_KEY holds
// small summaries (points: []), each track lives under TRACK_PREFIX + id.
// Stats and lists never parse a track, an autosave rewrites one ride's track
// instead of the whole history, and a full quota can't lose a summary.
const RIDES_KEY = "ecobike_rides_v1";
const TRACK_PREFIX = "ecobike_track_v1_";
const ACHIEVEMENTS_KEY = "ecobike_achievements_v1";
const REDEMPTIONS_KEY = "ecobike_redemptions_v1";

// Parsed summaries, kept in memory: localStorage is only re-read after a write here.
let cache: Ride[] | null = null;

function readRides(): Ride[] {
  if (cache) return cache;
  let rides: Ride[] = [];
  try {
    const raw = localStorage.getItem(RIDES_KEY);
    rides = raw ? (JSON.parse(raw) as Ride[]) : [];
  } catch {
    return [];
  }
  // One-time migration from the old format (tracks inside the summary list).
  if (rides.some((r) => r.points?.length)) {
    for (const r of rides) if (r.points?.length) writeTrack(r);
    rides = rides.map((r) => ({ ...r, points: [] }));
    writeRides(rides);
  }
  cache = rides;
  return rides;
}

function writeRides(rides: Ride[]) {
  cache = rides;
  localStorage.setItem(RIDES_KEY, JSON.stringify(rides));
}

function readTrack(id: string): Ride["points"] {
  try {
    const raw = localStorage.getItem(TRACK_PREFIX + id);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Stores a ride's GPS track. When the browser's quota is full, tracks of the
 * oldest already-synced rides are dropped (their summaries and points stay,
 * and the server already has them) until this one fits.
 */
function writeTrack(ride: Ride) {
  const value = JSON.stringify(ride.points ?? []);
  for (;;) {
    try {
      localStorage.setItem(TRACK_PREFIX + ride.id, value);
      return;
    } catch {
      const victim = (cache ?? [])
        .filter((r) => r.synced && r.id !== ride.id && localStorage.getItem(TRACK_PREFIX + r.id) != null)
        .sort((a, b) => a.startedAt - b.startedAt)[0];
      if (!victim) return; // nothing left to free: keep the summary, lose only the map line
      localStorage.removeItem(TRACK_PREFIX + victim.id);
    }
  }
}

const withTrack = (r: Ride): Ride => ({ ...r, points: readTrack(r.id) });

function readAchievements(): (UnlockedAchievement & { userId: string })[] {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAchievements(rows: (UnlockedAchievement & { userId: string })[]) {
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(rows));
}

export function initDb() {
  // no-op on web: localStorage needs no schema setup
}

export function saveRide(ride: Ride) {
  const rides = readRides().filter((r) => r.id !== ride.id);
  writeTrack(ride);
  rides.push({ ...ride, points: [] });
  writeRides(rides);
}

/** Summaries only (`points: []`); use getRide for the track. */
export function listRides(userId: string): Ride[] {
  return readRides()
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function getRide(id: string): Ride | null {
  const r = readRides().find((x) => x.id === id);
  return r ? withTrack(r) : null;
}

export function deleteRide(id: string) {
  localStorage.removeItem(TRACK_PREFIX + id);
  writeRides(readRides().filter((r) => r.id !== id));
}

/** Full rides (with tracks): the server needs the track to verify them. */
export function unsyncedRides(userId: string): Ride[] {
  return readRides()
    .filter((r) => r.userId === userId && !r.synced && r.endedAt != null)
    .map(withTrack);
}

export function markSynced(id: string) {
  writeRides(readRides().map((r) => (r.id === id ? { ...r, synced: true } : r)));
}

export function listUnlockedAchievements(userId: string): UnlockedAchievement[] {
  return readAchievements().filter((a) => a.userId === userId);
}

export function unlockAchievement(userId: string, code: string) {
  const rows = readAchievements();
  if (rows.some((r) => r.userId === userId && r.code === code)) return;
  rows.push({ userId, code, unlockedAt: Date.now() });
  writeAchievements(rows);
}

function readRedemptions(): (Redemption & { userId: string })[] {
  try {
    const raw = localStorage.getItem(REDEMPTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeRedemptions(rows: (Redemption & { userId: string })[]) {
  localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(rows));
}

export function listRedemptions(userId: string): Redemption[] {
  return readRedemptions()
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.redeemedAt - a.redeemedAt);
}

export function saveRedemption(userId: string, redemption: Redemption) {
  const rows = readRedemptions();
  rows.push({ ...redemption, userId });
  writeRedemptions(rows);
}

export function wipeAllLocalData(userId: string) {
  for (const r of readRides()) if (r.userId === userId) localStorage.removeItem(TRACK_PREFIX + r.id);
  writeRides(readRides().filter((r) => r.userId !== userId));
  writeAchievements(readAchievements().filter((a) => a.userId !== userId));
  writeRedemptions(readRedemptions().filter((r) => r.userId !== userId));
}
