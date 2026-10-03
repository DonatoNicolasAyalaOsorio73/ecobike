import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// Real handlers end to end against an in-memory firebase-admin (_fake-admin.cjs):
// auth, role checks, transactions, audit log and the money rules together.
const require = createRequire(import.meta.url);
const { installFakeAdmin, call, Timestamp } = require("./_fake-admin.cjs");
const db = installFakeAdmin();
const users = require("./users.js");
const stores = require("./stores.js");
const redeem = require("./redeem.js");
const rides = require("./rides.js");
const friends = require("./friends.js");
const me = require("./me.js");

const ADMIN = "admin1";
const RIDER = "rider1";
let adminTok;
let riderTok;

beforeEach(() => {
  db.docs.clear();
  db.users.clear();
  db.tokens.clear();
  db.revoked.clear();
  db.deletedPrefixes.length = 0;
  db.now = Date.now();
  adminTok = db.signIn(ADMIN);
  riderTok = db.signIn(RIDER);
  db.put(`usuarios/${ADMIN}`, { role: "admin", isAdmin: true, nombre: "Ada", apellido: "Admin", puntosAcumulados: 0 });
  db.put(`usuarios/${RIDER}`, { role: "user", nombre: "Rita", apellido: "Ruiz", username: "rita", email: "rita@example.test", puntosAcumulados: 500 });
  db.put(`usuarios_public/${RIDER}`, { username: "rita", nombre: "Rita", apellido: "Ruiz", puntosAcumulados: 500 });
  db.put("tiendas/coldest", { name: "Coldest", pointsRequired: 400, logo: "https://x.test/c.png", isActive: true });
});

const logs = () => [...db.docs.entries()].filter(([k]) => k.startsWith("admin_logs/")).map(([, v]) => v);

// ─── /api/users ────────────────────────────────────────────────────────────

test("users: only admins get in", async () => {
  assert.equal((await call(users, { token: riderTok })).status, 403);
  assert.equal((await call(users, {})).status, 401);
});

test("users: search by username prefix and by exact email", async () => {
  const byName = await call(users, { method: "POST", token: adminTok, body: { q: "@ri" } });
  assert.equal(byName.status, 200);
  assert.deepEqual(byName.body.users.map((u) => u.uid), [RIDER]);
  const byEmail = await call(users, { method: "POST", token: adminTok, body: { q: "rider1@example.test" } });
  assert.deepEqual(byEmail.body.users.map((u) => u.uid), [RIDER]);
  const none = await call(users, { method: "POST", token: adminTok, body: { q: "nadie@example.test" } });
  assert.deepEqual(none.body.users, []);
});

