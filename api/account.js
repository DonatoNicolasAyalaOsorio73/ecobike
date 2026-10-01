// DELETE /api/account — permanently delete the caller's account and data
// (required by App Store / Play Store). Removes: usuarios/{uid} with its
// subcollections, the public mirror, avatar files, friend links, chats, the
// username reservation and the Firebase Auth user.
const { admin, requireUser, handler } = require("./_lib");

module.exports = handler(["DELETE"], async (req) => {
  const { uid } = await requireUser(req);
  const a = admin();
  const db = a.firestore();
  const { FieldValue } = require("firebase-admin/firestore");

  const friends = (await db.collection("usuarios").doc(uid).get()).data()?.amigos ?? [];
  await Promise.all(
    friends.map(async (f) => {
      await db.collection("usuarios").doc(f).update({ amigos: FieldValue.arrayRemove(uid) }).catch(() => {});
      await db.collection("usuarios_public").doc(f).set({ amigos: FieldValue.arrayRemove(uid) }, { merge: true }).catch(() => {});
    })
  );

  // Release the username reservation so someone else can take it.
  const claims = await db.collection("usernames").where("uid", "==", uid).get();
  await Promise.all(claims.docs.map((c) => c.ref.delete()));

  // Right to erasure: the user's 1:1 chats (and every message in them) go too.
  const chats = await db.collection("chats").where("participants", "array-contains", uid).get();
  await Promise.all(chats.docs.map((c) => db.recursiveDelete(c.ref)));

  await db.recursiveDelete(db.collection("usuarios").doc(uid));
  await db.collection("usuarios_public").doc(uid).delete();
  await a.storage().bucket().deleteFiles({ prefix: `avatars/${uid}/` }).catch(() => {});
  await a.auth().deleteUser(uid);
  return { ok: true };
});
