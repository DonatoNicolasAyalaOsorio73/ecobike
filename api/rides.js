// POST   /api/rides       — sync a finished ride and award its points (server-side).
//                           Idempotent: re-sending the same ride id never awards twice.
// DELETE /api/rides {id}  — delete one of my rides and take back its points
//                           (never below 0), so deleting can't be used to farm.
const { admin, httpError, requireUser, body, handler, validateRide, weekKey, MAX_RIDES_PER_DAY } = require("./_lib");

/** Weekly league points after adding `delta` for a ride in `rideWeek` (resets when the week changes). */
function nextWeekly(pub, rideWeek, delta) {
  const current = weekKey(Date.now());
  if (rideWeek !== current) return null; // rides from past weeks don't count for this week's league
  const base = pub?.weekKey === current ? pub.weekPoints ?? 0 : 0;
  return { weekKey: current, weekPoints: Math.max(0, base + delta) };
}

module.exports = handler(["POST", "DELETE"], async (req) => {
  const user = await requireUser(req);
  if (req.method === "DELETE") return deleteRide(user.uid, body(req).id);
  const ride = body(req);
  const v = validateRide(ride);
  if (v.error) throw httpError(400, v.error);

  const db = admin().firestore();
  const { FieldValue } = require("firebase-admin/firestore");
  const userRef = db.collection("usuarios").doc(user.uid);
  const rideRef = userRef.collection("rides").doc(ride.id);

  const dayAgo = Date.now() - 24 * 3600_000;
  const recent = await userRef.collection("rides").where("startedAt", ">=", dayAgo).count().get();
  const points = recent.data().count >= MAX_RIDES_PER_DAY ? 0 : v.points;

  const pubRef = db.collection("usuarios_public").doc(user.uid);
  return db.runTransaction(async (tx) => {
    const [existing, userSnap, pubSnap] = await Promise.all([tx.get(rideRef), tx.get(userRef), tx.get(pubRef)]);
    if (!userSnap.exists) throw httpError(404, "Perfil de usuario no encontrado.");
    if (existing.exists) {
      return { pointsEarned: existing.data().pointsEarned ?? 0, balance: userSnap.data().puntosAcumulados ?? 0, duplicate: true };
    }
    const num = (x) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
    tx.set(rideRef, {
      userId: user.uid,
      startedAt: v.startedAt,
      endedAt: v.endedAt,
      distanceMeters: v.distanceMeters,
      durationSeconds: v.durationSeconds,
      avgSpeedKmh: num(ride.avgSpeedKmh),
      maxSpeedKmh: num(ride.maxSpeedKmh),
      elevationGainMeters: num(ride.elevationGainMeters),
      caloriesKcal: num(ride.caloriesKcal),
      pointsEarned: points,
      createdAt: FieldValue.serverTimestamp(),
    });
    const balance = (userSnap.data().puntosAcumulados ?? 0) + points;
    tx.update(userRef, { puntosAcumulados: FieldValue.increment(points), updatedAt: FieldValue.serverTimestamp() });
    const weekly = nextWeekly(pubSnap.data(), weekKey(v.startedAt), points);
    tx.set(pubRef, { puntosAcumulados: balance, ...(weekly ?? {}) }, { merge: true });
    return { pointsEarned: points, balance, duplicate: false };
  });
});

async function deleteRide(uid, id) {
  if (typeof id !== "string" || !/^[\w-]{6,80}$/.test(id)) throw httpError(400, "id de recorrido inválido.");
  const db = admin().firestore();
  const { FieldValue } = require("firebase-admin/firestore");
  const userRef = db.collection("usuarios").doc(uid);
  const rideRef = userRef.collection("rides").doc(id);
  const pubRef = db.collection("usuarios_public").doc(uid);
  return db.runTransaction(async (tx) => {
    const [rideSnap, userSnap, pubSnap] = await Promise.all([tx.get(rideRef), tx.get(userRef), tx.get(pubRef)]);
    if (!rideSnap.exists) return { deleted: false };
    const pts = rideSnap.data().pointsEarned ?? 0;
    const balance = Math.max(0, (userSnap.data()?.puntosAcumulados ?? 0) - pts);
    tx.delete(rideRef);
    tx.update(userRef, { puntosAcumulados: balance, updatedAt: FieldValue.serverTimestamp() });
    const weekly = nextWeekly(pubSnap.data(), weekKey(rideSnap.data().startedAt ?? 0), -pts);
    tx.set(pubRef, { puntosAcumulados: balance, ...(weekly ?? {}) }, { merge: true });
    return { deleted: true, pointsRemoved: pts, balance };
  });
}

module.exports.nextWeekly = nextWeekly;