test("users: points adjustment updates balance and mirror, and is audited", async () => {
  const r = await call(users, { method: "PUT", token: adminTok, body: { id: RIDER, points: 650, reason: "Bono evento ciclovía", expectedPoints: 500 } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(db.get(`usuarios/${RIDER}`).puntosAcumulados, 650);
  assert.equal(db.get(`usuarios_public/${RIDER}`).puntosAcumulados, 650);
  assert.equal(r.body.user.points, 650);
  const [log] = logs();
  assert.equal(log.action, "user.update");
  assert.equal(log.targetId, RIDER);
  assert.deepEqual(log.details.points, { from: 500, to: 650, reason: "Bono evento ciclovía" });
});

test("users: a stale balance is refused instead of overwriting a synced ride", async () => {
  const r = await call(users, { method: "PUT", token: adminTok, body: { id: RIDER, points: 650, reason: "Bono evento ciclovía", expectedPoints: 450 } });
  assert.equal(r.status, 409);
  assert.equal(db.get(`usuarios/${RIDER}`).puntosAcumulados, 500);
});

test("users: role change to partner needs an existing store; suspension revokes sessions", async () => {
  assert.equal((await call(users, { method: "PUT", token: adminTok, body: { id: RIDER, role: "partner", storeId: "nope" } })).status, 404);
  const ok = await call(users, { method: "PUT", token: adminTok, body: { id: RIDER, role: "partner", storeId: "coldest" } });
  assert.equal(ok.status, 200);
  assert.equal(db.get(`usuarios/${RIDER}`).storeId, "coldest");
  const s = await call(users, { method: "PUT", token: adminTok, body: { id: RIDER, disabled: true } });
  assert.equal(s.status, 200);
  assert.equal(db.users.get(RIDER).disabled, true);
  assert.equal(db.get(`usuarios/${RIDER}`).cuentaActiva, false);
  assert.equal((await call(users, { token: riderTok })).status, 401); // revoked session
});

test("users: an admin can't demote or suspend themself", async () => {
  assert.equal((await call(users, { method: "PUT", token: adminTok, body: { id: ADMIN, role: "user" } })).status, 400);
  assert.equal((await call(users, { method: "PUT", token: adminTok, body: { id: ADMIN, disabled: true } })).status, 400);
  assert.equal(db.get(`usuarios/${ADMIN}`).role, "admin");
});

test("users: delete erases the account and logs it without personal data", async () => {
  db.put(`usuarios/${RIDER}/rides/r1`, { pointsEarned: 10 });
  assert.equal((await call(users, { method: "DELETE", token: adminTok, body: { id: RIDER, reason: "x" } })).status, 400); // reason required
  const r = await call(users, { method: "DELETE", token: adminTok, body: { id: RIDER, reason: "Cuenta duplicada" } });
  assert.equal(r.status, 200);
  assert.equal(db.get(`usuarios/${RIDER}`), undefined);
  assert.equal(db.get(`usuarios/${RIDER}/rides/r1`), undefined);
  assert.equal(db.get(`usuarios_public/${RIDER}`), undefined);
  assert.equal(db.users.has(RIDER), false);
  const [log] = logs();
  assert.equal(log.action, "user.delete");
  assert.deepEqual(log.details, { reason: "Cuenta duplicada" });
  assert.equal((await call(users, { method: "DELETE", token: adminTok, body: { id: ADMIN, reason: "Me voy ya" } })).status, 400);
});

// ─── /api/stores ───────────────────────────────────────────────────────────

test("stores: create needs a logo; create and edit are audited", async () => {
  assert.equal((await call(stores, { method: "POST", token: adminTok, body: { name: "Bici", pointsRequired: 300 } })).status, 400);
  const c = await call(stores, { method: "POST", token: adminTok, body: { name: "Bici", pointsRequired: 300, logo: "https://x.test/b.png" } });
  assert.equal(c.status, 200);
  const id = c.body.store.id;
  const u = await call(stores, { method: "PUT", token: adminTok, body: { id, isActive: false } });
  assert.equal(u.status, 200);
  assert.equal(u.body.store.isActive, false);
  assert.deepEqual(logs().map((l) => l.action), ["store.create", "store.update"]);
  assert.equal((await call(stores, { method: "POST", token: riderTok, body: { name: "X", pointsRequired: 1, logo: "https://x.test/l.png" } })).status, 403);
});

test("stores: delete is refused while customers hold unused codes or partners are assigned", async () => {
  db.put(`usuarios/${RIDER}/codigos_canjeados/c1`, { rewardId: "coldest", status: "active", code: "ABC123" });
  assert.equal((await call(stores, { method: "DELETE", token: adminTok, body: { id: "coldest" } })).status, 409);
  db.put(`usuarios/${RIDER}/codigos_canjeados/c1`, { rewardId: "coldest", status: "used", code: "ABC123" });
  db.put("usuarios/partner1", { role: "partner", storeId: "coldest" });
  assert.equal((await call(stores, { method: "DELETE", token: adminTok, body: { id: "coldest" } })).status, 409);
  db.docs.delete("usuarios/partner1");
  const ok = await call(stores, { method: "DELETE", token: adminTok, body: { id: "coldest" } });
  assert.equal(ok.status, 200);
  assert.equal(db.get("tiendas/coldest"), undefined);
  assert.deepEqual(db.deletedPrefixes, ["stores/coldest/"]); // its logos go too
});

// ─── /api/redeem ───────────────────────────────────────────────────────────

const verifiedRides = (n) => {
  for (let i = 0; i < n; i++) db.put(`usuarios/${RIDER}/rides/v${i}`, { verified: true, pointsEarned: 20 });
};

test("redeem: needs 3 verified rides; rides from before verification don't count", async () => {
  db.put(`usuarios/${RIDER}/rides/old1`, { pointsEarned: 40 }); // legacy, no flag
  verifiedRides(2);
  const r = await call(redeem, { method: "POST", token: riderTok, body: { rewardId: "coldest" } });
  assert.equal(r.status, 403);
  assert.match(r.body.error, /llevas 2/);
});

test("redeem: success charges the server price; a second one the same day is refused", async () => {
  verifiedRides(3);
  const r = await call(redeem, { method: "POST", token: riderTok, body: { rewardId: "coldest", pointsCost: 1 } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.pointsSpent, 400); // never the client's number
  assert.equal(db.get(`usuarios/${RIDER}`).puntosAcumulados, 100);
  assert.equal(db.get(`usuarios_public/${RIDER}`).puntosAcumulados, 100);
  assert.match(r.body.code, /^[A-Z0-9]{6,20}$/);
  db.put(`usuarios/${RIDER}`, { ...db.get(`usuarios/${RIDER}`), puntosAcumulados: 5000 });
  assert.equal((await call(redeem, { method: "POST", token: riderTok, body: { rewardId: "coldest" } })).status, 429);
});

test("redeem: not enough points, inactive store, unverified email", async () => {
  verifiedRides(3);
  db.put(`usuarios/${RIDER}`, { ...db.get(`usuarios/${RIDER}`), puntosAcumulados: 100 });
  assert.equal((await call(redeem, { method: "POST", token: riderTok, body: { rewardId: "coldest" } })).status, 409);
  db.put("tiendas/hidden", { name: "Oculta", pointsRequired: 10, isActive: false });
  assert.equal((await call(redeem, { method: "POST", token: riderTok, body: { rewardId: "hidden" } })).status, 404);
  const pwTok = db.signIn("pw1", { email_verified: false, firebase: { sign_in_provider: "password" } });
  assert.equal((await call(redeem, { method: "POST", token: pwTok, body: { rewardId: "coldest" } })).status, 403);
});

// ─── /api/rides ────────────────────────────────────────────────────────────

const M = 111194.93;
function bikeRide(id, startedAt, km = 10, kmh = 18) {
  const dt = 5;
  const step = (kmh / 3.6) * dt;
  const n = Math.round((km * 1000) / step);
  const track = Array.from({ length: n + 1 }, (_, i) => [1.2 + (i * step) / M, -77.28, startedAt + i * dt * 1000]);
  const durationSeconds = n * dt;
  return { id, startedAt, endedAt: startedAt + durationSeconds * 1000, distanceMeters: km * 1000, durationSeconds, avgSpeedKmh: kmh, maxSpeedKmh: kmh + 5, elevationGainMeters: 10, caloriesKcal: 200, track };
}

test("rides: a verified bike ride earns server points once (idempotent)", async () => {
  const ride = bikeRide("ride-aaaaaa", db.now - 3 * 3600_000);
  const r = await call(rides, { method: "POST", token: riderTok, body: ride });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.pointsEarned, 10 * 5 + 5);
  assert.equal(r.body.verified, true);
  assert.equal(db.get(`usuarios/${RIDER}`).puntosAcumulados, 555);
  const again = await call(rides, { method: "POST", token: riderTok, body: ride });
  assert.equal(again.body.duplicate, true);
  assert.equal(db.get(`usuarios/${RIDER}`).puntosAcumulados, 555);
});

test("rides: the daily cap keeps a real ride verified with fewer points", async () => {
  db.put(`usuarios/${RIDER}/rides/earlier`, { pointsEarned: 120, verified: true, startedAt: db.now - 20 * 3600_000, endedAt: db.now - 19 * 3600_000, createdAt: Timestamp.fromMillis(db.now - 3600_000) });
  const r = await call(rides, { method: "POST", token: riderTok, body: bikeRide("ride-bbbbbb", db.now - 3 * 3600_000) });
  assert.equal(r.body.pointsEarned, 30);
  assert.equal(r.body.verified, true);
  assert.match(r.body.reason, /Límite diario/);
});

test("rides: a walk stores 0 points and is not verified", async () => {
  const r = await call(rides, { method: "POST", token: riderTok, body: bikeRide("ride-cccccc", db.now - 3 * 3600_000, 2, 5) });
  assert.equal(r.status, 200);
  assert.equal(r.body.pointsEarned, 0);
  assert.equal(r.body.verified, false);
  assert.equal(db.get(`usuarios/${RIDER}`).puntosAcumulados, 500);
});

// ─── /api/friends search, /api/me projection ──────────────────────────────

test("friends: exact username search honors 'hide me'; availability", async () => {
  db.put("usernames/rita", { uid: RIDER });
  const found = await call(friends, { method: "POST", token: adminTok, body: { action: "search", username: "@Rita" } });
  assert.equal(found.status, 200);
  assert.equal(found.body.user.uid, RIDER);
  assert.equal(found.body.user.amigos, undefined); // never exposes friend lists
  db.put(`usuarios_public/${RIDER}`, { ...db.get(`usuarios_public/${RIDER}`), buscable: false });
  assert.equal((await call(friends, { method: "POST", token: adminTok, body: { action: "search", username: "rita" } })).body.user, null);
  assert.equal((await call(friends, { method: "POST", token: adminTok, body: { action: "available", username: "rita" } })).body.available, false);
  assert.equal((await call(friends, { method: "POST", token: riderTok, body: { action: "available", username: "rita" } })).body.available, true); // my own
  assert.equal((await call(friends, { method: "POST", token: adminTok, body: { action: "available", username: "nueva.ciclista" } })).body.available, true);
});

test("me: the public mirror gets only validated fields, never friends", async () => {
  db.put(`usuarios/${RIDER}`, { ...db.get(`usuarios/${RIDER}`), profileImageUrl: "https://evil.test/x.png", amigos: ["a", "b"] });
  db.put(`usuarios_public/${RIDER}`, { ...db.get(`usuarios_public/${RIDER}`), amigos: ["a", "b"] });
  const r = await call(me, { method: "POST", token: riderTok });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const pub = db.get(`usuarios_public/${RIDER}`);
  assert.equal(pub.profileImageUrl, null);
  assert.equal(pub.amigos, undefined);
  assert.equal(pub.username, "rita");
});

test("export: everything about me, but at most once every 10 minutes", async () => {
  const exp = require("./export.js");
  db.put(`usuarios/${RIDER}/rides/r1`, { pointsEarned: 10 });
  const first = await call(exp, { token: riderTok });
  assert.equal(first.status, 200);
  assert.equal(first.body.rides.length, 1);
  assert.equal(first.body.profile.pushToken, undefined);
  assert.equal((await call(exp, { token: riderTok })).status, 429);
});

test("validate: a partner confirms a code of its store once, and it's audited", async () => {
  const validate = require("./validate.js");
  const pTok = db.signIn("partner1");
  db.put("usuarios/partner1", { role: "partner", storeId: "coldest" });
  db.put(`usuarios/${RIDER}/codigos_canjeados/c1`, { code: "ECO7K2Q9", rewardId: "coldest", store: "Coldest", status: "active" });
  db.put(`usuarios/${RIDER}/codigos_canjeados/c2`, { code: "OTHER123", rewardId: "ciclofix", store: "CicloFix", status: "active" });
  assert.equal((await call(validate, { method: "POST", token: pTok, body: { code: "other123" } })).status, 403); // another store's code
  const ok = await call(validate, { method: "POST", token: pTok, body: { code: "eco7k2q9", confirm: true } });
  assert.deepEqual(ok.body, { code: "ECO7K2Q9", store: "Coldest", status: "used" });
  assert.equal((await call(validate, { method: "POST", token: pTok, body: { code: "ECO7K2Q9", confirm: true } })).status, 409);
  const [log] = logs();
  assert.equal(log.action, "code.validate");
  assert.equal(log.adminUid, "partner1");
  assert.equal((await call(validate, { method: "POST", token: riderTok, body: { code: "ECO7K2Q9" } })).status, 403);
});

test("points: one writer (applyPoints); league moves only with rides", async () => {
  // No handler writes balances or league fields itself (spine AD-9).
  const fs = await import("node:fs");
  const writers = fs
    .readdirSync(new URL(".", import.meta.url))
    .filter((f) => f.endsWith(".js") && f !== "_lib.js")
    .filter((f) => /puntosAcumulados\s*:|\.puntosAcumulados\s*=[^=]|weekPoints\s*:/.test(fs.readFileSync(new URL(f, import.meta.url), "utf8")));
  assert.deepEqual(writers, []);

  const { weekKey } = require("./_lib.js");
  const week = weekKey(db.now);
  db.put(`usuarios_public/${RIDER}`, { ...db.get(`usuarios_public/${RIDER}`), weekKey: week, weekPoints: 40 });
  const ride = bikeRide("ride-league1", db.now - 3600_000, 2);
  await call(rides, { method: "POST", token: riderTok, body: ride });
  assert.equal(db.get(`usuarios_public/${RIDER}`).weekPoints, 40 + 15);
  verifiedRides(3);
  await call(redeem, { method: "POST", token: riderTok, body: { rewardId: "coldest" } });
  assert.equal(db.get(`usuarios_public/${RIDER}`).weekPoints, 55); // redeeming doesn't lower the league
  assert.equal(db.get(`usuarios_public/${RIDER}`).puntosAcumulados, 500 + 15 - 400);
  const del = await call(rides, { method: "DELETE", token: riderTok, body: { id: "ride-league1" } });
  assert.equal(del.body.pointsRemoved, 15);
  assert.equal(db.get(`usuarios_public/${RIDER}`).weekPoints, 40);
  assert.equal(db.get(`usuarios/${RIDER}`).puntosAcumulados, 100);
});
