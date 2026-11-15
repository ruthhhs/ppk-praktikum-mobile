import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAuth as getReactNativeAuth } from '@react-native-firebase/auth';
import { getFirestore as getReactNativeFirestore } from '@react-native-firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

function getWebApp() {
  if (!isFirebaseConfigured) {
    return null;
  }
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export const app = getWebApp();

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const rnAuth = getReactNativeAuth();
export const rnDb = getReactNativeFirestore();

export function getWebAuth() {
  if (!auth) {
    throw new Error(
      'Firebase Web belum dikonfigurasi. Isi variabel EXPO_PUBLIC_FIREBASE_*.',
    );
  }
  return auth;
}

export function getWebFirestore() {
  if (!db) {
    throw new Error(
      'Firebase Web belum dikonfigurasi. Isi variabel EXPO_PUBLIC_FIREBASE_*.',
    );
  }
  return db;
}
