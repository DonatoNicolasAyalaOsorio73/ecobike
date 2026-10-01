// POST /api/roles { username, role: "user" | "partner" | "admin" } — admin only.
// Lets an admin turn a store employee into a partner (can validate codes).
const { admin, httpError, requireUser, isAdminUser, body, handler, isDocId } = require("./_lib");

module.exports = handler(["POST"], async (req) => {
  const user = await requireUser(req);
  if (!(await isAdminUser(user))) throw httpError(403, "No tienes permisos de administrador.");
  const { username, role, storeId } = body(req);
  if (!["user", "partner", "admin"].includes(role)) throw httpError(400, "Rol inválido.");
  const name = typeof username === "string" ? username.trim().replace(/^@/, "").toLowerCase() : "";
  if (!name) throw httpError(400, "Falta el usuario.");

  const db = admin().firestore();
  const found = await db.collection("usuarios_public").where("username", "==", name).limit(1).get();
  if (found.empty) throw httpError(404, "Usuario no encontrado.");
  const uid = found.docs[0].id;
  if (uid === user.uid && role !== "admin") throw httpError(400, "No puedes quitarte tu propio rol de admin.");
  // A partner validates codes for ONE store only (api/validate.js checks it).
  const { FieldValue } = require("firebase-admin/firestore");
  let store = null;
  if (role === "partner") {
    if (!isDocId(storeId)) throw httpError(400, "Elige la tienda del partner.");
    const s = await db.collection("tiendas").doc(storeId).get();
    if (!s.exists) throw httpError(404, "La tienda no existe.");
    store = s.data().name ?? storeId;
  }
  await db.collection("usuarios").doc(uid).update({ role, isAdmin: role === "admin", storeId: role === "partner" ? storeId : FieldValue.delete() });
  return { uid, username: name, role, ...(store ? { storeId, store } : {}) };
});
