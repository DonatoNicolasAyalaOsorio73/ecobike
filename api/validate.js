// POST /api/validate { code, confirm? } — a store (role partner) or admin
// checks a customer's redemption code. Without confirm it only looks it up;
// with confirm: true it marks it "used" (one time only).
// Needs the collection-group index on codigos_canjeados.code (firestore.indexes.json).
const { admin, httpError, requireUser, isAdminUser, logAdmin, body, handler } = require("./_lib");

module.exports = handler(["POST"], async (req) => {
  const user = await requireUser(req);
  const db = admin().firestore();
  const caller = (await db.collection("usuarios").doc(user.uid).get()).data() || {};
  const isAdmin = await isAdminUser(user); // the one server definition of admin (AD-4)
  if (!isAdmin && caller.role !== "partner") throw httpError(403, "Solo tiendas aliadas o administradores pueden validar códigos.");
  // Partners are bound to one store: they must not see or burn other stores' codes.
  if (!isAdmin && !caller.storeId) throw httpError(403, "Tu cuenta de tienda no tiene una tienda asignada. Pide al administrador que la asigne.");

  const { code, confirm } = body(req);
  const clean = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!/^[A-Z0-9]{6,20}$/.test(clean)) throw httpError(400, "Código inválido.");

  const snap = await db.collectionGroup("codigos_canjeados").where("code", "==", clean).limit(1).get();
  if (snap.empty) throw httpError(404, "Código no encontrado.");
  const ref = snap.docs[0].ref;
  const { FieldValue } = require("firebase-admin/firestore");

  const result = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const d = doc.data();
    if (!isAdmin && d.rewardId !== caller.storeId) throw httpError(403, "Este código pertenece a otra tienda.");
    const result = { code: clean, store: d.store ?? "Recompensa", status: d.status ?? "active" };
    if (!confirm) return result;
    if (d.status === "used") throw httpError(409, "Este código ya fue usado.");
    tx.update(ref, { status: "used", usedAt: FieldValue.serverTimestamp(), validatedBy: user.uid });
    return { ...result, status: "used", rewardId: d.rewardId ?? null };
  });
  // Every redeemed code is traceable to who confirmed it.
  if (confirm) await logAdmin(user.uid, "code.validate", "code", ref.id, { code: clean, store: result.store, rewardId: result.rewardId, role: isAdmin ? "admin" : "partner" });
  const { rewardId: _r, ...out } = result;
  return out;
});
