import { initializeApp } from "firebase/app";
import { getAuth, updateProfile } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

export { auth, firestore, storage};


