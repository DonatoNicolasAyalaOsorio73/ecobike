import type { Ride } from "@/types/ride";
import type { UnlockedAchievement } from "@/types/achievement";
import type { Redemption } from "@/types/reward";

// Web has no SQLite; mirrors db.native.ts's API using localStorage so the
// same store/hook code works on every platform without an `if (web)` branch
// at every call site. Fine for a single-user browser session — if EcoBike
// Web needs multi-tab consistency later, swap this for IndexedDB.
const RIDES_KEY = "ecobike_rides_v1";
const ACHIEVEMENTS_KEY = "ecobike_achievements_v1";
const REDEMPTIONS_KEY = "ecobike_redemptions_v1";

function readRides(): Ride[] {
  try {
    const raw = localStorage.getItem(RIDES_KEY);
    return raw ? (JSON.parse(raw) as Ride[]) : [];
  } catch {
    return [];
  }
}

function writeRides(rides: Ride[]) {
  localStorage.setItem(RIDES_KEY, JSON.stringify(rides));
}

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
  rides.push(ride);
  writeRides(rides);
}

export function listRides(userId: string): Ride[] {
  return readRides()
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function getRide(id: string): Ride | null {
  return readRides().find((r) => r.id === id) ?? null;
}

export function deleteRide(id: string) {
  writeRides(readRides().filter((r) => r.id !== id));
}

export function unsyncedRides(userId: string): Ride[] {
  return readRides().filter((r) => r.userId === userId && !r.synced && r.endedAt != null);
}

export function markSynced(id: string) {
  const rides = readRides();
  const ride = rides.find((r) => r.id === id);
  if (ride) ride.synced = true;
  writeRides(rides);
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
  writeRides(readRides().filter((r) => r.userId !== userId));
  writeAchievements(readAchievements().filter((a) => a.userId !== userId));
  writeRedemptions(readRedemptions().filter((r) => r.userId !== userId));
}
