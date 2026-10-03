// GET /api/export — every piece of data EcoBike stores about the caller, as
// JSON (right of access / data portability). Excludes other users' data and
// the push token (a device secret).
const { admin, requireUser, handler, rateLimit } = require("./_lib");

const MAX_MESSAGES_PER_CHAT = 2000; // keeps the response under Vercel's size limit

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
  // Reads everything the user has: once every 10 minutes, so it can't be looped to run up costs.
  await rateLimit(uid, "export", 10 * 60_000, "Ya descargaste tus datos hace poco. Inténtalo de nuevo en unos minutos.");
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
      const msgs = await c.ref.collection("messages").orderBy("createdAt").limit(MAX_MESSAGES_PER_CHAT).get();
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
