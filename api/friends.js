// POST /api/friends { action: "request" | "accept" | "reject" | "remove", uid }
// Friendship touches two users' documents, which clients can't do under the
// rules — so both sides are written here atomically.
const { admin, httpError, requireUser, body, handler, sendPush } = require("./_lib");

module.exports = handler(["POST"], async (req) => {
  const me = (await requireUser(req)).uid;
  const { action, uid: other } = body(req);
  if (typeof other !== "string" || !other || other === me) throw httpError(400, "Usuario inválido.");
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
      tx.set(pub.doc(me), { amigos: mine }, { merge: true });
      tx.set(pub.doc(other), { amigos: theirs }, { merge: true });
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
    tx.set(pub.doc(me), { amigos: mine }, { merge: true });
    tx.set(pub.doc(other), { amigos: theirs }, { merge: true });
    return { status: "removed" };
  });

  // Notify the other person (after commit, never blocks the response on failure).
  const myName = (await pub.doc(me).get().catch(() => null))?.data()?.username ?? "Alguien";
  if (result.status === "requested") await sendPush([other], "Nueva solicitud de amistad", `@${myName} quiere ser tu amigo en EcoBike.`);
  if (result.status === "friends") await sendPush([other], "Solicitud aceptada", `@${myName} y tú ahora son amigos.`);
  return result;
});
