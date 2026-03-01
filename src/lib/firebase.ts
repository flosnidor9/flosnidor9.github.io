import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBMhKyV3nCnYA72FRI4ZjyAuhKQUpp0tHM",
  authDomain: "personalhome-c1a88.firebaseapp.com",
  projectId: "personalhome-c1a88",
  storageBucket: "personalhome-c1a88.firebasestorage.app",
  messagingSenderId: "1015978245946",
  appId: "1:1015978245946:web:90a64c73dbc55f21d55a03"
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };
