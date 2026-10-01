import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, limit, query, updateDoc, where } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { syncPublicMirror } from "./auth.service";
import type { UserProfile } from "@/types/user";

// Real, live collection — see types/user.ts and auth.service.ts for the
// legacy-schema mapping this whole file works against.
const USERS_COLLECTION = "usuarios";
// Cross-user reads (search, leaderboard) go through this public mirror
// instead — `usuarios/{uid}` is owner-read-only in the deployed rules.
const PUBLIC_COLLECTION = "usuarios_public";

function requireFirebase() {
  if (!isFirebaseConfigured) {
    throw new Error("La función social necesita un proyecto de Firebase configurado.");
  }
}

/**
 * IMPORTANT: the real, deployed `usuarios/{uid}` security rule is
 * `allow read: if isOwner(uid)` — only a user's own document is readable.
 * That means searching, viewing, or comparing another user's profile from
 * a plain client can come back permission-denied depending on how the
 * project's rules are configured; this isn't a bug in this app, it's the
 * live project's current rules. Every function here surfaces that as a
 * clear message instead of a raw Firestore error or a silent no-op.
 */
function friendlyDenied(): never {
  throw new Error("Esta función social necesita permisos adicionales en las reglas de Firebase del proyecto (ver SECURITY.md).");
}

async function tryOrExplain<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    if (e?.code === "permission-denied") friendlyDenied();
    throw e;
  }
}

export async function searchUserByUsername(username: string): Promise<UserProfile | null> {
  requireFirebase();
  return tryOrExplain(async () => {
    const q = query(collection(getDb(), PUBLIC_COLLECTION), where("username", "==", username.toLowerCase()), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return {
      uid: snap.docs[0].id,
      email: null,
      displayName: [data.nombre, data.apellido].filter(Boolean).join(" ") || data.username,
      username: data.username,
      photoURL: data.profileImageUrl ?? null,
      city: null,
      bikeType: null,
      friends: data.amigos ?? [],
      puntosAcumulados: data.puntosAcumulados ?? 0,
      role: "user",
      createdAt: Date.now(),
      providers: ["password"],
      emailVerified: false,
    };
  });
}

export async function sendFriendRequest(_fromUid: string, toUid: string) {
  requireFirebase();
  return tryOrExplain(async () => {
    // Only the recipient can normally write their own doc, so a request has
    // to land as a self-write the recipient's client makes after seeing it
    // through some out-of-band channel (e.g. a Cloud Function) — a plain
    // client can't append to *another* user's `solicitudesPendientes` under
    // the real rules. Attempting the direct write anyway surfaces that
    // clearly rather than pretending this works.
    await updateDoc(doc(getDb(), USERS_COLLECTION, toUid), {
      solicitudesPendientes: arrayUnion(_fromUid),
    });
  });
}

export async function acceptFriendRequest(uid: string, requesterUid: string) {
  requireFirebase();
  return tryOrExplain(async () => {
    const db = getDb();
    await updateDoc(doc(db, USERS_COLLECTION, uid), {
      amigos: arrayUnion(requesterUid),
      solicitudesPendientes: arrayRemove(requesterUid),
    });
    // Mutual linking on the OTHER user's doc requires write access this
    // client doesn't have under `allow update: if isOwner(uid)` — that side
    // needs a Cloud Function with Admin privileges (not deployed on this
    // project yet; see ENVIRONMENT.md). The accepting user's own side above
    // still succeeds and is what makes "amigos" show up for them.
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    await syncPublicMirror(uid, { amigos: (snap.data()?.amigos as string[] | undefined) ?? [] });
  });
}

export async function removeFriend(uid: string, friendUid: string) {
  requireFirebase();
  return tryOrExplain(async () => {
    const db = getDb();
    await updateDoc(doc(db, USERS_COLLECTION, uid), { amigos: arrayRemove(friendUid) });
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    await syncPublicMirror(uid, { amigos: (snap.data()?.amigos as string[] | undefined) ?? [] });
  });
}

export async function listFriendUids(uid: string): Promise<string[]> {
  requireFirebase();
  const snap = await getDoc(doc(getDb(), USERS_COLLECTION, uid));
  return (snap.data()?.amigos as string[] | undefined) ?? [];
}

export async function listIncomingFriendRequests(uid: string): Promise<{ from: string }[]> {
  requireFirebase();
  const snap = await getDoc(doc(getDb(), USERS_COLLECTION, uid));
  const pending = (snap.data()?.solicitudesPendientes as string[] | undefined) ?? [];
  return pending.map((from) => ({ from }));
}
