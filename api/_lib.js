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

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

async function requireUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw httpError(401, "Falta el token de autenticación.");
  try {
    return await admin().auth().verifyIdToken(token);
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
    res.setHeader("Access-Control-Allow-Origin", "*");
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
      if (status === 500) console.error(e);
      res.status(status).json({ error: status === 500 && !e.status ? "Error interno del servidor." : e.message });
    }
  };
}

// ─── Ride scoring (pure, see api/_lib.test.mjs) ─────────────────────────────
// Same formula as src/utils/gamification.ts pointsForRide(), but computed
// here from validated numbers so a client can't send its own points.
const POINTS_PER_KM = 10;
const POINTS_PER_COMPLETED_RIDE = 20;
const MIN_DISTANCE_M = 200;
const MAX_DISTANCE_M = 200_000;
const MAX_AVG_KMH = 45; // faster than this is a car, not a bike
const MAX_RIDES_PER_DAY = 20;
// ponytail: plausibility checks on the summary only; the GPS polyline stays on
// the device for privacy. Upgrade path: upload the polyline and re-measure it
// server-side if cheating shows up in practice.

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
  if (distanceMeters < 0 || distanceMeters > MAX_DISTANCE_M) return { error: "Distancia fuera de rango." };
  const avgKmh = distanceMeters / 1000 / (durationSeconds / 3600);
  if (avgKmh > MAX_AVG_KMH) return { error: "Velocidad media no plausible para bicicleta." };
  const points = distanceMeters < MIN_DISTANCE_M ? 0 : Math.round((distanceMeters / 1000) * POINTS_PER_KM + POINTS_PER_COMPLETED_RIDE);
  return { points, startedAt, endedAt, distanceMeters, durationSeconds };
}

function redemptionCode() {
  return require("crypto").randomBytes(6).toString("hex").toUpperCase();
}

module.exports = { admin, httpError, requireUser, isAdminUser, body, handler, validateRide, redemptionCode, MAX_RIDES_PER_DAY };
