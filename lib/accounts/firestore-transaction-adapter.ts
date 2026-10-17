import type { Firestore } from 'firebase-admin/firestore';
import { canonicalHash, decodeValue, encodeValue } from './codec';
import { AccountMutation, AccountTransaction, AccountTransactionAdapter, accountTransactionPaths, mutateAccount } from './transaction-core';
import { AccountAdapterError, classifyAdapterError, grpcCode } from './transaction-errors';

export const ACCOUNT_CONTROL_PATH = 'accountDirectoryControl/active';
export interface GenerationFence { generation: string; epoch: number }
export interface AccountGenerationControl {
  activeGeneration: string; epoch: number; status: 'ready'; schemaVersion: 1; codecVersion: 1;
}
export type ReconciliationResult = { status: 'confirmed'; revision: number }
  | { status: 'unresolved'; code: string };

function checkControl(raw: unknown, fence: GenerationFence): void {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new AccountAdapterError('CORRUPT_CONTROL', 'not_committed');
  const c = raw as Partial<AccountGenerationControl>;
  if (typeof c.activeGeneration !== 'string' || !Number.isSafeInteger(c.epoch) || c.epoch! < 1)
    throw new AccountAdapterError('CORRUPT_CONTROL', 'not_committed');
  if (c.schemaVersion !== 1 || c.codecVersion !== 1) throw new AccountAdapterError('SCHEMA_CODEC_MISMATCH', 'not_committed');
  if (c.status !== 'ready') throw new AccountAdapterError('GENERATION_NOT_READY', 'not_committed');
  if (c.activeGeneration !== fence.generation || c.epoch !== fence.epoch)
    throw new AccountAdapterError('GENERATION_MISMATCH', 'not_committed');
}

/** Inert until explicitly called with an injected Admin Firestore instance.
 * SDK automatic callback retries disabled; only explicit ABORTED is retried here.
 * No credentials, settings, initialization, logging, activation or repair.
 */
export function createFirestoreAccountAdapter(db: Firestore, fence: GenerationFence,
  options: { maxAbortedAttempts?: number; authorizationActorId?: string } = {}): AccountTransactionAdapter {
  accountTransactionPaths(fence.generation, 'validate');
  const pinned = { generation: fence.generation, epoch: fence.epoch };
  const actorPath = options.authorizationActorId === undefined ? undefined
    : accountTransactionPaths(pinned.generation, options.authorizationActorId).source;
  const attempts = options.maxAbortedAttempts ?? 3;
  if (!Number.isSafeInteger(pinned.epoch) || pinned.epoch < 1 || !Number.isSafeInteger(attempts) || attempts < 1 || attempts > 10)
    throw new AccountAdapterError('CORRUPT_CONTROL', 'not_committed');
  return {
    async runTransaction<T>(callback: (tx: AccountTransaction) => Promise<T>): Promise<T> {
      for (let attempt = 0; attempt < attempts; attempt++) {
        let completedWithWrites = false;
        let callbackFailed = false;
        try {
          return await db.runTransaction(async sdkTx => {
            let open = true, writing = false;
            let scope: ReturnType<typeof accountTransactionPaths> | undefined;
            const checkPath = (path: string, read = false) => {
              if (!open) throw new AccountAdapterError('PATH_OUT_OF_SCOPE', 'not_committed');
              // Additional source authorization read only; never expands writable scope.
              if (read && path === actorPath) return;
              if (!scope) {
                if (!path.startsWith('users/')) throw new AccountAdapterError('PATH_OUT_OF_SCOPE', 'not_committed');
                scope = accountTransactionPaths(pinned.generation, path.slice('users/'.length));
              }
              if (!Object.values(scope).includes(path)) throw new AccountAdapterError('PATH_OUT_OF_SCOPE', 'not_committed');
            };
            try {
              const control = await sdkTx.get(db.doc(ACCOUNT_CONTROL_PATH));
              checkControl(control.exists ? control.data() : undefined, pinned);
              const result = await callback({
                get: async path => {
                  checkPath(path, true);
                  if (writing) throw new AccountAdapterError('READ_AFTER_WRITE', 'not_committed');
                  const snap = await sdkTx.get(db.doc(path));
                  // SDK snapshot.data returns detached data; retain native types so core rejects unsupported legacy values.
                  return snap.exists ? snap.data() : undefined;
                },
                set: (path, value) => {
                  checkPath(path); writing = true;
                  const detached = decodeValue(encodeValue(value)) as Record<string, unknown>;
                  sdkTx.set(db.doc(path), detached);
                },
                delete: path => { checkPath(path); writing = true; sdkTx.delete(db.doc(path)); },
              });
              completedWithWrites = writing;
              return result;
            } catch (error) { callbackFailed = true; throw error; }
            finally { open = false; }
          }, { maxAttempts: 1 });
        } catch (error) {
          if (grpcCode(error) === 10 && attempt + 1 < attempts) continue;
          // Core validation/codec errors must retain their safe structured identity.
          if (callbackFailed && !(error instanceof AccountAdapterError) && grpcCode(error) === undefined) throw error;
          throw classifyAdapterError(error, completedWithWrites);
        }
      }
      throw new AccountAdapterError('TRANSACTION_ABORTED', 'not_committed');
    },
  };
}

/** Explicit read-only proof using the existing latest-operation receipt + full core consistency.
 * No mutation is retried, no receipt is fabricated. Absence, superseded receipt, corrupt
 * state or failed read cannot prove non-commit; return unresolved, never rolled_back.
 * Historical generation is allowed for proof after cutover, but cannot be written.
 */
export async function reconcileAccountOperation(db: Firestore, input: AccountMutation): Promise<ReconciliationResult> {
  try {
    const request = decodeValue(encodeValue(input)) as AccountMutation;
    const paths = accountTransactionPaths(request.generation, request.id);
    const proofOnly: AccountTransactionAdapter = {
      runTransaction: async callback => {
        try {
          return await db.runTransaction(async sdkTx => {
            const raw = await sdkTx.get(db.doc(paths.state));
            const state = raw.exists ? raw.data() : undefined;
            if (!state || state.lastOperationId !== request.operationId || state.lastOperationHash !== canonicalHash(request, 1) ||
              state.revision !== request.expectedRevision + 1) throw new AccountAdapterError('ADAPTER_FAILURE', 'not_committed');
            return callback({
              get: async path => {
                if (!Object.values(paths).includes(path)) throw new AccountAdapterError('PATH_OUT_OF_SCOPE', 'not_committed');
                const snap = await sdkTx.get(db.doc(path)); return snap.exists ? snap.data() : undefined;
              },
              set: () => { throw new AccountAdapterError('ADAPTER_FAILURE', 'not_committed'); },
              delete: () => { throw new AccountAdapterError('ADAPTER_FAILURE', 'not_committed'); },
            });
          }, { readOnly: true });
        } catch (error) {
          if (!(error instanceof AccountAdapterError) && grpcCode(error) === undefined) throw error;
          throw classifyAdapterError(error, false);
        }
      },
    };
    const result = await mutateAccount(proofOnly, request);
    return result.status === 'duplicate' ? { status: 'confirmed', revision: result.revision }
      : { status: 'unresolved', code: result.status === 'rejected' ? result.code : 'UNKNOWN_COMMIT_OUTCOME' };
  } catch (error) {
    return { status: 'unresolved', code: classifyAdapterError(error, false).code };
  }
}