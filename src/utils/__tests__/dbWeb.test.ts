import { test } from "node:test";
import assert from "node:assert/strict";
import { createEmptyRide, type Ride } from "@/types/ride";

// A localStorage with a tiny quota, to exercise the full-storage path.
class MemoryStorage {
  map = new Map<string, string>();
  quota = Infinity;
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    const size = [...this.map.entries()].reduce((s, [key, val]) => s + (key === k ? 0 : val.length), 0) + v.length;
    if (size > this.quota) throw new Error("QuotaExceededError");
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}
const storage = new MemoryStorage();
(globalThis as any).localStorage = storage;

// Old format first: every track inside the summary list.
const ride = (id: string, startedAt: number, n: number, synced = true): Ride => ({
  ...createEmptyRide("u1", id),
  startedAt,
  endedAt: startedAt + 600_000,
  synced,
  points: Array.from({ length: n }, (_, i) => ({ lat: 1 + i / 1e5, lng: -77, altitude: null, timestamp: startedAt + i * 1000, speed: 5 })),
});
storage.setItem("ecobike_rides_v1", JSON.stringify([ride("old1", 1000, 50), ride("old2", 2000, 50)]));

const db = await import("@/services/db.web");

test("web storage: old format migrates; lists are summaries; getRide has the track", () => {
  const list = db.listRides("u1");
  assert.deepEqual(list.map((r) => r.id), ["old2", "old1"]);
  assert.ok(list.every((r) => r.points.length === 0));
  assert.equal(db.getRide("old1")!.points.length, 50);
  assert.ok(!JSON.parse(storage.getItem("ecobike_rides_v1")!).some((r: Ride) => r.points.length));
});

test("web storage: unsynced rides come with their track (the server needs it)", () => {
  db.saveRide(ride("new1", 3000, 30, false));
  const pending = db.unsyncedRides("u1");
  assert.deepEqual(pending.map((r) => r.id), ["new1"]);
  assert.equal(pending[0].points.length, 30);
  db.markSynced("new1");
  assert.equal(db.unsyncedRides("u1").length, 0);
  assert.equal(db.getRide("new1")!.points.length, 30);
});

test("web storage: a full quota drops the oldest synced track, never the new ride", () => {
  storage.quota = [...storage.map.values()].reduce((s, v) => s + v.length, 0) + 2500;
  db.saveRide(ride("big", 4000, 60, false));
  assert.equal(db.getRide("big")!.points.length, 60);
  assert.equal(db.getRide("old1")!.points.length, 0); // oldest synced track freed
  assert.ok(db.listRides("u1").some((r) => r.id === "old1")); // its summary stays
  storage.quota = Infinity;
});

test("web storage: delete and wipe remove tracks too", () => {
  db.deleteRide("big");
  assert.equal(storage.getItem("ecobike_track_v1_big"), null);
  db.wipeAllLocalData("u1");
  assert.equal(db.listRides("u1").length, 0);
  assert.ok(![...storage.map.keys()].some((k) => k.startsWith("ecobike_track_v1_")));
});
