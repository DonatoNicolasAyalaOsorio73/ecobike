import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { parseUserUpdate } = require("./users.js");
const { clean } = require("./stores.js");

const err = (fn, status, re) => assert.throws(fn, (e) => e.status === status && re.test(e.message));
const ID = "abc123XYZ";

test("users: points need an integer in range and a written reason", () => {
  const E = { expectedPoints: 100 };
  assert.deepEqual(parseUserUpdate({ id: ID, points: "250", reason: "  Compensación por fallo GPS  ", ...E }), { id: ID, points: 250, reason: "Compensación por fallo GPS", expectedPoints: 100 });
  err(() => parseUserUpdate({ id: ID, points: 250, ...E }), 400, /motivo/);
  err(() => parseUserUpdate({ id: ID, points: 250, reason: "ok", ...E }), 400, /motivo/);
  err(() => parseUserUpdate({ id: ID, points: -1, reason: "motivo largo", ...E }), 400, /entero/);
  err(() => parseUserUpdate({ id: ID, points: 1.5, reason: "motivo largo", ...E }), 400, /entero/);
  err(() => parseUserUpdate({ id: ID, points: 10_000_001, reason: "motivo largo", ...E }), 400, /entero/);
  // null / "" / true must never silently mean "set the balance to 0".
  for (const bad of [null, "", " ", true]) err(() => parseUserUpdate({ id: ID, points: bad, reason: "motivo largo", ...E }), 400, /entero/);
  // The balance the admin saw is required, so a ride synced meanwhile is never overwritten.
  err(() => parseUserUpdate({ id: ID, points: 5, reason: "motivo largo" }), 400, /referencia/);
  err(() => parseUserUpdate({ id: ID, points: 5, reason: "motivo largo", expectedPoints: "820" }), 400, /referencia/);
  err(() => parseUserUpdate({ id: ID, expectedPoints: 820 }), 400, /cambios/);
});

test("users: roles come from a fixed list and partners need a store", () => {
  // The target id always travels with the update (the handler, the self-protection check and the audit log use it).
  assert.deepEqual(parseUserUpdate({ id: ID, role: "admin" }), { id: ID, role: "admin" });
  assert.deepEqual(parseUserUpdate({ id: ID, role: "partner", storeId: "store1" }), { id: ID, role: "partner", storeId: "store1" });
  err(() => parseUserUpdate({ id: ID, role: "partner" }), 400, /tienda/);
  err(() => parseUserUpdate({ id: ID, role: "superadmin" }), 400, /Rol/);
});

test("users: id, account state, names and empty updates are validated", () => {
  err(() => parseUserUpdate({ points: 1, reason: "motivo largo" }), 400, /id/);
  err(() => parseUserUpdate({ id: "a/b", disabled: true }), 400, /id/);
  err(() => parseUserUpdate({ id: ID, disabled: "yes" }), 400, /Estado/);
  assert.deepEqual(parseUserUpdate({ id: ID, disabled: true }), { id: ID, disabled: true });
  assert.deepEqual(parseUserUpdate({ id: ID, nombre: " Ana " }), { id: ID, nombre: "Ana" });
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

test("users: an admin can't demote or suspend themself, but can manage others", () => {
  const { assertNotSelfLockout } = require("./users.js");
  const me = "admin1";
  err(() => assertNotSelfLockout(parseUserUpdate({ id: me, role: "user" }), me), 400, /propia cuenta/);
  err(() => assertNotSelfLockout(parseUserUpdate({ id: me, disabled: true }), me), 400, /propia cuenta/);
  assert.doesNotThrow(() => assertNotSelfLockout(parseUserUpdate({ id: me, role: "admin" }), me));
  assert.doesNotThrow(() => assertNotSelfLockout(parseUserUpdate({ id: me, nombre: "Ana" }), me));
  assert.doesNotThrow(() => assertNotSelfLockout(parseUserUpdate({ id: "other1", role: "user" }), me));
});
