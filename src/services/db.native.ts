import * as SQLite from "expo-sqlite";
import type { Ride, TrackPoint } from "@/types/ride";
import type { UnlockedAchievement } from "@/types/achievement";
import type { Redemption } from "@/types/reward";

// Local-first storage: every ride is written here first and works fully
// offline. Firebase sync (rides.service.ts) is an optional layer on top for
// cross-device history and social features, never a requirement for
// tracking to work.
const db = SQLite.openDatabaseSync("ecobike.db");

export function initDb() {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS rides (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      startedAt INTEGER NOT NULL,
      endedAt INTEGER,
      distanceMeters REAL NOT NULL,
      durationSeconds REAL NOT NULL,
      avgSpeedKmh REAL NOT NULL,
      maxSpeedKmh REAL NOT NULL,
      elevationGainMeters REAL NOT NULL,
      caloriesKcal REAL NOT NULL,
      pointsEarned INTEGER NOT NULL,
      pointsJson TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_rides_user ON rides(userId, startedAt DESC);

    CREATE TABLE IF NOT EXISTS achievements (
      userId TEXT NOT NULL,
      code TEXT NOT NULL,
      unlockedAt INTEGER NOT NULL,
      PRIMARY KEY (userId, code)
    );

    CREATE TABLE IF NOT EXISTS redemptions (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      rewardId TEXT NOT NULL,
      rewardTitle TEXT NOT NULL,
      pointsSpent INTEGER NOT NULL,
      code TEXT NOT NULL,
      redeemedAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_redemptions_user ON redemptions(userId, redeemedAt DESC);
  `);
  // v2: bike-verification verdict per ride. Added columns, so older installs
  // migrate in place; NULL = stored before verification existed.
  const cols = db.getAllSync<{ name: string }>(`PRAGMA table_info(rides)`).map((c) => c.name);
  if (!cols.includes("verified")) db.execSync(`ALTER TABLE rides ADD COLUMN verified INTEGER`);
  if (!cols.includes("pointsReason")) db.execSync(`ALTER TABLE rides ADD COLUMN pointsReason TEXT`);
}

function rowToRide(row: any): Ride {
  return {
    id: row.id,
    userId: row.userId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    distanceMeters: row.distanceMeters,
    durationSeconds: row.durationSeconds,
    avgSpeedKmh: row.avgSpeedKmh,
    maxSpeedKmh: row.maxSpeedKmh,
    elevationGainMeters: row.elevationGainMeters,
    caloriesKcal: row.caloriesKcal,
    points: JSON.parse(row.pointsJson) as TrackPoint[],
    pointsEarned: row.pointsEarned,
    verified: row.verified == null ? undefined : Boolean(row.verified),
    pointsReason: row.pointsReason ?? null,
    synced: Boolean(row.synced),
    error: row.error,
  };
}

export function saveRide(ride: Ride) {
  db.runSync(
    `INSERT OR REPLACE INTO rides
      (id, userId, startedAt, endedAt, distanceMeters, durationSeconds, avgSpeedKmh, maxSpeedKmh, elevationGainMeters, caloriesKcal, pointsEarned, pointsJson, synced, error, verified, pointsReason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ride.id,
      ride.userId,
      ride.startedAt,
      ride.endedAt,
      ride.distanceMeters,
      ride.durationSeconds,
      ride.avgSpeedKmh,
      ride.maxSpeedKmh,
      ride.elevationGainMeters,
      ride.caloriesKcal,
      ride.pointsEarned,
      JSON.stringify(ride.points),
      ride.synced ? 1 : 0,
      ride.error,
      ride.verified == null ? null : ride.verified ? 1 : 0,
      ride.pointsReason ?? null,
    ]
  );
}

export function listRides(userId: string): Ride[] {
  const rows = db.getAllSync(
    `SELECT * FROM rides WHERE userId = ? ORDER BY startedAt DESC`,
    [userId]
  );
  return rows.map(rowToRide);
}

export function getRide(id: string): Ride | null {
  const row = db.getFirstSync(`SELECT * FROM rides WHERE id = ?`, [id]);
  return row ? rowToRide(row) : null;
}

export function deleteRide(id: string) {
  db.runSync(`DELETE FROM rides WHERE id = ?`, [id]);
}

export function unsyncedRides(userId: string): Ride[] {
  const rows = db.getAllSync(
    `SELECT * FROM rides WHERE userId = ? AND synced = 0 AND endedAt IS NOT NULL`,
    [userId]
  );
  return rows.map(rowToRide);
}

export function markSynced(id: string) {
  db.runSync(`UPDATE rides SET synced = 1 WHERE id = ?`, [id]);
}

export function listUnlockedAchievements(userId: string): UnlockedAchievement[] {
  const rows = db.getAllSync(
    `SELECT code, unlockedAt FROM achievements WHERE userId = ?`,
    [userId]
  );
  return rows as UnlockedAchievement[];
}

export function unlockAchievement(userId: string, code: string) {
  db.runSync(
    `INSERT OR IGNORE INTO achievements (userId, code, unlockedAt) VALUES (?, ?, ?)`,
    [userId, code, Date.now()]
  );
}

export function listRedemptions(userId: string): Redemption[] {
  const rows = db.getAllSync(`SELECT * FROM redemptions WHERE userId = ? ORDER BY redeemedAt DESC`, [userId]);
  return rows as Redemption[];
}

export function saveRedemption(userId: string, redemption: Redemption) {
  db.runSync(
    `INSERT INTO redemptions (id, userId, rewardId, rewardTitle, pointsSpent, code, redeemedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [redemption.id, userId, redemption.rewardId, redemption.rewardTitle, redemption.pointsSpent, redemption.code, redemption.redeemedAt]
  );
}

export function wipeAllLocalData(userId: string) {
  db.runSync(`DELETE FROM rides WHERE userId = ?`, [userId]);
  db.runSync(`DELETE FROM achievements WHERE userId = ?`, [userId]);
  db.runSync(`DELETE FROM redemptions WHERE userId = ?`, [userId]);
}
