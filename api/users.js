// Admin user management (all audited in admin_logs).
// GET    /api/users?q=texto&after=uid   → search (username prefix, or exact email) / page through users
// GET    /api/users?id=uid              → detail: profile, account status, activity counts, recent admin log
// GET    /api/users?stats=1             → dashboard KPIs (aggregation queries only)
// PUT    /api/users { id, role?, storeId?, points?, reason?, disabled?, nombre?, apellido? } → update
// DELETE /api/users { id, reason }      → permanently delete the user and their data
const { admin, httpError, requireAdmin, logAdmin, deleteUserData, body, handler, isDocId } = require("./_lib");

const PAGE = 25;
const ROLES = ["user", "partner", "admin"];

/**
 * Validates an admin update (pure, tested). Points can only be changed
 * together with a written reason (they're money-like), names are bounded,
 * roles come from a fixed list, and a partner must belong to a store.
 */
function parseUserUpdate(input) {
  if (!isDocId(input.id)) throw httpError(400, "Falta el id del usuario.");
  const out = { id: input.id };
  if (input.role !== undefined) {
    if (!ROLES.includes(input.role)) throw httpError(400, "Rol inválido.");
    out.role = input.role;
    if (input.role === "partner") {
      if (!isDocId(input.storeId)) throw httpError(400, "Elige la tienda del partner.");
      out.storeId = input.storeId;
    }
  }
  if (input.points !== undefined) {
    // Only a real number or digit string: Number(null) / Number("") would silently mean 0.
    const n = typeof input.points === "number" || (typeof input.points === "string" && /^\d+$/.test(input.points.trim())) ? Number(input.points) : NaN;
    if (!Number.isInteger(n) || n < 0 || n > 10_000_000) throw httpError(400, "Los puntos deben ser un entero entre 0 y 10.000.000.");
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";
    if (reason.length < 5) throw httpError(400, "Escribe el motivo del ajuste de puntos (mínimo 5 caracteres).");
    out.points = n;
    out.reason = reason.slice(0, 300);
    // The balance the admin was looking at: if a ride synced meanwhile, refuse instead of overwriting it.
    if (!Number.isInteger(input.expectedPoints)) throw httpError(400, "Falta el saldo de referencia (recarga el usuario).");
    out.expectedPoints = input.expectedPoints;
  }
  if (input.disabled !== undefined) {
    if (typeof input.disabled !== "boolean") throw httpError(400, "Estado de cuenta inválido.");
    out.disabled = input.disabled;
  }
  for (const k of ["nombre", "apellido"]) {
    if (input[k] !== undefined) {
      if (typeof input[k] !== "string" || !input[k].trim() || input[k].trim().length > 60) throw httpError(400, `${k === "nombre" ? "Nombre" : "Apellido"} inválido.`);
      out[k] = input[k].trim();
    }
  }
  if (Object.keys(out).filter((k) => !["id", "storeId", "reason", "expectedPoints"].includes(k)).length === 0) throw httpError(400, "No hay cambios para guardar.");
  return out;
}

/** An admin can't demote or suspend themself from the panel (pure, tested). */
function assertNotSelfLockout(u, meUid) {
  if (u.id === meUid && ((u.role && u.role !== "admin") || u.disabled === true)) throw httpError(400, "No puedes quitarte el rol de admin ni suspender tu propia cuenta.");
}

function summary(uid, d = {}, pub = {}) {
  return {
    uid,
    username: pub.username ?? d.username ?? null,
    nombre: d.nombre ?? pub.nombre ?? "",
    apellido: d.apellido ?? pub.apellido ?? "",
    email: d.email ?? null,
    photo: d.profileImageUrl ?? pub.profileImageUrl ?? null,
    role: d.role ?? (d.isAdmin ? "admin" : "user"),
    storeId: d.storeId ?? null,
    points: d.puntosAcumulados ?? 0,
    active: d.cuentaActiva !== false,
  };
}

