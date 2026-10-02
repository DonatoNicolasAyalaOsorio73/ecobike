// Admin-only store (rewards catalog) management.
// GET  /api/stores                         → list all stores, including inactive
// POST /api/stores  { name, description?, logo?, pointsRequired }   → create
// PUT  /api/stores  { id, name?, description?, logo?, pointsRequired?, isActive? } → update
// DELETE /api/stores { id }                → delete (refused while partners point at it)
// Admin = custom claim admin:true, or usuarios/{uid}.role == "admin" / isAdmin == true.
// Every write is audited in admin_logs.
const { admin, httpError, requireAdmin, logAdmin, body, handler, isDocId } = require("./_lib");

function clean(input, creating) {
  const out = {};
  if (typeof input.name === "string" && input.name.trim()) out.name = input.name.trim().slice(0, 80);
  if (typeof input.description === "string") out.description = input.description.trim().slice(0, 500);
  if (typeof input.logo === "string") {
    const logo = input.logo.trim().slice(0, 1000);
    if (logo && !/^https:\/\//.test(logo)) throw httpError(400, "El logo debe ser una URL https.");
    out.logo = logo;
  }
  if (typeof input.isActive === "boolean") out.isActive = input.isActive;
  if (input.pointsRequired !== undefined && input.pointsRequired !== "") {
    const n = Number(input.pointsRequired);
    if (!Number.isInteger(n) || n <= 0 || n > 1_000_000) throw httpError(400, "Los puntos deben ser un entero mayor que 0.");
    out.pointsRequired = n;
  }
  if (creating && (!out.name || !out.pointsRequired)) throw httpError(400, "Nombre y puntos son obligatorios.");
  // Every reward is shown with its company logo, so a store can't exist without one.
  if ((creating || out.logo !== undefined) && !out.logo) throw httpError(400, "Sube el logo de la tienda.");
  return out;
}

module.exports = handler(["GET", "POST", "PUT", "DELETE"], async (req) => {
  const me = await requireAdmin(req);
  const db = admin().firestore();
  const col = admin().firestore().collection("tiendas");

  if (req.method === "GET") {
    const snap = await col.get();
    return { stores: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
  }
  const input = body(req);
  if (req.method === "POST") {
    const data = { isActive: true, description: "", ...clean(input, true) };
    const ref = await col.add(data);
    await logAdmin(me.uid, "store.create", "store", ref.id, { name: data.name, pointsRequired: data.pointsRequired });
    return { store: { id: ref.id, ...data } };
  }
  if (!isDocId(input.id)) throw httpError(400, "Falta el id de la tienda.");
  if (req.method === "DELETE") {
    const ref = col.doc(input.id);
    const snap = await ref.get();
    if (!snap.exists) throw httpError(404, "La tienda no existe.");
    const partners = await db.collection("usuarios").where("storeId", "==", input.id).limit(1).get();
    if (!partners.empty) throw httpError(409, "Esta tienda tiene partners asignados. Quítales el rol o desactívala.");
    await ref.delete(); // redeemed codes keep their own copy of the store name
    await logAdmin(me.uid, "store.delete", "store", input.id, { name: snap.data().name ?? null });
    return { deleted: true };
  }
  const update = clean(input, false);
  if (!Object.keys(update).length) throw httpError(400, "No hay campos válidos para actualizar.");
  const ref = col.doc(input.id);
  if (!(await ref.get()).exists) throw httpError(404, "La tienda no existe.");
  await ref.update(update);
  await logAdmin(me.uid, "store.update", "store", input.id, update);
  const fresh = await ref.get();
  return { store: { id: fresh.id, ...fresh.data() } };
});

module.exports.clean = clean;
