// POST /api/redeem { rewardId } — spend points on a store reward.
// The price is read from tiendas/{rewardId} on the server, never from the client.
// Anti-abuse limits (redeemLimitError in _lib.js): rewards have to be earned
// by riding and can't be emptied in one burst or farmed from fresh accounts.
const { admin, httpError, requireUser, body, handler, redemptionCode, isDocId, redeemLimitError, MIN_VERIFIED_RIDES, SAME_STORE_COOLDOWN_DAYS, applyPoints } = require("./_lib");

module.exports = handler(["POST"], async (req) => {
  const user = await requireUser(req);
  // Anti-farming: password accounts must verify their email before spending
  // points (Google/Apple sign-ins are already verified).
  if (user.firebase?.sign_in_provider === "password" && user.email_verified !== true) {
    throw httpError(403, "Verifica tu correo para canjear recompensas.");
  }
  const { rewardId } = body(req);
  if (!isDocId(rewardId)) throw httpError(400, "Recompensa inválida.");

  const db = admin().firestore();
  const { FieldValue } = require("firebase-admin/firestore");
  const userRef = db.collection("usuarios").doc(user.uid);
  const storeRef = db.collection("tiendas").doc(rewardId);
  const code = redemptionCode();
  const { Timestamp } = require("firebase-admin/firestore");
  const now = Date.now();
  // Single-field queries only (no composite index needed); filtered in memory.
  const recentCodesQ = userRef.collection("codigos_canjeados").where("createdAt", ">=", Timestamp.fromMillis(now - SAME_STORE_COOLDOWN_DAYS * 86400_000)).select("rewardId", "createdAt");
  const verifiedRidesQ = userRef.collection("rides").where("verified", "==", true).select().limit(MIN_VERIFIED_RIDES);

  return db.runTransaction(async (tx) => {
    const [store, userSnap, recentCodes, verifiedRides] = await Promise.all([tx.get(storeRef), tx.get(userRef), tx.get(recentCodesQ), tx.get(verifiedRidesQ)]);
    if (!store.exists || store.data().isActive === false) throw httpError(404, "La recompensa no existe.");
    if (!userSnap.exists) throw httpError(404, "Perfil de usuario no encontrado.");
    const limit = redeemLimitError(verifiedRides.size, recentCodes.docs.map((d) => d.data()), rewardId, now);
    if (limit) throw limit;
    const cost = Number(store.data().pointsRequired ?? 0) || 0;
    if (cost <= 0) throw httpError(400, "La recompensa no tiene un costo válido.");
    const balance = userSnap.data().puntosAcumulados ?? 0;
    if (balance < cost) throw httpError(409, "No tienes suficientes puntos para este canje.");

    const codeRef = userRef.collection("codigos_canjeados").doc();
    tx.set(codeRef, {
      code,
      store: store.data().name ?? "Recompensa",
      rewardId,
      pointsSpent: cost,
      status: "active",
      userId: user.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    applyPoints(tx, user.uid, { user: userSnap.data(), pub: null }, { delta: -cost }); // redemptions don't move the league
    return { id: codeRef.id, code, rewardId, rewardTitle: store.data().name ?? "Recompensa", pointsSpent: cost, balance: balance - cost };
  });
});
