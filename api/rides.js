// POST /api/rides — sync a finished ride and award its points (server-side).
// Idempotent: re-sending the same ride id never awards points twice.
const { admin, httpError, requireUser, body, handler, validateRide, MAX_RIDES_PER_DAY } = require("./_lib");

module.exports = handler(["POST"], async (req) => {
  const user = await requireUser(req);
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