async function list(db, q, after) {
  const text = typeof q === "string" ? q.trim().toLowerCase().replace(/^@/, "") : "";
  if (text.includes("@")) {
    // Exact email lookup through Firebase Auth.
    try {
      const u = await admin().auth().getUserByEmail(text);
      const [d, p] = await Promise.all([db.collection("usuarios").doc(u.uid).get(), db.collection("usuarios_public").doc(u.uid).get()]);
      return { users: [summary(u.uid, d.data(), p.data())], next: null };
    } catch (e) {
      if (e?.code !== "auth/user-not-found") throw e;
      return { users: [], next: null };
    }
  }
  if (text) {
    // Username prefix search on the public mirror (indexed by default).
    const snap = await db.collection("usuarios_public").orderBy("username").startAt(text).endAt(text + "").limit(PAGE).get();
    const docs = await Promise.all(snap.docs.map((p) => db.collection("usuarios").doc(p.id).get()));
    return { users: snap.docs.map((p, i) => summary(p.id, docs[i].data(), p.data())), next: null };
  }
  let query = db.collection("usuarios").orderBy("__name__").limit(PAGE);
  if (isDocId(after)) query = query.startAfter(after);
  const snap = await query.get();
  const pubs = await Promise.all(snap.docs.map((d) => db.collection("usuarios_public").doc(d.id).get()));
  return { users: snap.docs.map((d, i) => summary(d.id, d.data(), pubs[i].data())), next: snap.size === PAGE ? snap.docs[snap.size - 1].id : null };
}

