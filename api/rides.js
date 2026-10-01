// POST   /api/rides       — sync a finished ride and award its points (server-side).
//                           Idempotent: re-sending the same ride id never awards twice.
// DELETE /api/rides {id}  — delete one of my rides and take back its points
//                           (never below 0), so deleting can't be used to farm.
const { admin, httpError, requireUser, body, handler, validateRide, MAX_RIDES_PER_DAY } = require("./_lib");

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

  return db.runTransaction(async (tx) => {
    const [existing, userSnap] = await Promise.all([tx.get(rideRef), tx.get(userRef)]);
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
    tx.set(db.collection("usuarios_public").doc(user.uid), { puntosAcumulados: balance }, { merge: true });
    return { pointsEarned: points, balance, duplicate: false };
  });
});

async function deleteRide(uid, id) {
  if (typeof id !== "string" || !/^[\w-]{6,80}$/.test(id)) throw httpError(400, "id de recorrido inválido.");
  const db = admin().firestore();
  const { FieldValue } = require("firebase-admin/firestore");
  const userRef = db.collection("usuarios").doc(uid);
  const rideRef = userRef.collection("rides").doc(id);
  return db.runTransaction(async (tx) => {
    const [rideSnap, userSnap] = await Promise.all([tx.get(rideRef), tx.get(userRef)]);
    if (!rideSnap.exists) return { deleted: false };
    const pts = rideSnap.data().pointsEarned ?? 0;
    const balance = Math.max(0, (userSnap.data()?.puntosAcumulados ?? 0) - pts);
    tx.delete(rideRef);
    tx.update(userRef, { puntosAcumulados: balance, updatedAt: FieldValue.serverTimestamp() });
    tx.set(db.collection("usuarios_public").doc(uid), { puntosAcumulados: balance }, { merge: true });
    return { deleted: true, pointsRemoved: pts, balance };
  });
}
