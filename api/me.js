// POST /api/me { username? } — called after sign-in, and to change username.
// Rebuilds the caller's public mirror (usuarios_public) from the
// authoritative usuarios doc, so accounts created by the old app (which never
// had a mirror) become searchable and rankable.
//
// Username uniqueness is enforced with a reservation doc usernames/{name}
// = { uid }, created inside a transaction (no check-then-write race).
const { admin, httpError, requireUser, body, handler, projectPublic } = require("./_lib");

const USERNAME_RE = /^[a-z0-9._]{3,20}$/;

function slug(s) {
  const base = String(s || "").toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 16);
  return base.length >= 3 ? base : `ciclista${base}`.slice(0, 16);
}

module.exports = handler(["POST"], async (req) => {
  const user = await requireUser(req);
  const db = admin().firestore();
  const ref = db.collection("usuarios").doc(user.uid);
  const names = db.collection("usernames");
  const wantedRaw = body(req).username;
  const wanted = wantedRaw === undefined ? null : String(wantedRaw).trim().replace(/^@/, "").toLowerCase();
  if (wanted !== null && !USERNAME_RE.test(wanted)) throw httpError(400, "Usa de 3 a 20 letras, números, punto o guion bajo.");

  // Candidates are computed up front: Firestore transactions need all reads before writes.
  const preSnap = await ref.get();
  if (!preSnap.exists) throw httpError(404, "Perfil de usuario no encontrado.");
  const current = typeof preSnap.data().username === "string" ? preSnap.data().username.trim().toLowerCase() : "";
  const base = slug(current || (user.email || "").split("@")[0] || user.uid);
  const candidates = wanted
    ? [wanted]
    : [current && USERNAME_RE.test(current) ? current : base, ...Array.from({ length: 4 }, () => `${base}${Math.floor(1000 + Math.random() * 9000)}`)];

  const username = await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(ref);
    const claimSnaps = await Promise.all(candidates.map((c) => tx.get(names.doc(c))));
    const oldClaim = current ? await tx.get(names.doc(current)) : null;

    const freeIndex = claimSnaps.findIndex((s) => !s.exists || s.data().uid === user.uid);
    if (freeIndex === -1) {
      if (wanted) throw httpError(409, "Ese nombre de usuario ya está en uso.");
      throw httpError(503, "No pudimos asignar un nombre de usuario. Inténtalo de nuevo.");
    }
    const chosen = candidates[freeIndex];
    tx.set(names.doc(chosen), { uid: user.uid });
    if (current && current !== chosen && oldClaim?.exists && oldClaim.data().uid === user.uid) tx.delete(names.doc(current));

    const d = userSnap.data();
    if (d.username !== chosen) tx.update(ref, { username: chosen });
    // merge keeps owner-controlled fields like "buscable" and league fields.
    tx.set(
      db.collection("usuarios_public").doc(user.uid),
      // Validated projection; friend lists are removed from public view.
      { username: chosen, ...projectPublic(d), amigos: require("firebase-admin/firestore").FieldValue.delete() },
      { merge: true }
    );
    return chosen;
  });

  return { ok: true, username };
});

module.exports.slug = slug;
