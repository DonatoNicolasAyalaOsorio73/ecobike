import { test } from "node:test";
import assert from "node:assert/strict";
import { mapStoreDoc, storeInitials, visibleRewards } from "../rewardsMapping.ts";

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

const r = (id: string, title: string, subtitle: string, pointsCost: number) => ({ id, title, subtitle, details: "", pointsCost, icon: "gift" });
const catalog = [r("a", "BikeShop", "15% de descuento", 150), r("b", "Coldest", "2x1 en bebida", 80), r("c", "Café Pedal", "Tinto gratis", 300), r("d", "Taller", "Revisión gratis", 50)];

test("visibleRewards: redeemable first, then cheapest", () => {
  assert.deepEqual(visibleRewards(catalog, 120, "", false).map((x) => x.id), ["d", "b", "a", "c"]);
});

test("visibleRewards: 'can redeem' filter keeps only affordable ones", () => {
  assert.deepEqual(visibleRewards(catalog, 120, "", true).map((x) => x.id), ["d", "b"]);
});

test("visibleRewards: search is accent- and case-insensitive over name and description", () => {
  assert.deepEqual(visibleRewards(catalog, 0, "cafe", false).map((x) => x.id), ["c"]);
  assert.deepEqual(visibleRewards(catalog, 0, "REVISION", false).map((x) => x.id), ["d"]);
  assert.deepEqual(visibleRewards(catalog, 0, "nada", false), []);
});

test("storeInitials: monogram for stores without a logo", () => {
  assert.equal(storeInitials("Taller CicloFix"), "TC");
  assert.equal(storeInitials("coldest"), "C");
  assert.equal(storeInitials("  Él  Café  Norte "), "ÉC");
  assert.equal(storeInitials("- 7 Bikes"), "7B");
  assert.equal(storeInitials("   "), "?");
});
