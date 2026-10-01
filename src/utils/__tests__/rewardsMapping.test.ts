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

test("mapStoreDoc: only https logos become imageUrl", () => {
  assert.equal(mapStoreDoc("s4", { logo: "https://x.test/a.png" }).imageUrl, "https://x.test/a.png");
  assert.equal(mapStoreDoc("s5", { logo: "javascript:alert(1)" }).imageUrl, undefined);
  assert.equal(mapStoreDoc("s6", { logo: "" }).imageUrl, undefined);
});
