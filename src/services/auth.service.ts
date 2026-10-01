import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { getDb, getFirebaseAuth, getFirebaseStorage, isFirebaseConfigured } from "./firebase";
import { publicMirrorFields } from "@/utils/publicMirror";
import type { AuthProvider, UserProfile } from "@/types/user";

// The real, live collection the shipping mobile app reads/writes — see
// types/user.ts for why this app's UserProfile shape differs from what's
// actually stored here.
const USERS_COLLECTION = "usuarios";

// `usuarios/{uid}` is owner-read-only in the real deployed rules (it holds
// email/identificación/fechaNacimiento) — this project has no Cloud
// Functions to broker cross-user reads, so search/leaderboard read this
// public mirror instead, which only ever holds the fields listed below
// (enforced by the rules' `hasOnly(...)` check too, not just this code).
const PUBLIC_COLLECTION = "usuarios_public";

export async function syncPublicMirror(uid: string, data: Parameters<typeof publicMirrorFields>[0]) {
  await setDoc(doc(getDb(), PUBLIC_COLLECTION, uid), publicMirrorFields(data), { merge: true });
}

function requireFirebase() {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Esta función necesita un proyecto de Firebase configurado (ver ENVIRONMENT.md)."
    );
  }
}

function splitName(fullName: string): { nombre: string; apellido: string } {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return { nombre: trimmed, apellido: "" };
  return { nombre: trimmed.slice(0, spaceIndex), apellido: trimmed.slice(spaceIndex + 1) };
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  requireFirebase();
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  requireFirebase();
  const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  await updateProfile(cred.user, { displayName });
  await sendEmailVerification(cred.user);
  await createUserProfileDoc(cred.user, "password", displayName);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string) {
  requireFirebase();
  const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return cred.user;
}

export async function sendPasswordReset(email: string) {
  requireFirebase();
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function signOut() {
  requireFirebase();
  await firebaseSignOut(getFirebaseAuth());
}

/**
 * Google sign-in via an ID token obtained by the caller through
 * expo-auth-session (see hooks/useGoogleAuth.ts) — kept out of this service
 * so it stays a pure Firebase adapter and doesn't own any UI/browser flow.
 */
export async function signInWithGoogleIdToken(idToken: string) {
  requireFirebase();
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(getFirebaseAuth(), credential);
  await createUserProfileDoc(result.user, "google.com", result.user.displayName ?? "");
  return result.user;
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  return AppleAuthentication.isAvailableAsync();
}

/** Sign in with Apple. Requires a custom dev client / EAS build — not
 * available inside Expo Go. */
export async function signInWithApple() {
  requireFirebase();
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!appleCredential.identityToken) {
    throw new Error("Apple no devolvió un identityToken.");
  }

  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({
    idToken: appleCredential.identityToken,
    rawNonce,
  });

  const result = await signInWithCredential(getFirebaseAuth(), credential);
  const displayName =
    result.user.displayName ??
    [appleCredential.fullName?.givenName, appleCredential.fullName?.familyName]
      .filter(Boolean)
      .join(" ");
  await createUserProfileDoc(result.user, "apple.com", displayName);
  return result.user;
}

