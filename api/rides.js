// POST   /api/rides       — sync a finished ride and award its points (server-side).
//                           Idempotent: re-sending the same ride id never awards twice.
// DELETE /api/rides {id}  — delete one of my rides and take back its points
//                           (never below 0), so deleting can't be used to farm.
const { admin, httpError, requireUser, body, handler, validateRide, weekKey, isDocId, clampNum, MAX_RIDES_PER_DAY, MAX_RIDE_DURATION_S } = require("./_lib");

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

  const { Timestamp } = require("firebase-admin/firestore");
  const rides = userRef.collection("rides");
  // Daily cap counts by SERVER time (createdAt). Counting by the client's
  // startedAt let a backdated ride skip the cap entirely.
  const recentQ = rides.where("createdAt", ">=", Timestamp.fromMillis(Date.now() - 24 * 3600_000)).select().limit(MAX_RIDES_PER_DAY);
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
      return { pointsEarned: existing.data().pointsEarned ?? 0, balance: userSnap.data().puntosAcumulados ?? 0, duplicate: true };
    }
    if (around.docs.some((d) => (d.data().endedAt ?? 0) > v.startedAt)) {
      throw httpError(409, "Este recorrido se superpone con otro ya registrado.");
    }
    const points = recent.size >= MAX_RIDES_PER_DAY ? 0 : v.points;
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
  if (!isDocId(id)) throw httpError(400, "id de recorrido inválido.");
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
