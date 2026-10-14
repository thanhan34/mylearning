import { adminDb } from './firebase-admin';
import { LearningAccount } from '../learning-access';
import { createHash } from 'crypto';

export async function findAccount(email: string): Promise<LearningAccount | null> {
  const result = await adminDb().collection('users').where('email', '==', email).limit(1).get();
  const doc = result.docs[0];
  return doc ? { ...doc.data(), id: doc.id } as LearningAccount : null;
}

export async function findOrCreateAccount(email: string, name: string): Promise<LearningAccount> {
  const existing = await findAccount(email);
  if (existing) return existing;
  // Sanitizing punctuation is not injective (a.b and a_b can collide).
  // Keep legacy IDs through findAccount; use a stable collision-resistant ID for new accounts.
  const ref = adminDb().collection('users').doc(`user_${createHash('sha256').update(email).digest('hex')}`);
  return adminDb().runTransaction(async transaction => {
    const current = await transaction.get(ref);
    if (current.exists) {
      if (current.data()?.email !== email) throw new Error('Account identity mismatch');
      return { ...current.data(), id: ref.id } as LearningAccount;
    }
    const account = { email, name, role: 'student', approvalStatus: 'pending' as const,
      assignedFeedbackTypes: [], createdAt: new Date().toISOString() };
    transaction.create(ref, account);
    return { ...account, id: ref.id };
  });
}