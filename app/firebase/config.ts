import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app';
import { getFirestore, Firestore, initializeFirestore, CACHE_SIZE_UNLIMITED, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { firebaseEmulatorTarget } from '../../lib/firebase-emulator';
import { MOCK_ENABLED } from '../../lib/mock/config';

const emulator = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_TEST === '1' ? firebaseEmulatorTarget({
  enabled: process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_TEST,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  firestore: process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST,
  auth: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,
}) : null;
if (emulator && MOCK_ENABLED) throw new Error('Emulator integration must not use mock mode.');

// Initialize Firebase configuration
const firebaseConfig = MOCK_ENABLED ? { apiKey: 'mock-local-key', projectId: 'demo-learning-local', appId: 'demo-learning-local' } : {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const appName = MOCK_ENABLED ? 'learning-mock' : '[DEFAULT]';
const app = getApps().find(item => item.name === appName) || initializeApp(firebaseConfig, appName);

// Initialize Firestore with optimized settings for real-time updates
const db = MOCK_ENABLED ? ({ __mock: true } as unknown as Firestore) : typeof window !== 'undefined'
  ? initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: false,
    })
  : getFirestore(app);

// Connect before persistence, queries or authentication consumers are exported.
const auth = getAuth(app);
if (process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_TEST === '1' && emulator) {
  const emulatorApps = globalThis as typeof globalThis & { __learningEmulatorApps?: WeakSet<FirebaseApp> };
  const connected = emulatorApps.__learningEmulatorApps ??= new WeakSet<FirebaseApp>();
  if (!connected.has(app)) {
    connectFirestoreEmulator(db, emulator.host, emulator.firestorePort);
    connectAuthEmulator(auth, `http://${emulator.host}:${emulator.authPort}`, { disableWarnings: true });
    connected.add(app);
  }
}

// Enable offline persistence with better error handling
if (!MOCK_ENABLED && !emulator && typeof window !== 'undefined') {
  try {
    const { enableIndexedDbPersistence } = require('firebase/firestore');
    enableIndexedDbPersistence(db)
      .then(() => {
      })
      .catch((err: { code: string; message: string; name: string; stack?: string }) => {
        console.error('Persistence error:', {
          code: err.code,
          message: err.message,
          name: err.name,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
        
        if (err.code === 'failed-precondition') {
          console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
          console.warn('The current browser does not support persistence.');
        }
      });
  } catch (error) {
    console.error('Error enabling persistence:', {
      error,
      timestamp: new Date().toISOString()
    });
  }
}

// Log Firestore initialization

const storage = getStorage(app);




export { db, storage, auth };
