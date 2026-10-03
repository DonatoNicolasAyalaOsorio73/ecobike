// POST /api/friends { action: "request" | "accept" | "reject" | "remove", uid }
// Friendship touches two users' documents, which clients can't do under the
// rules — so both sides are written here atomically.
// POST /api/friends { action: "search", username }    → a public profile, or null
// POST /api/friends { action: "available", username } → { available }
// Search lives here because clients can't list usuarios_public (no enumeration),
// and it honors "hide me from search" (buscable: false) on the server.
const { admin, httpError, requireUser, body, handler, sendPush, isDocId, rateLimit } = require("./_lib");

module.exports = handler(["POST"], async (req) => {
  const me = (await requireUser(req)).uid;
  const { action, uid: other, username } = body(req);
  if (action === "search" || action === "available") return lookupUsername(me, action, username);
  if (!isDocId(other) || other === me) throw httpError(400, "Usuario inválido.");
  // Request → reject → request loops would spam the other person's phone.
  if (action === "request") await rateLimit(me, "friendRequest", 5_000);
  if (!["request", "accept", "reject", "remove"].includes(action)) throw httpError(400, "Acción inválida.");

  const db = admin().firestore();
  const { FieldValue } = require("firebase-admin/firestore");
  const users = db.collection("usuarios");
  const pub = db.collection("usuarios_public");
  const meRef = users.doc(me);
  const otherRef = users.doc(other);

  const result = await db.runTransaction(async (tx) => {
    const [meSnap, otherSnap] = await Promise.all([tx.get(meRef), tx.get(otherRef)]);
    if (!meSnap.exists || !otherSnap.exists) throw httpError(404, "Usuario no encontrado.");
    const myFriends = meSnap.data().amigos ?? [];
    const myPending = meSnap.data().solicitudesPendientes ?? [];
    const otherFriends = otherSnap.data().amigos ?? [];

    if (action === "request") {
      if (myFriends.includes(other)) throw httpError(409, "Ya son amigos.");
      // If they already asked me, a request from me just means "accept".
      if (!myPending.includes(other)) {
        // ponytail: simple anti-spam cap; per-sender rate limits if abuse appears.
        if ((otherSnap.data().solicitudesPendientes ?? []).length >= 100) {
          throw httpError(429, "Ese usuario tiene demasiadas solicitudes pendientes.");
        }
        tx.update(otherRef, { solicitudesPendientes: FieldValue.arrayUnion(me) });
        return { status: "requested" };
      }
    }
    if (action === "request" || action === "accept") {
      if (!myPending.includes(other)) throw httpError(404, "No hay solicitud pendiente de ese usuario.");
      const mine = [...new Set([...myFriends, other])];
      const theirs = [...new Set([...otherFriends, me])];
      tx.update(meRef, { amigos: mine, solicitudesPendientes: FieldValue.arrayRemove(other) });
      tx.update(otherRef, { amigos: theirs, solicitudesPendientes: FieldValue.arrayRemove(me) });
      return { status: "friends" };
    }
    if (action === "reject") {
      tx.update(meRef, { solicitudesPendientes: FieldValue.arrayRemove(other) });
      return { status: "rejected" };
    }
    // remove
    const mine = myFriends.filter((u) => u !== other);
    const theirs = otherFriends.filter((u) => u !== me);
    tx.update(meRef, { amigos: mine });
    tx.update(otherRef, { amigos: theirs });
    return { status: "removed" };
  });

  // Notify the other person (after commit, never blocks the response on failure).
  const myName = (await pub.doc(me).get().catch(() => null))?.data()?.username ?? "Alguien";
  if (result.status === "requested") await sendPush([other], "Nueva solicitud de amistad", `@${myName} quiere ser tu amigo en EcoBike.`, "friends", { url: "/friends" });
  if (result.status === "friends") await sendPush([other], "Solicitud aceptada", `@${myName} y tú ahora son amigos.`, "friends", { url: "/friends" });
  return result;
});

const USERNAME_RE = /^[a-z0-9._]{3,20}$/;

/** Exact-username lookup (no prefix scans, so no enumeration). */
async function lookupUsername(me, action, raw) {
  const username = typeof raw === "string" ? raw.trim().replace(/^@/, "").toLowerCase() : "";
  if (!USERNAME_RE.test(username)) return action === "available" ? { available: false } : { user: null };
  const db = admin().firestore();
  const claim = await db.collection("usernames").doc(username).get();
  const uid = claim.exists ? claim.data().uid : null;
  if (action === "available") return { available: !uid || uid === me };
  if (!uid) return { user: null };
  const p = (await db.collection("usuarios_public").doc(uid).get()).data();
  if (!p || p.buscable === false) return { user: null }; // chose not to appear in search
  return { user: { uid, username: p.username ?? username, nombre: p.nombre ?? "", apellido: p.apellido ?? "", profileImageUrl: p.profileImageUrl ?? null, puntosAcumulados: p.puntosAcumulados ?? 0 } };
}

module.exports.lookupUsername = lookupUsername;