async function createUserProfileDoc(user: User, provider: AuthProvider, displayName: string) {
  const docRef = doc(getDb(), USERS_COLLECTION, user.uid);
  const existing = await getDoc(docRef);
  if (existing.exists()) return;

  const { nombre, apellido } = splitName(
    displayName || user.email?.split("@")[0] || "Ciclista"
  );

  const username = (user.email?.split("@")[0] ?? user.uid.slice(0, 8)).toLowerCase();

  // Real `usuarios/{uid}` shape (see types/user.ts) — matches what the
  // mobile app's registration flow writes, so a web signup and a mobile
  // signup produce an identical, mutually-readable document.
  await setDoc(docRef, {
    uid: user.uid,
    email: user.email,
    nombre,
    apellido,
    username,
    profileImageUrl: user.photoURL,
    sexo: "",
    fechaNacimiento: "",
    amigos: [],
    following: [],
    solicitudesPendientes: [],
    puntosAcumulados: 0,
    role: "user",
    cuentaActiva: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    providers: [provider],
  });

  await syncPublicMirror(user.uid, {
    username,
    nombre,
    apellido,
    profileImageUrl: user.photoURL,
    puntosAcumulados: 0,
    amigos: [],
  });
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<
    Pick<UserProfile, "displayName" | "firstName" | "lastName" | "city" | "bikeType" | "photoURL" | "bio" | "birthDate" | "gender" | "experience" | "ridingGoal">
  >
) {
  requireFirebase();
  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.displayName !== undefined) {
    const { nombre, apellido } = splitName(patch.displayName);
    update.nombre = nombre;
    update.apellido = apellido;
  }
  // Legacy field names (nombre/apellido/fechaNacimiento/sexo) keep the old app compatible.
  if (patch.firstName !== undefined) update.nombre = patch.firstName;
  if (patch.lastName !== undefined) update.apellido = patch.lastName;
  if (patch.bio !== undefined) update.bio = patch.bio;
  if (patch.birthDate !== undefined) update.fechaNacimiento = patch.birthDate ?? "";
  if (patch.gender !== undefined) update.sexo = patch.gender ?? "";
  if (patch.experience !== undefined) update.nivelExperiencia = patch.experience;
  if (patch.ridingGoal !== undefined) update.objetivo = patch.ridingGoal;
  if (patch.photoURL !== undefined) update.profileImageUrl = patch.photoURL;
  if (patch.city !== undefined) update.city = patch.city;
  if (patch.bikeType !== undefined) update.bikeType = patch.bikeType;
  await setDoc(doc(getDb(), USERS_COLLECTION, uid), update, { merge: true });

  const nameChanged = patch.displayName !== undefined || patch.firstName !== undefined || patch.lastName !== undefined;
  if (nameChanged || patch.photoURL !== undefined) {
    await syncPublicMirror(uid, {
      ...(update.nombre !== undefined ? { nombre: update.nombre as string } : {}),
      ...(update.apellido !== undefined ? { apellido: update.apellido as string } : {}),
      ...(patch.photoURL !== undefined ? { profileImageUrl: patch.photoURL } : {}),
    });
  }
}

export async function uploadProfilePhoto(uid: string, localUri: string): Promise<string> {
  requireFirebase();
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(getFirebaseStorage(), `avatars/${uid}/photo.jpg`);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  const url = await getDownloadURL(storageRef);
  await updateUserProfile(uid, { photoURL: url });
  return url;
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  requireFirebase();
  const snap = await getDoc(doc(getDb(), USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data();

  const displayName =
    [data.nombre, data.apellido].filter(Boolean).join(" ").trim() ||
    data.nombres || // a few legacy docs used this misspelling instead of `nombre`
    data.username ||
    "Ciclista";

  return {
    uid,
    email: data.email ?? null,
    displayName,
    username: (data.username ?? uid.slice(0, 8)).trim(),
    photoURL: data.profileImageUrl ?? null,
    city: data.city ?? null,
    bikeType: data.bikeType ?? null,
    firstName: (data.nombre ?? data.nombres ?? "").trim(),
    lastName: (data.apellido ?? "").trim(),
    bio: data.bio ?? null,
    birthDate: /^\d{4}-\d{2}-\d{2}$/.test(data.fechaNacimiento ?? "") ? data.fechaNacimiento : null,
    gender: data.sexo || null,
    experience: data.nivelExperiencia ?? null,
    ridingGoal: data.objetivo ?? null,
    friends: data.amigos ?? [],
    puntosAcumulados: data.puntosAcumulados ?? 0,
    role: data.isAdmin === true ? "admin" : data.role ?? "user", // legacy docs use isAdmin
    createdAt: typeof data.createdAt?.toMillis === "function" ? data.createdAt.toMillis() : Date.now(),
    providers: data.providers ?? ["password"],
    emailVerified: data.emailVerified ?? false,
  };
}

export async function resendVerificationEmail() {
  requireFirebase();
  const user = getFirebaseAuth().currentUser;
  if (user) await sendEmailVerification(user);
}

/** Re-reads the Auth user after they clicked the email link; also refreshes
 * the ID token so the server sees email_verified = true. */
export async function reloadEmailVerification(): Promise<boolean> {
  requireFirebase();
  const user = getFirebaseAuth().currentUser;
  if (!user) return false;
  await user.reload();
  await user.getIdToken(true);
  return user.emailVerified;
}

/** Removes the profile photo (Storage object + profile fields). */
export async function removeProfilePhoto(uid: string) {
  requireFirebase();
  await deleteObject(ref(getFirebaseStorage(), `avatars/${uid}/photo.jpg`)).catch(() => {});
  await updateUserProfile(uid, { photoURL: null });
}
