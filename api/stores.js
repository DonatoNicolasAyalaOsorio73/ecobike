// Admin-only store (rewards catalog) management.
// GET  /api/stores                         → list all stores, including inactive
// POST /api/stores  { name, description?, logo?, pointsRequired }   → create
// PUT  /api/stores  { id, name?, description?, logo?, pointsRequired?, isActive? } → update
// Admin = custom claim admin:true, or usuarios/{uid}.role == "admin" / isAdmin == true.
const { admin, httpError, requireUser, isAdminUser, body, handler } = require("./_lib");

function clean(input, creating) {
  const out = {};
  if (typeof input.name === "string" && input.name.trim()) out.name = input.name.trim().slice(0, 80);
  if (typeof input.description === "string") out.description = input.description.trim().slice(0, 500);
  if (typeof input.logo === "string") out.logo = input.logo.trim().slice(0, 1000);
  if (typeof input.isActive === "boolean") out.isActive = input.isActive;
  if (input.pointsRequired !== undefined && input.pointsRequired !== "") {
    const n = Number(input.pointsRequired);
    if (!Number.isInteger(n) || n <= 0 || n > 1_000_000) throw httpError(400, "Los puntos deben ser un entero mayor que 0.");
    out.pointsRequired = n;
  }
  if (creating && (!out.name || !out.pointsRequired)) throw httpError(400, "Nombre y puntos son obligatorios.");
  return out;
}

module.exports = handler(["GET", "POST", "PUT"], async (req) => {
  const user = await requireUser(req);
  if (!(await isAdminUser(user))) throw httpError(403, "No tienes permisos de administrador.");
  const col = admin().firestore().collection("tiendas");

  if (req.method === "GET") {
    const snap = await col.get();
    return { stores: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
  }
  const input = body(req);
  if (req.method === "POST") {
    const data = { isActive: true, description: "", logo: "", ...clean(input, true) };
    const ref = await col.add(data);
    return { store: { id: ref.id, ...data } };
  }
  if (typeof input.id !== "string" || !input.id) throw httpError(400, "Falta el id de la tienda.");
  const update = clean(input, false);
  if (!Object.keys(update).length) throw httpError(400, "No hay campos válidos para actualizar.");
  const ref = col.doc(input.id);
  if (!(await ref.get()).exists) throw httpError(404, "La tienda no existe.");
  await ref.update(update);
  const fresh = await ref.get();
  return { store: { id: fresh.id, ...fresh.data() } };
});
