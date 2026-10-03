import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
// The "firebase" umbrella package's ./auth export map has no "react-native"
// condition for this SDK version, so the RN persistence helper has to come
// from the underlying @firebase/auth package directly (it does declare that
// condition) instead of the usual `firebase/auth` import.
import { getReactNativePersistence } from "@firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/**
 * EcoBike works fully offline (local rides, stats, history) without any of
 * this configured — cloud sync, auth, and social features simply stay
 * disabled until a real Firebase project is provided via .env. This flag is
 * what every online-only screen checks before calling Firebase APIs. See
 * ENVIRONMENT.md for setup instructions.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function ensureApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase no está configurado. Copia .env.example a .env con tu proyecto de Firebase."
    );
  }
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const firebaseApp = ensureApp();
    authInstance =
      Platform.OS === "web"
        ? getAuth(firebaseApp)
        : initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
  }
  return authInstance;
}

export function getDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(ensureApp());
  return dbInstance;
}
