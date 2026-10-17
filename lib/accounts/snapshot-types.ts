// Type-only feasibility check: no SDK runtime import, initialization, or RPC.
import type { Firestore, Timestamp, ReadOnlyTransactionOptions } from 'firebase-admin/firestore';

export function accountSnapshotOptions(readTime: Timestamp): ReadOnlyTransactionOptions {
  return { readOnly: true, readTime };
}
// TypeScript checks the installed Admin SDK runTransaction signature accepts these options.
export type SnapshotTransaction = (db: Firestore, readTime: Timestamp) => Promise<unknown>;
export const checkSnapshotSignature: SnapshotTransaction = (db, readTime) =>
  db.runTransaction(async () => undefined, accountSnapshotOptions(readTime));