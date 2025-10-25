import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getFirestore, type Firestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// <CHANGE> Initialize Firebase lazily to avoid SSR issues
let app: FirebaseApp | undefined
let db: Firestore | undefined

export function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("Firebase can only be initialized on the client side")
  }
  
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  }
  
  return app
}

export function getDb(): Firestore {
  if (typeof window === "undefined") {
    throw new Error("Firestore can only be accessed on the client side")
  }
  
  if (!db) {
    const firebaseApp = getFirebaseApp()
    db = getFirestore(firebaseApp)
  }
  
  return db
}

// For backward compatibility
export { app, db }
</parameter>
