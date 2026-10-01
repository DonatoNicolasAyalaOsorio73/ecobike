import { test } from "node:test";
import assert from "node:assert/strict";
import { mapStoreDoc } from "../rewardsMapping.ts";

test("mapStoreDoc: parses a legacy document with a string pointsRequired", () => {
  const reward = mapStoreDoc("s1", { name: "Coldest", description: "2x1", pointsRequired: "80" });
  assert.equal(reward.title, "Coldest");
  assert.equal(reward.subtitle, "2x1");
  assert.equal(reward.pointsCost, 80);
  assert.equal(typeof reward.pointsCost, "number");
});

test("mapStoreDoc: missing fields fall back to safe defaults instead of NaN/undefined", () => {
  const reward = mapStoreDoc("s2", {});
  assert.equal(reward.title, "Recompensa");
  assert.equal(reward.subtitle, "");
  assert.equal(reward.pointsCost, 0);
});

test("mapStoreDoc: garbage pointsRequired never produces NaN", () => {
  const reward = mapStoreDoc("s3", { pointsRequired: "not-a-number" });
  assert.equal(reward.pointsCost, 0);
});
