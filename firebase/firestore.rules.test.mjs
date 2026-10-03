// Firestore security rules tests. Run against the emulator (needs Java):
//   npm run test:rules
// CI runs them on every push (.github/workflows/ci.yml).
import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";

let env;
const ALICE = "alice";
const BOB = "bob";

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-ecobike-rules",
    firestore: { rules: readFileSync("firebase/firestore.rules", "utf8") },
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "usuarios", ALICE), { nombre: "Alice", username: "alice", puntosAcumulados: 500, role: "user", amigos: [BOB] });
    await setDoc(doc(db, "usuarios", BOB), { nombre: "Bob", username: "bob", puntosAcumulados: 10, role: "user", amigos: [ALICE] });
    await setDoc(doc(db, "usuarios_public", ALICE), { username: "alice", nombre: "Alice", puntosAcumulados: 500, amigos: [BOB] });
    await setDoc(doc(db, "usuarios", ALICE, "rides", "r1"), { userId: ALICE, distanceMeters: 1000 });
    await setDoc(doc(db, "usuarios", ALICE, "codigos_canjeados", "c1"), { code: "ABC123", status: "active" });
    await setDoc(doc(db, "tiendas", "t1"), { name: "Coldest", pointsRequired: 80 });
    await setDoc(doc(db, "chats", `${ALICE}__${BOB}`), { participants: [ALICE, BOB] });
    await setDoc(doc(db, "chats", `${ALICE}__${BOB}`, "messages", "m1"), { from: ALICE, text: "hola" });
  });
});

const as = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

test("usuarios: only the owner reads their private profile", async () => {
  await assertSucceeds(getDoc(doc(as(ALICE), "usuarios", ALICE)));
  await assertFails(getDoc(doc(as(BOB), "usuarios", ALICE)));
  await assertFails(getDoc(doc(as(null), "usuarios", ALICE)));
});

test("usuarios: owner edits profile fields but never points, role, friends or username", async () => {
  const db = as(ALICE);
  await assertSucceeds(updateDoc(doc(db, "usuarios", ALICE), { nombre: "Alicia", city: "Bogotá", notifPrefs: { messages: false } }));
  await assertFails(updateDoc(doc(db, "usuarios", ALICE), { puntosAcumulados: 999999 }));
  await assertFails(updateDoc(doc(db, "usuarios", ALICE), { role: "admin" }));
  await assertFails(updateDoc(doc(db, "usuarios", ALICE), { isAdmin: true }));
  await assertFails(updateDoc(doc(db, "usuarios", ALICE), { amigos: [] }));
  await assertFails(updateDoc(doc(db, "usuarios", ALICE), { username: "admin" }));
  await assertFails(updateDoc(doc(db, "usuarios", BOB), { nombre: "hack" }));
  await assertFails(deleteDoc(doc(db, "usuarios", ALICE)));
  await assertSucceeds(updateDoc(doc(db, "usuarios", ALICE), { bio: "Pedaleo a diario", fechaNacimiento: "1995-06-15", sexo: "Femenino" }));
  await assertFails(updateDoc(doc(db, "usuarios", ALICE), { bio: "x".repeat(201) }));
  await assertFails(updateDoc(doc(db, "usuarios", ALICE), { nombre: 42 }));
});

test("usuarios: sign-up must start at zero points and plain user role", async () => {
  const carol = as("carol");
  await assertFails(setDoc(doc(carol, "usuarios", "carol"), { username: "carol", puntosAcumulados: 100 }));
  await assertFails(setDoc(doc(carol, "usuarios", "carol"), { username: "carol", role: "admin" }));
  await assertSucceeds(setDoc(doc(carol, "usuarios", "carol"), { username: "carol", puntosAcumulados: 0, role: "user", amigos: [], solicitudesPendientes: [] }));
});

test("usuarios_public: readable by signed-in users; owner can't fake points or friends", async () => {
  await assertSucceeds(getDoc(doc(as(BOB), "usuarios_public", ALICE)));
  await assertFails(getDoc(doc(as(null), "usuarios_public", ALICE)));
  // No list queries: profiles can't be enumerated (search goes through the API).
  await assertFails(getDocs(collection(as(BOB), "usuarios_public")));
  await assertFails(getDocs(query(collection(as(BOB), "usuarios_public"), where("username", "==", "alice"))));
  const db = as(ALICE);
  await assertSucceeds(updateDoc(doc(db, "usuarios_public", ALICE), { nombre: "Alicia", buscable: false }));
  await assertFails(updateDoc(doc(db, "usuarios_public", ALICE), { buscable: "no" }));
  await assertFails(updateDoc(doc(db, "usuarios_public", ALICE), { puntosAcumulados: 1e9 }));
  await assertFails(updateDoc(doc(db, "usuarios_public", ALICE), { weekPoints: 5000, weekKey: "2026-W40" }));
  await assertFails(updateDoc(doc(db, "usuarios_public", ALICE), { email: "leak@example.com" }));
  await assertFails(setDoc(doc(as("carol"), "usuarios_public", "carol"), { username: "carol", puntosAcumulados: 50 }));
});

