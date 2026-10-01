import { test } from "node:test";
import assert from "node:assert/strict";
import { smoothPath } from "../chartMath.ts";

test("smoothPath: empty, single point and segment count", () => {
  assert.equal(smoothPath([]), "");
  assert.equal(smoothPath([{ x: 0, y: 5 }]), "M0,5");
  const d = smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }]);
  assert.equal((d.match(/C/g) ?? []).length, 2);
});

test("smoothPath: control points never leave the [minY, maxY] band", () => {
  const d = smoothPath([{ x: 0, y: 100 }, { x: 10, y: 0 }, { x: 20, y: 100 }, { x: 30, y: 100 }], 0, 100);
  const ys = [...d.matchAll(/,(-?[\d.]+)/g)].map((m) => Number(m[1]));
  assert.ok(ys.every((y) => y >= 0 && y <= 100), d);
});
