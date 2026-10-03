// Replaces the whole partner catalog (Firestore `tiendas`) with src/data/stores.json:
// every store not in that file is deleted, the ones in it are created or overwritten
// (logos inline as data URLs, no Cloud Storage).
//
//   node scripts/seed-stores.mjs ./service-account.json           -> dry run, prints the plan
//   node scripts/seed-stores.mjs ./service-account.json --apply   -> does it
//
// The service account JSON comes from Firebase console > Project settings >
// Service accounts > Generate new private key. Never commit it.
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const [keyPath, flag] = process.argv.slice(2);
if (!keyPath) {
  console.error("Uso: node scripts/seed-stores.mjs <service-account.json> [--apply]");
  process.exit(1);
}
const apply = flag === "--apply";
const stores = JSON.parse(readFileSync(new URL("../src/data/stores.json", import.meta.url), "utf8"));

initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))) });
const db = getFirestore();
const col = db.collection("tiendas");

const keep = new Set(stores.map((s) => s.id));
const existing = await col.get();
const remove = existing.docs.filter((d) => !keep.has(d.id));

console.log(`Proyecto: ${db.projectId ?? "(service account)"}`);
console.log(`Se eliminan ${remove.length}: ${remove.map((d) => d.data().name ?? d.id).join(", ") || "ninguna"}`);
console.log(`Se crean o actualizan ${stores.length}: ${stores.map((s) => s.name).join(", ")}`);

// Partners and unused codes of removed stores are reported, not touched.
for (const d of remove) {
  const [partners, live] = await Promise.all([
    db.collection("usuarios").where("storeId", "==", d.id).get(),
    db.collectionGroup("codigos_canjeados").where("rewardId", "==", d.id).where("status", "==", "active").get(),
  ]);
  if (!partners.empty || !live.empty)
    console.log(`  Aviso ${d.data().name ?? d.id}: ${partners.size} partner(s), ${live.size} código(s) sin usar.`);
}

if (!apply) {
  console.log("\nSimulación: no se cambió nada. Repite con --apply para aplicarlo.");
  process.exit(0);
}

const batch = db.batch();
for (const d of remove) batch.delete(d.ref);
for (const { id, name, description, pointsRequired, logo } of stores)
  batch.set(col.doc(id), { name, description, pointsRequired, logo, isActive: true });
batch.set(db.collection("admin_logs").doc(), {
  adminUid: "script:seed-stores",
  action: "store.reset",
  targetType: "store",
  targetId: "*",
  details: { removed: remove.map((d) => d.id), stores: stores.map((s) => s.id) },
  at: FieldValue.serverTimestamp(),
});
await batch.commit();
console.log("\nListo: catálogo reemplazado.");
