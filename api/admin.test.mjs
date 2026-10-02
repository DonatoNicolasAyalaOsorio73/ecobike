import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { parseUserUpdate } = require("./users.js");
const { clean } = require("./stores.js");

const err = (fn, status, re) => assert.throws(fn, (e) => e.status === status && re.test(e.message));
const ID = "abc123XYZ";

test("users: points need an integer in range and a written reason", () => {
  assert.deepEqual(parseUserUpdate({ id: ID, points: "250", reason: "  Compensación por fallo GPS  " }), { points: 250, reason: "Compensación por fallo GPS" });
  err(() => parseUserUpdate({ id: ID, points: 250 }), 400, /motivo/);
  err(() => parseUserUpdate({ id: ID, points: 250, reason: "ok" }), 400, /motivo/);
  err(() => parseUserUpdate({ id: ID, points: -1, reason: "motivo largo" }), 400, /entero/);
  err(() => parseUserUpdate({ id: ID, points: 1.5, reason: "motivo largo" }), 400, /entero/);
  err(() => parseUserUpdate({ id: ID, points: 10_000_001, reason: "motivo largo" }), 400, /entero/);
});

test("users: roles come from a fixed list and partners need a store", () => {
  assert.deepEqual(parseUserUpdate({ id: ID, role: "admin" }), { role: "admin" });
  assert.deepEqual(parseUserUpdate({ id: ID, role: "partner", storeId: "store1" }), { role: "partner", storeId: "store1" });
  err(() => parseUserUpdate({ id: ID, role: "partner" }), 400, /tienda/);
  err(() => parseUserUpdate({ id: ID, role: "superadmin" }), 400, /Rol/);
});

test("users: id, account state, names and empty updates are validated", () => {
  err(() => parseUserUpdate({ points: 1, reason: "motivo largo" }), 400, /id/);
  err(() => parseUserUpdate({ id: "a/b", disabled: true }), 400, /id/);
  err(() => parseUserUpdate({ id: ID, disabled: "yes" }), 400, /Estado/);
  assert.deepEqual(parseUserUpdate({ id: ID, disabled: true }), { disabled: true });
  assert.deepEqual(parseUserUpdate({ id: ID, nombre: " Ana " }), { nombre: "Ana" });
  err(() => parseUserUpdate({ id: ID, nombre: "   " }), 400, /Nombre/);
  err(() => parseUserUpdate({ id: ID, apellido: "x".repeat(61) }), 400, /Apellido/);
  err(() => parseUserUpdate({ id: ID }), 400, /cambios/);
  err(() => parseUserUpdate({ id: ID, storeId: "s1" }), 400, /cambios/); // a stray storeId alone is not a change
});

test("stores: every new store needs a name, points and an https logo", () => {
  const ok = clean({ name: " Coldest ", pointsRequired: "400", logo: "https://x.test/l.png" }, true);
  assert.deepEqual(ok, { name: "Coldest", pointsRequired: 400, logo: "https://x.test/l.png" });
  err(() => clean({ name: "Coldest", pointsRequired: 400 }, true), 400, /logo/);
  err(() => clean({ name: "Coldest", pointsRequired: 400, logo: "" }, true), 400, /logo/);
  err(() => clean({ name: "Coldest", pointsRequired: 400, logo: "http://x.test/l.png" }, true), 400, /https/);
  err(() => clean({ name: "Coldest", pointsRequired: 400, logo: "javascript:alert(1)" }, true), 400, /https/);
  err(() => clean({ pointsRequired: 400, logo: "https://x.test/l.png" }, true), 400, /obligatorios/);
  err(() => clean({ name: "Coldest", pointsRequired: 0, logo: "https://x.test/l.png" }, true), 400, /puntos/);
});

test("stores: edits can't remove the logo, other fields stay optional", () => {
  assert.deepEqual(clean({ isActive: false }, false), { isActive: false });
  assert.deepEqual(clean({ pointsRequired: "250" }, false), { pointsRequired: 250 });
  err(() => clean({ logo: "" }, false), 400, /logo/);
});