// Lives here (not its own file) because the Hobby plan allows 12 functions per deployment.
async function stats(db) {
  const { AggregateField, Timestamp } = require("firebase-admin/firestore");
  const weekAgoMs = Date.now() - 7 * 86_400_000;
  const [users, rides, codes, used, stores] = await Promise.all([
    db.collection("usuarios").count().get(),
    db.collectionGroup("rides").where("startedAt", ">=", weekAgoMs).aggregate({ n: AggregateField.count(), meters: AggregateField.sum("distanceMeters"), pts: AggregateField.sum("pointsEarned") }).get(),
    db.collectionGroup("codigos_canjeados").where("createdAt", ">=", Timestamp.fromMillis(weekAgoMs)).count().get(),
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
}

async function detail(db, uid) {
  const ref = db.collection("usuarios").doc(uid);
  const [d, p, rides, verified, codes, logs] = await Promise.all([
    ref.get(),
    db.collection("usuarios_public").doc(uid).get(),
    ref.collection("rides").count().get(),
    ref.collection("rides").where("verified", "==", true).count().get(),
    ref.collection("codigos_canjeados").count().get(),
    // Needs the admin_logs index; without it the detail still loads, just without history.
    db.collection("admin_logs").where("targetId", "==", uid).orderBy("at", "desc").limit(10).get().catch(() => ({ docs: [] })),
  ]);
  if (!d.exists) throw httpError(404, "Usuario no encontrado.");
  const auth = await admin().auth().getUser(uid).catch(() => null);
  return {
    user: {
      ...summary(uid, d.data(), p.data()),
      disabled: auth?.disabled ?? false,
      providers: auth?.providerData.map((x) => x.providerId) ?? [],
      createdAt: auth?.metadata.creationTime ?? null,
      lastSignIn: auth?.metadata.lastSignInTime ?? null,
      emailVerified: auth?.emailVerified ?? false,
      stats: { rides: rides.data().count, verifiedRides: verified.data().count, codes: codes.data().count },
    },
    logs: logs.docs.map((l) => ({ id: l.id, ...l.data(), at: l.data().at?.toMillis?.() ?? null })),
  };
}

module.exports = handler(["GET", "PUT", "DELETE"], async (req) => {
  const me = await requireAdmin(req);
  const db = admin().firestore();
  const { FieldValue } = require("firebase-admin/firestore");

  if (req.method === "GET") {
    if (req.query?.stats !== undefined) return stats(db);
    const id = req.query?.id;
    if (id !== undefined) {
      if (!isDocId(id)) throw httpError(400, "id inválido.");
      return detail(db, id);
    }
    return list(db, req.query?.q, req.query?.after);
  }

  const input = body(req);
  if (req.method === "DELETE") {
    if (!isDocId(input.id)) throw httpError(400, "Falta el id del usuario.");
    if (input.id === me.uid) throw httpError(400, "No puedes eliminar tu propia cuenta desde el panel.");
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";
    if (reason.length < 5) throw httpError(400, "Escribe el motivo de la eliminación (mínimo 5 caracteres).");
    const before = (await db.collection("usuarios").doc(input.id).get()).data();
    if (!before) throw httpError(404, "Usuario no encontrado.");
    // Logged first so a deletion that fails halfway still leaves a trace. No personal data in the log.
    await logAdmin(me.uid, "user.delete", "user", input.id, { reason });
    await deleteUserData(input.id);
    return { deleted: true };
  }

  const u = parseUserUpdate(input);
  assertNotSelfLockout(u, me.uid);
  if (u.role === "partner" && !(await db.collection("tiendas").doc(u.storeId).get()).exists) throw httpError(404, "La tienda no existe.");
  const ref = db.collection("usuarios").doc(u.id);
  const pubRef = db.collection("usuarios_public").doc(u.id);

  // Firestore changes in one transaction so a ride synced at the same time can't be lost.
  const changed = await db.runTransaction(async (tx) => {
    const before = (await tx.get(ref)).data();
    if (!before) throw httpError(404, "Usuario no encontrado.");
    const update = { updatedAt: FieldValue.serverTimestamp() };
    const pub = {};
    const changed = {};
    if (u.role) {
      Object.assign(update, { role: u.role, isAdmin: u.role === "admin", storeId: u.role === "partner" ? u.storeId : FieldValue.delete() });
      changed.role = { from: before.role ?? "user", to: u.role, storeId: u.storeId ?? null };
    }
    if (u.points !== undefined) {
      const current = before.puntosAcumulados ?? 0;
      if (u.expectedPoints !== undefined && u.expectedPoints !== current) throw httpError(409, `El saldo cambió a ${current} pts mientras editabas. Revisa y vuelve a intentarlo.`);
      update.puntosAcumulados = u.points;
      pub.puntosAcumulados = u.points;
      changed.points = { from: current, to: u.points, reason: u.reason };
    }
    if (u.disabled !== undefined) {
      update.cuentaActiva = !u.disabled;
      changed.disabled = { to: u.disabled };
    }
    for (const k of ["nombre", "apellido"]) {
      if (u[k] !== undefined) {
        update[k] = u[k];
        pub[k] = u[k];
        changed[k] = { from: before[k] ?? "", to: u[k] };
      }
    }
    tx.update(ref, update);
    if (Object.keys(pub).length) tx.set(pubRef, pub, { merge: true });
    return changed;
  });

  // Firebase Auth side (not transactional): an old `admin` custom claim would
  // otherwise keep a demoted user admin; suspension signs them out everywhere.
  // The audit entry is written whatever happens here.
  try {
    if (u.role) {
      const claims = (await admin().auth().getUser(u.id).catch(() => null))?.customClaims ?? {};
      if ("admin" in claims && claims.admin !== (u.role === "admin")) {
        await admin().auth().setCustomUserClaims(u.id, { ...claims, admin: u.role === "admin" });
        // Tokens already issued still carry the old claim: revoke so it can't be used for the next hour.
        if (u.role !== "admin") await admin().auth().revokeRefreshTokens(u.id);
      }
    }
    if (u.disabled !== undefined) {
      await admin().auth().updateUser(u.id, { disabled: u.disabled });
      if (u.disabled) await admin().auth().revokeRefreshTokens(u.id);
    }
  } catch (e) {
    await logAdmin(me.uid, "user.update", "user", u.id, { ...changed, authError: String(e?.code ?? e?.message ?? e) });
    throw httpError(502, "Se guardó en la base de datos, pero falló la actualización de la cuenta (Auth). Inténtalo de nuevo.");
  }
  await logAdmin(me.uid, "user.update", "user", u.id, changed);
  return detail(db, u.id);
});

module.exports.parseUserUpdate = parseUserUpdate;
module.exports.assertNotSelfLockout = assertNotSelfLockout;
