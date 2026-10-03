import { doc, getDoc } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { api } from "./api";
import { weekKey } from "@/domain/week";
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

export async function searchUserByUsername(username: string): Promise<UserProfile | null> {
  requireFirebase();
  // Server-side lookup: clients can't list usuarios_public (no enumeration),
  // and the server honors "hide me from search".
  const { user: data } = await api<{ user: { uid: string; username: string; nombre: string; apellido: string; profileImageUrl: string | null; points: number } | null }>(
    "friends",
    "POST",
    { action: "search", username }
  );
  if (!data) return null;
  return {
    uid: data.uid,
    email: null,
    displayName: [data.nombre, data.apellido].filter(Boolean).join(" ") || data.username,
    username: data.username,
    photoURL: data.profileImageUrl,
    city: null,
    bikeType: null,
    firstName: data.nombre,
    lastName: data.apellido,
    bio: null,
    birthDate: null,
    gender: null,
    experience: null,
    ridingGoal: null,
    friends: [],
    puntosAcumulados: data.points,
    role: "user",
    createdAt: Date.now(),
    providers: ["password"],
    emailVerified: false,
  };
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
  /** Weekly league points for the current week (0 if none yet this week). */
  weekPoints: number;
}

/** Names/photos for a list of uids, from the public mirror (missing docs fall back to the uid). */
export async function fetchPublicProfiles(uids: string[]): Promise<PublicProfile[]> {
  if (!isFirebaseConfigured || uids.length === 0) return [];
  // One get per uid: the rules only allow reading someone else's public
  // profile by id (no list queries, so profiles can't be enumerated).
  const byId = new Map<string, Record<string, unknown>>();
  await Promise.all(
    [...new Set(uids)].map(async (id) => {
      const d = await getDoc(doc(getDb(), PUBLIC_COLLECTION, id)).catch(() => null);
      if (d?.exists()) byId.set(id, d.data());
    })
  );
  return uids.map((uid, i) => {
    const d: Record<string, any> = byId.get(uid) ?? {};
    const username = (d.username as string | undefined) ?? uids[i].slice(0, 8);
    return {
      uid: uids[i],
      displayName: [d.nombre, d.apellido].filter(Boolean).join(" ") || username,
      username,
      photoURL: (d.profileImageUrl as string | undefined) ?? null,
      points: (d.puntosAcumulados as number | undefined) ?? 0,
      weekPoints: d.weekKey === weekKey(Date.now()) ? ((d.weekPoints as number | undefined) ?? 0) : 0,
    };
  });
}

/** Live availability check for the edit-profile username field. The server re-checks on save. */
export async function isUsernameAvailable(username: string, _myUid: string): Promise<boolean> {
  if (!isFirebaseConfigured) return true;
  const { available } = await api<{ available: boolean }>("friends", "POST", { action: "available", username });
  return available;
}
