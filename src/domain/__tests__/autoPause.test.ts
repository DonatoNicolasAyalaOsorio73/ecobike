import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTO_PAUSE_AFTER_MS, autoPauseAction, speedMs } from "../autoPause.ts";

const base = { enabled: true, status: "ACTIVE", autoPaused: false, movingNow: false, lastMovingAt: 0, now: AUTO_PAUSE_AFTER_MS };

test("pauses after being stopped long enough, not before", () => {
  assert.equal(autoPauseAction(base), "pause");
  assert.equal(autoPauseAction({ ...base, now: AUTO_PAUSE_AFTER_MS - 1 }), null);
  assert.equal(autoPauseAction({ ...base, movingNow: true }), null);
});

test("resumes only rides it auto-paused, and never when disabled", () => {
  assert.equal(autoPauseAction({ ...base, status: "PAUSED", autoPaused: true, movingNow: true }), "resume");
  assert.equal(autoPauseAction({ ...base, status: "PAUSED", autoPaused: false, movingNow: true }), null);
  assert.equal(autoPauseAction({ ...base, enabled: false }), null);
});

test("speedMs prefers GPS speed, falls back to distance/time", () => {
  assert.equal(speedMs(3, 0, 0), 3);
  assert.equal(speedMs(0.0001, 6, 1000), 6); // fused provider's near-zero speed on a fix that moved
  assert.equal(speedMs(null, 10, 2000), 5);
  assert.equal(speedMs(undefined, 10, 0), 0);
  assert.equal(speedMs(-1, 4, 1000), 4); // iOS reports -1 when unknown
  assert.equal(speedMs(0, 6, 1000), 6); // Android reports 0.0 when the fix has no speed: use the movement
  assert.equal(speedMs(0, 0, 3000), 0); // really stopped
});
