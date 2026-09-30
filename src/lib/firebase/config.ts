import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  Firestore,
} from 'firebase/firestore'

export const firebaseConfig = {
  apiKey: "AIzaSyA3_yySlgp2lh_DiW3uodNwARrNjrb2g9k",
  authDomain: "camoniku-app.firebaseapp.com",
  projectId: "camoniku-app",
  storageBucket: "camoniku-app.firebasestorage.app",
  messagingSenderId: "1045492686044",
  appId: "1:1045492686044:web:102d2ef124dc034e38a819"
}

// Initialize App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

// Auth
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

// Firestore with offline persistent cache enabled
let firestoreDb: Firestore
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  })
} catch {
  // If already initialized or unsupported
  firestoreDb = getFirestore(app)
}

export const db = firestoreDb
export {
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  type FirebaseUser,
}
