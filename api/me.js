// POST /api/me { username? } — called after sign-in, and to change username. Rebuilds the caller's public mirror
// (usuarios_public) from the authoritative usuarios doc, so accounts created
// by the old app (which never had a mirror) become searchable and rankable.
const { admin, httpError, requireUser, body, handler } = require("./_lib");

module.exports = handler(["POST"], async (req) => {
  const user = await requireUser(req);
  const db = admin().firestore();
  const ref = db.collection("usuarios").doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) throw httpError(404, "Perfil de usuario no encontrado.");
  const d = snap.data();

  let username = typeof d.username === "string" ? d.username.trim().toLowerCase() : "";
  const wanted = body(req).username;
  if (wanted !== undefined) {
    const name = String(wanted).trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9._]{3,20}$/.test(name)) throw httpError(400, "Usa de 3 a 20 letras, números, punto o guion bajo.");
    const taken = await db.collection("usuarios_public").where("username", "==", name).limit(1).get();
    if (!taken.empty && taken.docs[0].id !== user.uid) throw httpError(409, "Ese nombre de usuario ya está en uso.");
    username = name;
    await ref.update({ username });
  } else {
    // Auto usernames come from the email prefix and can collide; add a suffix.
    const original = username;
    if (!username) username = ((user.email || "").split("@")[0] || user.uid.slice(0, 8)).toLowerCase().replace(/[^a-z0-9._]/g, "");
    const taken = await db.collection("usuarios_public").where("username", "==", username).limit(2).get();
    if (taken.docs.some((doc) => doc.id !== user.uid)) username = `${username}${Math.floor(1000 + Math.random() * 9000)}`;
    if (username !== original) await ref.update({ username });
  }
  const mirror = {
    username,
    nombre: d.nombre ?? d.nombres ?? "",
    apellido: d.apellido ?? "",
    profileImageUrl: d.profileImageUrl ?? null,
    puntosAcumulados: d.puntosAcumulados ?? 0,
    amigos: d.amigos ?? [],
  };
  // merge keeps owner-controlled fields like "buscable".
  await db.collection("usuarios_public").doc(user.uid).set(mirror, { merge: true });
  return { ok: true };
});
