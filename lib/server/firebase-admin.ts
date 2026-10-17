import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { MOCK_ENABLED } from '../mock/config';
import { mockAdminDb } from '../mock/adapter';
import { firebaseEmulatorTarget } from '../firebase-emulator';

export function adminApp() {
  const emulator = firebaseEmulatorTarget({
    enabled: process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_TEST,
    projectId: process.env.FIREBASE_PROJECT_ID,
    firestore: process.env.FIRESTORE_EMULATOR_HOST,
    auth: process.env.FIREBASE_AUTH_EMULATOR_HOST,
  });
  if (emulator) {
    if (MOCK_ENABLED || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== emulator.projectId
      || process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST !== process.env.FIRESTORE_EMULATOR_HOST
      || process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST !== process.env.FIREBASE_AUTH_EMULATOR_HOST
      || ['FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_APPLICATION_CREDENTIALS'].some(key => process.env[key])) {
      throw new Error('Unsafe Firebase local-test environment.');
    }
    return getApps().find(app => app.name === 'learning-server')
      || initializeApp({ projectId: emulator.projectId }, 'learning-server');
  }
  const existing = getApps().find(app => app.name === 'learning-server');
  if (existing) return existing;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!!process.env.FIREBASE_CLIENT_EMAIL !== !!process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('Configure FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY together.');
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n');
  return initializeApp({
    projectId,
    credential: clientEmail && privateKey ? cert({ projectId, clientEmail, privateKey }) : applicationDefault(),
  }, 'learning-server');
}

export const adminDb = (): ReturnType<typeof getFirestore> => MOCK_ENABLED
  ? mockAdminDb as unknown as ReturnType<typeof getFirestore> : getFirestore(adminApp());
export const adminAuth = () => {
  if (MOCK_ENABLED) throw new Error('Firebase Auth is disabled in mock mode. Use the demo login.');
  return getAuth(adminApp());
};