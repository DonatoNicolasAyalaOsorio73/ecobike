// POST /api/redeem { rewardId } — spend points on a store reward.
// The price is read from tiendas/{rewardId} on the server, never from the client.
const { admin, httpError, requireUser, body, handler, redemptionCode } = require("./_lib");

module.exports = handler(["POST"], async (req) => {
  const user = await requireUser(req);
  const { rewardId } = body(req);
  if (typeof rewardId !== "string" || !rewardId) throw httpError(400, "Falta rewardId.");

  const db = admin().firestore();
  const { FieldValue } = require("firebase-admin/firestore");
  const userRef = db.collection("usuarios").doc(user.uid);
  const storeRef = db.collection("tiendas").doc(rewardId);
  const code = redemptionCode();

  return db.runTransaction(async (tx) => {
    const [store, userSnap] = await Promise.all([tx.get(storeRef), tx.get(userRef)]);
    if (!store.exists || store.data().isActive === false) throw httpError(404, "La recompensa no existe.");
    if (!userSnap.exists) throw httpError(404, "Perfil de usuario no encontrado.");
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
    tx.update(userRef, { puntosAcumulados: FieldValue.increment(-cost), updatedAt: FieldValue.serverTimestamp() });
    tx.set(db.collection("usuarios_public").doc(user.uid), { puntosAcumulados: balance - cost }, { merge: true });
    return { id: codeRef.id, code, rewardId, rewardTitle: store.data().name ?? "Recompensa", pointsSpent: cost, balance: balance - cost };
  });
});
