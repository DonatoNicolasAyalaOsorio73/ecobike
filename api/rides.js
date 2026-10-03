// POST   /api/rides       — sync a finished ride and award its points (server-side).
//                           The body carries a downsampled GPS track that is
//                           verified (bike speeds, no GPS jumps) and discarded.
//                           Idempotent: re-sending the same ride id never awards twice.
// DELETE /api/rides {id}  — delete one of my rides and take back its points
//                           (never below 0), so deleting can't be used to farm.
const { admin, httpError, requireUser, body, handler, validateRide, weekKey, isDocId, clampNum, MAX_RIDE_DURATION_S, MAX_RIDES_PER_DAY, capRidePoints, applyPoints } = require("./_lib");

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

  const { Timestamp } = require("firebase-admin/firestore");
  const rides = userRef.collection("rides");
  // Daily caps count by SERVER time (createdAt). Counting by the client's
  // startedAt let a backdated ride skip the cap entirely.
  const recentQ = rides.where("createdAt", ">=", Timestamp.fromMillis(Date.now() - 24 * 3600_000)).select("pointsEarned").limit(MAX_RIDES_PER_DAY);
  // A rider can't be on two rides at once: any stored ride whose time range
  // intersects this one means a duplicate or a fabricated ride.
  const overlapQ = rides
    .where("startedAt", ">=", v.startedAt - MAX_RIDE_DURATION_S * 1000)
    .where("startedAt", "<", v.endedAt)
    .select("endedAt");

  const pubRef = db.collection("usuarios_public").doc(user.uid);
  // Queries run inside the transaction so two concurrent requests can't both pass the checks.
  return db.runTransaction(async (tx) => {
    const [existing, userSnap, pubSnap, recent, around] = await Promise.all([tx.get(rideRef), tx.get(userRef), tx.get(pubRef), tx.get(recentQ), tx.get(overlapQ)]);
    if (!userSnap.exists) throw httpError(404, "Perfil de usuario no encontrado.");
    if (existing.exists) {
      const e = existing.data();
      return { pointsEarned: e.pointsEarned ?? 0, verified: e.verified === true, reason: e.pointsReason ?? null, balance: userSnap.data().puntosAcumulados ?? 0, duplicate: true };
    }
    if (around.docs.some((d) => (d.data().endedAt ?? 0) > v.startedAt)) {
      throw httpError(409, "Este recorrido se superpone con otro ya registrado.");
    }
    // Caps: rides per day and points per day (earning stays slow on purpose,
    // so rewards take real riding and can't be emptied in one burst).
    const earnedToday = recent.docs.reduce((s, d) => s + (d.data().pointsEarned ?? 0), 0);
    const { points, reason } = capRidePoints(v.points, v.reason, earnedToday, recent.size);
    // "verified" = it passed bike detection, even if a cap left it at 0 points:
    // it still counts as a real ride (streaks, missions, the 3-ride redemption gate).
    const verified = v.points > 0;
    tx.set(rideRef, {
      userId: user.uid,
      startedAt: v.startedAt,
      endedAt: v.endedAt,
      distanceMeters: v.distanceMeters,
      durationSeconds: v.durationSeconds,
      avgSpeedKmh: clampNum(ride.avgSpeedKmh, 60),
      maxSpeedKmh: clampNum(ride.maxSpeedKmh, 120),
      elevationGainMeters: clampNum(ride.elevationGainMeters, 10_000),
      caloriesKcal: clampNum(ride.caloriesKcal, 20_000),
      pointsEarned: points,
      verified,
      pointsReason: reason,
      createdAt: FieldValue.serverTimestamp(),
    });
    const balance = applyPoints(tx, user.uid, { user: userSnap.data(), pub: pubSnap.data() }, { delta: points, leagueWeek: weekKey(v.startedAt) });
    return { pointsEarned: points, verified, reason, balance, duplicate: false };
  });
});

async function deleteRide(uid, id) {
  if (!isDocId(id)) throw httpError(400, "id de recorrido inválido.");
  const db = admin().firestore();
  const userRef = db.collection("usuarios").doc(uid);
  const rideRef = userRef.collection("rides").doc(id);
  const pubRef = db.collection("usuarios_public").doc(uid);
  return db.runTransaction(async (tx) => {
    const [rideSnap, userSnap, pubSnap] = await Promise.all([tx.get(rideRef), tx.get(userRef), tx.get(pubRef)]);
    if (!rideSnap.exists) return { deleted: false };
    const pts = rideSnap.data().pointsEarned ?? 0;
    tx.delete(rideRef);
    // Deleting can't farm points: what the ride earned is taken back (never below 0).
    const balance = applyPoints(tx, uid, { user: userSnap.data(), pub: pubSnap.data() }, { delta: -pts, leagueWeek: weekKey(rideSnap.data().startedAt ?? 0) });
    return { deleted: true, pointsRemoved: pts, balance };
  });
}

