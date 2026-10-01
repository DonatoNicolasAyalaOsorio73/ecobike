// GET /api/admin-stats — admin dashboard KPIs (aggregation queries only, no
// documents are downloaded). Admin = custom claim or usuarios.role/isAdmin.
const { admin, httpError, requireUser, isAdminUser, handler } = require("./_lib");

module.exports = handler(["GET"], async (req) => {
  const user = await requireUser(req);
  if (!(await isAdminUser(user))) throw httpError(403, "No tienes permisos de administrador.");
  const db = admin().firestore();
  const { AggregateField, Timestamp } = require("firebase-admin/firestore");

  const weekAgoMs = Date.now() - 7 * 86_400_000;
  const weekAgo = Timestamp.fromMillis(weekAgoMs);

  const ridesWeek = db.collectionGroup("rides").where("startedAt", ">=", weekAgoMs);
  const codesWeek = db.collectionGroup("codigos_canjeados").where("createdAt", ">=", weekAgo);

  const [users, rides, codes, used, stores] = await Promise.all([
    db.collection("usuarios").count().get(),
    ridesWeek.aggregate({ n: AggregateField.count(), meters: AggregateField.sum("distanceMeters"), pts: AggregateField.sum("pointsEarned") }).get(),
    codesWeek.count().get(),
    db.collectionGroup("codigos_canjeados").where("status", "==", "used").count().get(),
    db.collection("tiendas").count().get(),
  ]);

  const r = rides.data();
  return {
    users: users.data().count,
    ridesWeek: r.n ?? 0,
    kmWeek: Math.round((r.meters ?? 0) / 1000),
    pointsWeek: r.pts ?? 0,
    redemptionsWeek: codes.data().count,
    codesUsedTotal: used.data().count,
    stores: stores.data().count,
  };
});
