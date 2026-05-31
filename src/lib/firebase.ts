// Firebase App Initialization
// CaseManagement.AI — HIPAA-Compliant Firebase Configuration
// DO NOT log any PHI or config values to the console

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton pattern — safe for hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with persistent multi-tab cache (Firebase v10+ API)
// This replaces the deprecated enableMultiTabIndexedDbPersistence()
let db: ReturnType<typeof getFirestore>;
try {
  if (getApps().length === 1) {
    // First init — use persistentLocalCache with multi-tab manager
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      // Drop `undefined` fields instead of throwing on write. Many call sites
      // pass optional fields as `undefined` (e.g. scheduled-visit linked goal/
      // task/notes), which otherwise fails the entire addDoc/setDoc.
      ignoreUndefinedProperties: true,
    });
  } else {
    db = getFirestore(app);
  }
} catch {
  // Fallback: getFirestore if already initialized
  db = getFirestore(app);
}

export { db };

// Firebase services
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

if (typeof window !== 'undefined') {
  (window as any)._firebaseDb = db;
  (window as any)._firebaseAuth = auth;
}

export default app;
