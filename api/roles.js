// POST /api/roles { username, role: "user" | "partner" | "admin" } — admin only.
// Lets an admin turn a store employee into a partner (can validate codes).
const { admin, httpError, requireUser, isAdminUser, body, handler } = require("./_lib");

module.exports = handler(["POST"], async (req) => {
  const user = await requireUser(req);
  if (!(await isAdminUser(user))) throw httpError(403, "No tienes permisos de administrador.");
  const { username, role } = body(req);
  if (!["user", "partner", "admin"].includes(role)) throw httpError(400, "Rol inválido.");
  const name = typeof username === "string" ? username.trim().replace(/^@/, "").toLowerCase() : "";
  if (!name) throw httpError(400, "Falta el usuario.");

  const db = admin().firestore();
  const found = await db.collection("usuarios_public").where("username", "==", name).limit(1).get();
  if (found.empty) throw httpError(404, "Usuario no encontrado.");
  const uid = found.docs[0].id;
  if (uid === user.uid && role !== "admin") throw httpError(400, "No puedes quitarte tu propio rol de admin.");
  await db.collection("usuarios").doc(uid).update({ role, isAdmin: role === "admin" });
  return { uid, username: name, role };
});
