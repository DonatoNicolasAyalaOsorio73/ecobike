// Shared helpers for the Vercel serverless functions in /api.
// Files starting with "_" are not exposed as routes by Vercel.
//
// These functions are the ONLY writers of anything that has value
// (points, redemption codes, friendships, roles): firestore.rules blocks
// clients from touching those fields, and the Admin SDK used here bypasses
// the rules. The service account comes from FIREBASE_SERVICE_ACCOUNT_KEY
// (Vercel env var, never in the app bundle).

let adminMod = null;

function admin() {
  if (!adminMod) adminMod = require("firebase-admin");
  if (!adminMod.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) throw httpError(500, "FIREBASE_SERVICE_ACCOUNT_KEY no está configurada en el servidor.");
    let sa;
    try {
      sa = JSON.parse(raw);
    } catch {
      throw httpError(500, "FIREBASE_SERVICE_ACCOUNT_KEY no es un JSON válido.");
    }
    adminMod.initializeApp({
      credential: adminMod.credential.cert(sa),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${sa.project_id}.appspot.com`,
    });
  }
  return adminMod;
}

// Server error reporting, only when SENTRY_DSN is set on Vercel.
let sentry = null;
async function reportError(e, req) {
  if (!process.env.SENTRY_DSN) return;
  try {
    if (!sentry) {
      sentry = require("@sentry/node");
      sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.VERCEL_ENV || "production", sendDefaultPii: false });
    }
    sentry.captureException(e, { tags: { route: req.url, method: req.method } });
    await sentry.flush(2000); // serverless: flush before the function freezes
  } catch {
    // never let reporting break the response
  }
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

async function requireUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw httpError(401, "Falta el token de autenticación.");
  const auth = admin().auth(); // config errors must surface as 500, not 401
  try {
    // checkRevoked: "cerrar sesión en todos los dispositivos" takes effect immediately.
    return await auth.verifyIdToken(token, true);
  } catch {
    throw httpError(401, "Token inválido o expirado. Vuelve a iniciar sesión.");
  }
}

async function isAdminUser(decoded) {
  if (decoded.admin === true) return true;
  const snap = await admin().firestore().collection("usuarios").doc(decoded.uid).get();
  const d = snap.data() || {};
  return d.role === "admin" || d.isAdmin === true;
}

/** Throws 403 unless the caller is an admin; returns the decoded token. */
async function requireAdmin(req) {
  const user = await requireUser(req);
  if (!(await isAdminUser(user))) throw httpError(403, "No tienes permisos de administrador.");
  return user;
}

/**
 * Per-user rate limit (spine AD-13): at most one `action` every `everyMs`.
 * State lives in rate_limits/{uid}, which clients can't read or write
 * (firestore.rules default deny), so it can't be reset from the app.
 */
async function rateLimit(uid, action, everyMs, message = "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.") {
  const db = admin().firestore();
  const ref = db.collection("rate_limits").doc(uid);
  await db.runTransaction(async (tx) => {
    const last = (await tx.get(ref)).data()?.[action] ?? 0;
    const now = Date.now();
    if (now - last < everyMs) throw httpError(429, message);
    tx.set(ref, { [action]: now }, { merge: true });
  });
}

/**
 * The public profile (usuarios_public) built from the private doc, with the
 * same validation as firestore.rules (spine AD-10): anything a client wrote
 * to its own private doc reaches the public mirror only if it would have
 * passed the public rules. Friend lists are never public.
 */
const PUBLIC_PHOTO_RE = /^https:\/\/(firebasestorage\.googleapis\.com|lh[0-9]\.googleusercontent\.com)\//;
function projectPublic(d) {
  const name = (v) => (typeof v === "string" ? v.trim().slice(0, 60) : "");
  const photo = typeof d.profileImageUrl === "string" && d.profileImageUrl.length <= 2000 && PUBLIC_PHOTO_RE.test(d.profileImageUrl) ? d.profileImageUrl : null;
  return { nombre: name(d.nombre ?? d.nombres), apellido: name(d.apellido), profileImageUrl: photo, puntosAcumulados: Number.isFinite(d.puntosAcumulados) ? d.puntosAcumulados : 0 };
}

/**
 * Audit trail for every admin change (who, what, on whom, before/after,
 * why). Server-only collection: firestore.rules deny all client access.
 */
async function logAdmin(adminUid, action, targetType, targetId, details = {}) {
  const { FieldValue } = require("firebase-admin/firestore");
  await admin().firestore().collection("admin_logs").add({ adminUid, action, targetType, targetId, details, at: FieldValue.serverTimestamp() });
}

/**
 * Permanently erase a user and everything tied to them (right to erasure;
 * used by the user themself in api/account.js and by admins in api/users.js):
 * friend links, username reservation, chats, private + public profile with
 * subcollections, avatar files and the Firebase Auth user.
 */
async function deleteUserData(uid) {
  const a = admin();
  const db = a.firestore();
  const { FieldValue } = require("firebase-admin/firestore");
  const friends = (await db.collection("usuarios").doc(uid).get()).data()?.amigos ?? [];
  await Promise.all(
    friends.map(async (f) => {
      await db.collection("usuarios").doc(f).update({ amigos: FieldValue.arrayRemove(uid) }).catch(() => {});
      await db.collection("usuarios_public").doc(f).set({ amigos: FieldValue.arrayRemove(uid) }, { merge: true }).catch(() => {});
    })
  );
  const claims = await db.collection("usernames").where("uid", "==", uid).get();
  await Promise.all(claims.docs.map((c) => c.ref.delete()));
  const chats = await db.collection("chats").where("participants", "array-contains", uid).get();
  await Promise.all(chats.docs.map((c) => db.recursiveDelete(c.ref)));
  await db.recursiveDelete(db.collection("usuarios").doc(uid));
  await db.collection("usuarios_public").doc(uid).delete(); // deleting a missing doc is a no-op; real errors must surface
  await a.storage().bucket().deleteFiles({ prefix: `avatars/${uid}/` }).catch(() => {});
  await a.auth().deleteUser(uid).catch((e) => {
    if (e?.code !== "auth/user-not-found") throw e;
  });
}

function body(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      throw httpError(400, "JSON inválido.");
    }
  }
  return req.body || {};
}

// Wraps a handler with CORS, method check and uniform JSON errors.
function handler(methods, fn) {
  return async (req, res) => {
    // Correlation id: returned to the client and logged with errors so a
    // user-reported problem can be found in Vercel logs / Sentry.
    const requestId = req.headers["x-vercel-id"] || require("crypto").randomUUID();
    res.setHeader("X-Request-Id", requestId);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "X-Request-Id");
    res.setHeader("Access-Control-Allow-Methods", [...methods, "OPTIONS"].join(","));
    res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
    if (req.method === "OPTIONS") return res.status(204).end();
    if (!methods.includes(req.method)) {
      res.setHeader("Allow", methods.join(","));
      return res.status(405).json({ error: "Método no permitido." });
    }
    try {
      const out = await fn(req, res);
      if (!res.headersSent) res.status(200).json(out ?? { ok: true });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) {
        console.error(JSON.stringify({ level: "error", requestId, method: req.method, url: req.url, message: e.message, stack: e.stack }));
        await reportError(e, req);
      }
      res.status(status).json({
        error: status === 500 && !e.status ? "Error interno del servidor." : e.message,
        ...(status >= 500 ? { requestId } : {}),
      });
    }
  };
}

// ─── Ride scoring + bicycle detection (pure, see api/_lib.test.mjs) ─────────
// KEEP IDENTICAL to src/utils/rideScore.ts (same rules, same test cases).
// The client uploads a downsampled track ONLY for this check; it is analysed
// here and never stored (privacy: the polyline still lives only on-device).
const POINTS_PER_KM = 5;
const RIDE_BONUS = 5; // only for a real ride: >= BONUS_MIN_M and >= BONUS_MIN_S
const BONUS_MIN_M = 1000;
const BONUS_MIN_S = 300;
const MIN_DISTANCE_M = 500;
const DAILY_POINTS_CAP = 150; // rolling 24 h by server time, see api/rides.js
const MOVING_KMH = 3;
const BIKE_MIN_KMH = 7; // walking is ~4-6 km/h
const BIKE_MAX_KMH = 50; // sustained faster than this is a vehicle
const TELEPORT_KMH = 80; // a jump this fast between two fixes is fake/broken GPS
const MIN_BIKE_SHARE = 0.6;
const MAX_TELEPORT_M = 200;
const MAX_TRACK_POINTS = 800;
const MAX_DISTANCE_M = 200_000;
const MAX_AVG_KMH = 45; // faster than this on average is a car, not a bike
const MAX_RIDES_PER_DAY = 20;
const MAX_RIDE_DURATION_S = 12 * 3600; // also bounds the overlap-check window in api/rides.js

function haversine(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Re-measures a [lat, lng, tMs][] track and classifies how it was travelled; null if unusable. */
function analyzeTrack(track) {
  if (!Array.isArray(track) || track.length < 2) return null;
  let distanceMeters = 0;
  let movingSeconds = 0;
  let bikeSeconds = 0;
  let teleportMeters = 0;
  // Duplicate or out-of-order fixes (batched background delivery) are skipped
  // against the last good fix instead of voiding the whole ride.
  let a = track[0];
  for (let i = 1; i < track.length; i++) {
    const b = track[i];
    const dt = (b[2] - a[2]) / 1000;
    if (!(dt > 0)) continue;
    const d = haversine(a, b);
    const kmh = (d / dt) * 3.6;
    a = b;
    if (kmh > TELEPORT_KMH) {
      teleportMeters += d;
      continue;
    }
    distanceMeters += d;
    if (kmh >= MOVING_KMH) {
      movingSeconds += dt;
      if (kmh >= BIKE_MIN_KMH && kmh <= BIKE_MAX_KMH) bikeSeconds += dt;
    }
  }
  return { distanceMeters, movingSeconds, bikeShare: movingSeconds > 0 ? bikeSeconds / movingSeconds : 0, teleportMeters };
}

function scoreRide(claimedMeters, durationSeconds, analysis) {
  if (!analysis) return { points: 0, reason: "Sin ruta GPS verificable." };
  if (analysis.teleportMeters > MAX_TELEPORT_M) return { points: 0, reason: "Detectamos saltos de GPS imposibles en bicicleta." };
  const credited = Math.min(claimedMeters, analysis.distanceMeters * 1.1);
  if (credited < MIN_DISTANCE_M) return { points: 0, reason: "Recorrido muy corto (mínimo 500 m)." };
  if (analysis.bikeShare < MIN_BIKE_SHARE) return { points: 0, reason: "No parece un recorrido en bicicleta (velocidad de caminata o de vehículo)." };
  const bonus = credited >= BONUS_MIN_M && durationSeconds >= BONUS_MIN_S ? RIDE_BONUS : 0;
  return { points: Math.round((credited / 1000) * POINTS_PER_KM) + bonus, reason: null };
}

/**
 * Shape-checks an uploaded track: finite in-range coordinates, timestamps
 * inside the ride window (±2 min). Anything else counts as "no track".
 */
function sanitizeTrack(track, startedAt, endedAt) {
  if (!Array.isArray(track) || track.length < 2 || track.length > MAX_TRACK_POINTS) return null;
  for (const p of track) {
    if (!Array.isArray(p) || p.length !== 3 || !p.every((x) => typeof x === "number" && Number.isFinite(x))) return null;
    if (Math.abs(p[0]) > 90 || Math.abs(p[1]) > 180) return null;
  }
  // Fixes outside the ride window (a stale cached first fix) are dropped, not
  // fatal: they can't add distance, and rejecting the whole track for one of
  // them zeroed legitimate rides. Same rule in src/utils/rideScore.ts.
  const inWindow = track.filter((p) => p[2] >= startedAt - 120_000 && p[2] <= endedAt + 120_000);
  return inWindow.length >= 2 ? inWindow : null;
}

/**
 * Daily economy caps applied to a verified ride's points (pure, tested):
 * at most MAX_RIDES_PER_DAY rides and DAILY_POINTS_CAP points per rolling 24 h.
 * The validator's own reason (not a bike ride, too short...) wins over cap reasons.
 */
function capRidePoints(ridePoints, rideReason, earnedToday, ridesToday) {
  const rideCapHit = ridesToday >= MAX_RIDES_PER_DAY;
  const points = rideCapHit ? 0 : Math.max(0, Math.min(ridePoints, DAILY_POINTS_CAP - earnedToday));
  const reason = rideReason ?? (rideCapHit ? "Límite diario de recorridos alcanzado." : points < ridePoints ? `Límite diario de ${DAILY_POINTS_CAP} puntos alcanzado.` : null);
  return { points, reason };
}

/**
 * Redemption limits (pure, tested): MIN_VERIFIED_RIDES real rides before the
 * first redemption, one redemption per rolling 24 h, and the same reward at
 * most once every SAME_STORE_COOLDOWN_DAYS. Returns an error to throw, or null.
 */
const MIN_VERIFIED_RIDES = 3;
const MAX_REDEMPTIONS_PER_DAY = 1;
const SAME_STORE_COOLDOWN_DAYS = 7;
function redeemLimitError(verifiedRides, recentCodes, rewardId, now = Date.now()) {
  if (verifiedRides < MIN_VERIFIED_RIDES) {
    return httpError(403, `Completa ${MIN_VERIFIED_RIDES} recorridos en bicicleta verificados antes de tu primer canje (llevas ${verifiedRides}).`);
  }
  const lastDay = recentCodes.filter((c) => (c.createdAt?.toMillis?.() ?? c.createdAt ?? 0) >= now - 86400_000).length;
  if (lastDay >= MAX_REDEMPTIONS_PER_DAY) return httpError(429, "Ya hiciste un canje hoy. Podrás canjear de nuevo en 24 horas.");
  const cutoff = now - SAME_STORE_COOLDOWN_DAYS * 86400_000;
  if (recentCodes.some((c) => c.rewardId === rewardId && (c.createdAt?.toMillis?.() ?? c.createdAt ?? 0) >= cutoff)) {
    return httpError(429, `Ya canjeaste esta recompensa esta semana. Puedes repetirla cada ${SAME_STORE_COOLDOWN_DAYS} días.`);
  }
  return null;
}

function validateRide(r, now = Date.now()) {
  const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
  const startedAt = n(r.startedAt);
  const endedAt = n(r.endedAt);
  const distanceMeters = n(r.distanceMeters);
  const durationSeconds = n(r.durationSeconds);
  if (typeof r.id !== "string" || !/^[\w-]{6,80}$/.test(r.id)) return { error: "id de recorrido inválido." };
  if ([startedAt, endedAt, distanceMeters, durationSeconds].some(Number.isNaN)) return { error: "Datos del recorrido incompletos." };
  if (endedAt <= startedAt || endedAt > now + 5 * 60_000) return { error: "Fechas del recorrido inválidas." };
  if (startedAt < now - 30 * 24 * 3600_000) return { error: "El recorrido es demasiado antiguo para sincronizar." };
  if (durationSeconds <= 0 || durationSeconds > (endedAt - startedAt) / 1000 + 60) return { error: "Duración inválida." };
  if (endedAt - startedAt > MAX_RIDE_DURATION_S * 1000) return { error: "El recorrido es demasiado largo." };
  if (distanceMeters < 0 || distanceMeters > MAX_DISTANCE_M) return { error: "Distancia fuera de rango." };
  const avgKmh = distanceMeters / 1000 / (durationSeconds / 3600);
  if (avgKmh > MAX_AVG_KMH) return { error: "Velocidad media no plausible para bicicleta." };
  const { points, reason } = scoreRide(distanceMeters, durationSeconds, analyzeTrack(sanitizeTrack(r.track, startedAt, endedAt)));
  return { points, reason, startedAt, endedAt, distanceMeters, durationSeconds };
}

// Best-effort Expo push to users who registered a token (src/services/push.ts).
// ponytail: one token per user (last device wins); store a token list if
// people commonly use several phones.
// `type` maps to usuarios/{uid}.notifPrefs[type] (Ajustes > Notificaciones);
// a user who turned that type off gets nothing. `data` deep-links the tap.
async function sendPush(uids, title, message, type = "friends", data = undefined) {
  try {
    const db = admin().firestore();
    const snaps = await Promise.all(uids.map((u) => db.collection("usuarios").doc(u).get()));
    const messages = snaps
      .map((s) => s.data() || {})
      .filter((d) => d.notifPrefs?.[type] !== false)
      .map((d) => d.pushToken)
      .filter((t) => typeof t === "string" && t.startsWith("ExponentPushToken"))
      .map((to) => ({ to, title, body: message, sound: "default", ...(data ? { data } : {}) }));
    if (!messages.length) return;
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.error("push failed", e);
  }
}

// ─── Weekly league ─────────────────────────────────────────────────────────
// ISO week ("2026-W40") of a timestamp in Colombia time (UTC-5, no DST).
// Keep identical to src/utils/week.ts (both are tested with the same cases).
// ponytail: single fixed timezone; per-user timezone if the app expands abroad.
function weekKey(ms, tzOffsetHours = -5) {
  const d = new Date(ms + tzOffsetHours * 3_600_000);
  // ISO-8601: the week belongs to the year of its Thursday.
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  thursday.setUTCDate(thursday.getUTCDate() - ((thursday.getUTCDay() + 6) % 7) + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  firstThursday.setUTCDate(1 + ((4 - firstThursday.getUTCDay() + 7) % 7));
  const week = 1 + Math.round((thursday - firstThursday) / 604_800_000);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ─── Chat ────────────────────────────────────────────────────────────────────
/** Deterministic id for the 1:1 chat between two users (order-independent). */
function chatIdFor(a, b) {
  return [a, b].sort().join("__");
}

const MAX_MESSAGE_LENGTH = 1000;
function cleanMessage(text) {
  if (typeof text !== "string") return { error: "Mensaje inválido." };
  const t = text.trim();
  if (!t) return { error: "El mensaje está vacío." };
  if (t.length > MAX_MESSAGE_LENGTH) return { error: `Máximo ${MAX_MESSAGE_LENGTH} caracteres.` };
  return { text: t };
}

// Firestore document ids from clients: a "/" would address a different path
// (or throw a 500), so every id taken from a request body goes through this.
function isDocId(v) {
  return typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
}

/** Display-only numbers from the client, clamped so a bogus value cannot skew stats. */
function clampNum(v, max) {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(v, 0), max) : 0;
}

function redemptionCode() {
  return require("crypto").randomBytes(6).toString("hex").toUpperCase();
}

module.exports = { rateLimit, projectPublic, sanitizeTrack, capRidePoints, redeemLimitError, MIN_VERIFIED_RIDES, SAME_STORE_COOLDOWN_DAYS, requireAdmin, logAdmin, deleteUserData, analyzeTrack, scoreRide, DAILY_POINTS_CAP, isDocId, clampNum, MAX_RIDE_DURATION_S, weekKey, chatIdFor, cleanMessage, MAX_MESSAGE_LENGTH, sendPush, admin, httpError, requireUser, isAdminUser, body, handler, validateRide, redemptionCode, MAX_RIDES_PER_DAY };
