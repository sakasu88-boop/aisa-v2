import { initializeApp, getApps, getApp } from 'firebase/app';

/**
 * カスタマー向け: firebase/app のみ（Auth / Firestore / Storage SDK は import しない）
 * 検索は Algolia、マップ画像は Storage の HTTPS URL をそのまま利用する想定。
 * Analytics 等を足す場合も firebase/app 以外は必要なモジュールだけ追加する。
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
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error(
      '[firebase-client] Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID.',
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

export { app };
