import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { MOCK_ENABLED } from '../mock/config';
import { mockAdminDb } from '../mock/adapter';

export function adminApp() {
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