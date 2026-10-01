// POST /api/messages
//   { action: "send", to, text }  → append a message to the 1:1 chat with a friend
//   { action: "read", with }      → reset my unread counter for that chat
// Clients read chats/messages live from Firestore (owner-only rules) but never
// write them: the server checks friendship, validates text and rate-limits.
const { admin, httpError, requireUser, body, handler, sendPush, chatIdFor, cleanMessage, isDocId } = require("./_lib");

const MAX_PER_MINUTE = 20;

module.exports = handler(["POST"], async (req) => {
  const me = (await requireUser(req)).uid;
  const input = body(req);
  const db = admin().firestore();
  const { FieldValue, Timestamp } = require("firebase-admin/firestore");

  if (input.action === "read") {
    if (!isDocId(input.with)) throw httpError(400, "Chat inválido.");
    const ref = db.collection("chats").doc(chatIdFor(me, input.with));
    const snap = await ref.get();
    if (!snap.exists) return { ok: true };
    if (!(snap.data().participants || []).includes(me)) throw httpError(403, "No participas en este chat.");
    await ref.update({ [`unread.${me}`]: 0 });
    return { ok: true };
  }

  if (input.action !== "send") throw httpError(400, "Acción inválida.");
  const to = input.to;
  if (!isDocId(to) || to === me) throw httpError(400, "Destinatario inválido.");
  const msg = cleanMessage(input.text);
  if (msg.error) throw httpError(400, msg.error);

  const [meSnap, toSnap] = await Promise.all([db.collection("usuarios").doc(me).get(), db.collection("usuarios").doc(to).get()]);
  if (!meSnap.exists || !toSnap.exists) throw httpError(404, "Usuario no encontrado.");
  const friends = (meSnap.data().amigos || []).includes(to) && (toSnap.data().amigos || []).includes(me);
  if (!friends) throw httpError(403, "Solo puedes escribir a tus amigos.");

  const chatId = chatIdFor(me, to);
  const chatRef = db.collection("chats").doc(chatId);
  const messages = chatRef.collection("messages");

  const recent = await messages
    .where("from", "==", me)
    .where("createdAt", ">", Timestamp.fromMillis(Date.now() - 60_000))
    .count()
    .get();
  if (recent.data().count >= MAX_PER_MINUTE) throw httpError(429, "Estás enviando mensajes muy rápido. Espera un momento.");

  const msgRef = messages.doc();
  const batch = db.batch();
  batch.set(msgRef, { from: me, text: msg.text, createdAt: FieldValue.serverTimestamp() });
  batch.set(
    chatRef,
    {
      participants: [me, to].sort(),
      lastMessage: { text: msg.text.slice(0, 140), from: me },
      updatedAt: FieldValue.serverTimestamp(),
      unread: { [to]: FieldValue.increment(1), [me]: 0 },
    },
    { merge: true }
  );
  await batch.commit();

  const myName = meSnap.data().username ? `@${meSnap.data().username}` : "Un amigo";
  await sendPush([to], myName, msg.text.slice(0, 120), "messages", { url: `/chat/${me}` });
  return { id: msgRef.id, chatId };
});
