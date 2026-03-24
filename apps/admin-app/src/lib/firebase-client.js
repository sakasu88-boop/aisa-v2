import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Admin アプリ用 Firebase 初期化（Auth / Firestore / Storage）
 * Vite: import.meta.env.VITE_*
 * Create React App: process.env.REACT_APP_*
 * Next.js: process.env.NEXT_PUBLIC_* に読み替えてください。
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function assertConfig() {
  const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missing = required.filter((k) => !firebaseConfig[k]);
  if (missing.length) {
    throw new Error(
      `[firebase-client] Missing Firebase env vars (VITE_FIREBASE_*): ${missing.join(', ')}`,
    );
  }
}

function getFirebaseApp() {
  assertConfig();
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

const app = getFirebaseApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export { app };
