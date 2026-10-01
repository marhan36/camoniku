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

const prodFirebaseConfig = {
  apiKey: "AIzaSyA3_yySlgp2lh_DiW3uodNwARrNjrb2g9k",
  authDomain: "camoniku-app.firebaseapp.com",
  projectId: "camoniku-app",
  storageBucket: "camoniku-app.firebasestorage.app",
  messagingSenderId: "1045492686044",
  appId: "1:1045492686044:web:102d2ef124dc034e38a819",
}

const devFirebaseConfig = {
  apiKey: "AIzaSyCWs6V28P6jU9gI_jfRVFpw81vrWwmXkO8",
  authDomain: "camoniku-app-dev.firebaseapp.com",
  projectId: "camoniku-app-dev",
  storageBucket: "camoniku-app-dev.firebasestorage.app",
  messagingSenderId: "442887357",
  appId: "1:442887357:web:f2c8d3dc4bca9913be9bd4",
}

export const isProduction = import.meta.env.PROD

const baseConfig = isProduction ? prodFirebaseConfig : devFirebaseConfig

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || baseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || baseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || baseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || baseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || baseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || baseConfig.appId,
}

if (!isProduction) {
  console.info(`[Firebase] Initialized dev environment: ${firebaseConfig.projectId}`)
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
