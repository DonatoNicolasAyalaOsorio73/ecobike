// GET /api/export — every piece of data EcoBike stores about the caller, as
// JSON (right of access / data portability). Excludes other users' data and
// the push token (a device secret).
const { admin, requireUser, handler } = require("./_lib");

const iso = (v) => (v && typeof v.toDate === "function" ? v.toDate().toISOString() : v);
function plain(obj) {
  if (Array.isArray(obj)) return obj.map(plain);
  if (obj && typeof obj === "object") {
    if (typeof obj.toDate === "function") return iso(obj);
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, plain(v)]));
  }
  return obj;
}

module.exports = handler(["GET"], async (req, res) => {
  const { uid } = await requireUser(req);
  const db = admin().firestore();
  const userRef = db.collection("usuarios").doc(uid);

  const [user, mirror, rides, codes, chats] = await Promise.all([
    userRef.get(),
    db.collection("usuarios_public").doc(uid).get(),
    userRef.collection("rides").get(),
    userRef.collection("codigos_canjeados").get(),
    db.collection("chats").where("participants", "array-contains", uid).get(),
  ]);

  const conversations = await Promise.all(
    chats.docs.map(async (c) => {
      const msgs = await c.ref.collection("messages").orderBy("createdAt").get();
      return {
        id: c.id,
        participants: c.data().participants,
        messages: msgs.docs.map((m) => plain({ ...m.data(), mine: m.data().from === uid })),
      };
    })
  );

  const { pushToken: _secret, ...profile } = user.data() || {};
  res.setHeader("Content-Disposition", `attachment; filename="ecobike-datos-${new Date().toISOString().slice(0, 10)}.json"`);
  return {
    exportedAt: new Date().toISOString(),
    uid,
    profile: plain(profile),
    publicProfile: plain(mirror.data() || null),
    rides: rides.docs.map((d) => plain({ id: d.id, ...d.data() })),
    redemptionCodes: codes.docs.map((d) => plain({ id: d.id, ...d.data() })),
    conversations,
  };
});
