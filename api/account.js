// DELETE /api/account — permanently delete the caller's account and data
// (required by App Store / Play Store). See deleteUserData in _lib.js for
// everything that's removed.
const { requireUser, handler, deleteUserData } = require("./_lib");

module.exports = handler(["DELETE"], async (req) => {
  const { uid } = await requireUser(req);
  await deleteUserData(uid);
  return { ok: true };
});
