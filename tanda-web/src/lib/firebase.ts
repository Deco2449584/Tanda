import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Configuración Firebase — las variables de entorno deben usar el prefijo NEXT_PUBLIC_
// (ej. NEXT_PUBLIC_FIREBASE_API_KEY en .env.local)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isClient = typeof window !== 'undefined';

function createFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export const app: FirebaseApp = isClient
  ? createFirebaseApp()
  : (null as unknown as FirebaseApp);

export const auth: Auth = isClient
  ? getAuth(app)
  : (null as unknown as Auth);

export const db: Firestore = isClient
  ? getFirestore(app)
  : (null as unknown as Firestore);

export const storage: FirebaseStorage = isClient
  ? getStorage(app)
  : (null as unknown as FirebaseStorage);
