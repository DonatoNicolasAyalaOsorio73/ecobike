import { Platform } from "react-native";
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "REMOVED_GOOGLE_API_KEY",
  authDomain: "ecobike-9dedd.firebaseapp.com",
  projectId: "ecobike-9dedd",
  storageBucket: "ecobike-9dedd.appspot.com",
  messagingSenderId: "447898019772",
  appId: "1:447898019772:web:33c56ef8b48dd75208edb9",
  measurementId: "G-FT7RNLZKHV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// On React Native, Auth must be initialized with AsyncStorage persistence so the
// session survives app restarts. On web, getAuth uses browser persistence.
let auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Already initialized (e.g. Fast Refresh) — reuse the existing instance.
    auth = getAuth(app);
  }
}

const firestore = getFirestore(app);
const storage = getStorage(app);

export { auth, firestore, storage };


