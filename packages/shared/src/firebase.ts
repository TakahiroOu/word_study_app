import { initializeApp, type FirebaseApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { getAI, GoogleAIBackend, type AI } from 'firebase/ai'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'

export interface FirebaseHandles {
  app: FirebaseApp
  db: Firestore
  ai: AI
}

let handles: FirebaseHandles | undefined

/**
 * Initialises Firebase once per JS context (side panel, web app, ...).
 * App Check is REQUIRED by Firebase AI Logic. Chrome extensions can't run reCAPTCHA,
 * so they pass a debug token registered in the Firebase console (allowed by the hackathon rules).
 */
export function initFirebase(opts: { appCheckDebugToken?: string } = {}): FirebaseHandles {
  if (handles) return handles
  const env = import.meta.env
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  })

  if (opts.appCheckDebugToken) {
    ;(self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      opts.appCheckDebugToken
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || 'debug-only'),
    isTokenAutoRefreshEnabled: true,
  })

  // Offline-first: captures made without network are cached in IndexedDB and synced later.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  const ai = getAI(app, { backend: new GoogleAIBackend() })

  handles = { app, db, ai }
  return handles
}
