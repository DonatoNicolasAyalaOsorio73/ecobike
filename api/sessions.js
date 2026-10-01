// POST /api/sessions { action: "revoke" } — sign out everywhere: revokes all
// refresh tokens, and requireUser() rejects ID tokens issued before this.
const { admin, httpError, requireUser, body, handler } = require("./_lib");

module.exports = handler(["POST"], async (req) => {
  const { uid } = await requireUser(req);
  if (body(req).action !== "revoke") throw httpError(400, "Acción inválida.");
  await admin().auth().revokeRefreshTokens(uid);
  await admin().firestore().collection("usuarios").doc(uid).update({ pushToken: null }).catch(() => {});
  return { ok: true };
});