test("rides and redemption codes: owner reads, nobody writes from the client", async () => {
  const db = as(ALICE);
  await assertSucceeds(getDoc(doc(db, "usuarios", ALICE, "rides", "r1")));
  await assertFails(getDoc(doc(as(BOB), "usuarios", ALICE, "rides", "r1")));
  await assertFails(setDoc(doc(db, "usuarios", ALICE, "rides", "r2"), { distanceMeters: 1e6 }));
  await assertSucceeds(getDoc(doc(db, "usuarios", ALICE, "codigos_canjeados", "c1")));
  await assertFails(setDoc(doc(db, "usuarios", ALICE, "codigos_canjeados", "c2"), { code: "FREE" }));
  await assertFails(updateDoc(doc(db, "usuarios", ALICE, "codigos_canjeados", "c1"), { status: "active" }));
});

test("tiendas: catalog readable when signed in, never writable by clients", async () => {
  await assertSucceeds(getDocs(collection(as(BOB), "tiendas")));
  await assertFails(getDocs(collection(as(null), "tiendas")));
  await assertFails(updateDoc(doc(as(ALICE), "tiendas", "t1"), { pointsRequired: 1 }));
});

test("chats: only participants read; messages are server-written only", async () => {
  const id = `${ALICE}__${BOB}`;
  await assertSucceeds(getDoc(doc(as(BOB), "chats", id)));
  await assertFails(getDoc(doc(as("mallory"), "chats", id)));
  await assertSucceeds(getDocs(query(collection(as(ALICE), "chats"), where("participants", "array-contains", ALICE))));
  await assertSucceeds(getDoc(doc(as(ALICE), "chats", id, "messages", "m1")));
  await assertFails(getDoc(doc(as("mallory"), "chats", id, "messages", "m1")));
  await assertFails(setDoc(doc(as(ALICE), "chats", id, "messages", "m2"), { from: ALICE, text: "spoof" }));
  await assertFails(updateDoc(doc(as(ALICE), "chats", id), { participants: [ALICE, "mallory"] }));
});

test("everything else is closed", async () => {
  await assertFails(setDoc(doc(as(ALICE), "usernames", "admin"), { uid: ALICE }));
  await assertFails(getDoc(doc(as(ALICE), "usernames", "alice")));
  await assertFails(getDoc(doc(as(ALICE), "canjes", "x")));
  await assertFails(setDoc(doc(as(ALICE), "anything", "x"), { a: 1 }));
});

test("security: a partner store binding can't be self-assigned", async () => {
  await assertFails(updateDoc(doc(as(ALICE), "usuarios", ALICE), { storeId: "t1" }));
  await assertFails(setDoc(doc(as("dave"), "usuarios", "dave"), { nombre: "Dave", puntosAcumulados: 0, role: "user", storeId: "t1" }));
});

test("security: the public mirror can't claim an unreserved username", async () => {
  const erin = as("erin");
  await assertFails(setDoc(doc(erin, "usuarios_public", "erin"), { username: "admin", nombre: "Erin", puntosAcumulados: 0, amigos: [] }));
  await assertSucceeds(setDoc(doc(erin, "usuarios_public", "erin"), { nombre: "Erin", puntosAcumulados: 0, amigos: [] }));
});

test("security: public photos only from our bucket or Google, names bounded", async () => {
  const db = as(ALICE);
  await assertFails(updateDoc(doc(db, "usuarios_public", ALICE), { profileImageUrl: "https://evil.example/track.gif" }));
  await assertFails(updateDoc(doc(db, "usuarios_public", ALICE), { profileImageUrl: "javascript:alert(1)" }));
  await assertSucceeds(updateDoc(doc(db, "usuarios_public", ALICE), { profileImageUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/avatars%2Falice.jpg" }));
  await assertSucceeds(updateDoc(doc(db, "usuarios_public", ALICE), { profileImageUrl: "https://lh3.googleusercontent.com/a/abc" }));
  await assertSucceeds(updateDoc(doc(db, "usuarios_public", ALICE), { profileImageUrl: null }));
  await assertFails(updateDoc(doc(db, "usuarios_public", ALICE), { nombre: "x".repeat(61) }));
});
