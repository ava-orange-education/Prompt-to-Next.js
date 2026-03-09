/**
 * lib/firebase.ts
 *
 * Initialises the Firebase app only when all required env vars are present.
 * When env vars are missing (e.g. during development) the exports are null,
 * and the useAnalytics hook falls back to mock / simulated data automatically.
 *
 * To connect to real Firestore:
 *   1. Add a Firebase project at https://console.firebase.google.com
 *   2. Go to Project Settings → Your apps → Web app → SDK setup
 *   3. Add the following env vars to your project (Vars tab in the top-right settings):
 *        NEXT_PUBLIC_FIREBASE_API_KEY
 *        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *        NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 *        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *        NEXT_PUBLIC_FIREBASE_APP_ID
 *   4. Create a "analytics" collection in Firestore with documents shaped as:
 *        { category: string, metric: number, collectedAt: Timestamp }
 *   5. Set isUsingMock = false in hooks/use-analytics.ts to enable the live path.
 */

import { getApps, initializeApp, getApp, type FirebaseApp } from "firebase/app"
import { getFirestore, type Firestore } from "firebase/firestore"

const {
  NEXT_PUBLIC_FIREBASE_API_KEY: apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: authDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: storageBucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: messagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: appId,
} = process.env

export const isFirebaseConfigured =
  Boolean(apiKey) &&
  Boolean(authDomain) &&
  Boolean(projectId) &&
  Boolean(storageBucket) &&
  Boolean(messagingSenderId) &&
  Boolean(appId)

let app: FirebaseApp | null = null
let db: Firestore | null = null

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp({ apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId })
  db = getFirestore(app)
}

export { app, db }
