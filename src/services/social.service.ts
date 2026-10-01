import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { api } from "./api";
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
    if (data.buscable === false) return null; // user chose not to appear in search
    return {
      uid: snap.docs[0].id,
      email: null,
      displayName: [data.nombre, data.apellido].filter(Boolean).join(" ") || data.username,
      username: data.username,
      photoURL: data.profileImageUrl ?? null,
      city: null,
      bikeType: null,
      firstName: data.nombre ?? "",
      lastName: data.apellido ?? "",
      bio: null,
      birthDate: null,
      gender: null,
      experience: null,
      ridingGoal: null,
      friends: data.amigos ?? [],
      puntosAcumulados: data.puntosAcumulados ?? 0,
      role: "user",
      createdAt: Date.now(),
      providers: ["password"],
      emailVerified: false,
    };
  });
}

// Friendship writes touch two users, so they go through the server
// (api/friends.js); firestore.rules block clients from editing amigos /
// solicitudesPendientes directly.
export async function sendFriendRequest(_fromUid: string, toUid: string) {
  requireFirebase();
  return api<{ status: string }>("friends", "POST", { action: "request", uid: toUid });
}

export async function acceptFriendRequest(_uid: string, requesterUid: string) {
  requireFirebase();
  await api("friends", "POST", { action: "accept", uid: requesterUid });
}

export async function rejectFriendRequest(_uid: string, requesterUid: string) {
  requireFirebase();
  await api("friends", "POST", { action: "reject", uid: requesterUid });
}

export async function removeFriend(_uid: string, friendUid: string) {
  requireFirebase();
  await api("friends", "POST", { action: "remove", uid: friendUid });
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

export interface PublicProfile {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string | null;
  points: number;
}

/** Names/photos for a list of uids, from the public mirror (missing docs fall back to the uid). */
export async function fetchPublicProfiles(uids: string[]): Promise<PublicProfile[]> {
  if (!isFirebaseConfigured || uids.length === 0) return [];
  const snaps = await Promise.all(uids.map((u) => getDoc(doc(getDb(), PUBLIC_COLLECTION, u)).catch(() => null)));
  return snaps.map((snap, i) => {
    const d = snap?.data() ?? {};
    const username = (d.username as string | undefined) ?? uids[i].slice(0, 8);
    return {
      uid: uids[i],
      displayName: [d.nombre, d.apellido].filter(Boolean).join(" ") || username,
      username,
      photoURL: (d.profileImageUrl as string | undefined) ?? null,
      points: (d.puntosAcumulados as number | undefined) ?? 0,
    };
  });
}

/** Live availability check for the edit-profile username field. The server re-checks on save. */
export async function isUsernameAvailable(username: string, myUid: string): Promise<boolean> {
  if (!isFirebaseConfigured) return true;
  const snap = await getDocs(query(collection(getDb(), PUBLIC_COLLECTION), where("username", "==", username.toLowerCase()), limit(2)));
  return snap.docs.every((d) => d.id === myUid);
}
