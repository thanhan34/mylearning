import type { Firestore } from 'firebase-admin/firestore';
import { canonicalHash, decodeValue, encodeValue } from './codec';
import { accountTransactionPaths, mutateAccount } from './transaction-core';
import { ACCOUNT_CONTROL_PATH } from './firestore-transaction-adapter';
import type { PreparationReader } from './patch-preparation';
import type { PatchCommitRequest } from './patch-commit';
import { reconstructPatchIntent } from './patch-intent';

export interface TrustedPatchRecoveryContext {
  /** Original immutable server request; never reconstructed from client claims. */
  request: PatchCommitRequest;
  requestHash: string;
  intentBinding: string;
  operationHash: string;
}
export interface RecoveryPrincipal {
  /** Fresh authenticated server session, not query/body fields. */
  actorId: string;
  originVerified: boolean;
}
export type PatchReconciliationResult = { status: 'confirmed'; revision: number }
  | { status: 'unresolved' | 'rejected'; code: string };
export function createFirestorePatchRecoveryReader(db: Firestore): PreparationReader {
  return { readOnly: callback => db.runTransaction(tx => callback(async path => {
    const snap = await tx.get(db.doc(path)); return snap.exists ? snap.data() : undefined;
  }), { readOnly: true }) };
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
const hash = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
/** Read-only proof. No mutation retries, writes, fake receipts, response preview or PII errors.
 * No client-query API: caller must retrieve original context from trusted server storage.
 */
export function createAccountsPatchReconciliation(reader: PreparationReader) {
  return {
    async reconcile(principalInput: RecoveryPrincipal, contextInput: TrustedPatchRecoveryContext): Promise<PatchReconciliationResult> {
      let principal: RecoveryPrincipal, context: TrustedPatchRecoveryContext;
      try {
        principal = decodeValue(encodeValue(principalInput)) as RecoveryPrincipal;
        context = decodeValue(encodeValue(contextInput)) as TrustedPatchRecoveryContext;
        const r = context.request;
        if (principal.originVerified !== true || !principal.actorId || principal.actorId !== r.actor.id || r.actor.role !== 'admin' ||
          r.originVerified !== true) return { status: 'rejected', code: 'NOT_AUTHORIZED' };
        accountTransactionPaths(r.fence.generation, r.body.id);
        accountTransactionPaths(r.fence.generation, principal.actorId);
        if (!hash(context.requestHash) || !hash(context.intentBinding) || !hash(context.operationHash) || !hash(r.sourceHash) ||
          !Number.isSafeInteger(r.expectedRevision) || r.expectedRevision < 0 || r.expectedRevision >= Number.MAX_SAFE_INTEGER ||
          !Number.isSafeInteger(r.fence.epoch) || r.fence.epoch < 1 || typeof r.operationId !== 'string' || !r.operationId || r.operationId.length > 128 ||
          typeof r.auditTime !== 'string' || !Number.isFinite(Date.parse(r.auditTime)) || new Date(r.auditTime).toISOString() !== r.auditTime ||
          context.requestHash !== canonicalHash(r, 1) || context.intentBinding !== context.requestHash ||
          context.operationHash !== canonicalHash(reconstructPatchIntent(r), 1))
          return { status: 'rejected', code: 'INVALID_BINDING' };
      } catch { return { status: 'rejected', code: 'INVALID_BINDING' }; }
      try {
        return await reader.readOnly(async get => {
          const r = context.request, paths = accountTransactionPaths(r.fence.generation, r.body.id);
          // Authorize FIRST, before any target/control lookup. Never reveal target existence to revoked sessions.
          const actor = await get(`users/${principal.actorId}`);
          if (!record(actor) || actor.role !== 'admin') return { status: 'rejected', code: 'NOT_AUTHORIZED' };
          const control = await get(ACCOUNT_CONTROL_PATH);
          if (!record(control) || control.schemaVersion !== 1 || control.codecVersion !== 1 || control.status !== 'ready' ||
            control.activeGeneration !== r.fence.generation || control.epoch !== r.fence.epoch)
            return { status: 'unresolved', code: 'GENERATION_EVIDENCE_UNAVAILABLE' };
          const state = await get(paths.state);
          if (!record(state) || state.lastOperationId !== r.operationId || state.lastOperationHash !== context.operationHash ||
            state.revision !== r.expectedRevision + 1 || state.generation !== r.fence.generation ||
            state.schemaVersion !== 1 || state.codecVersion !== 1 || state.deleted !== false)
            return { status: 'unresolved', code: 'RECEIPT_EVIDENCE_UNAVAILABLE' };
          const intent = reconstructPatchIntent(r);
          const result = await mutateAccount({ runTransaction: callback => callback({
            get: async path => {
              if (!Object.values(paths).includes(path)) throw new Error('OUT_OF_SCOPE');
              return path === paths.state ? state : get(path);
            },
            set: () => { throw new Error('READ_ONLY'); },
            delete: () => { throw new Error('READ_ONLY'); },
          }) }, intent);
          return result.status === 'duplicate' ? { status: 'confirmed', revision: result.revision }
            : { status: 'unresolved', code: 'CONSISTENCY_EVIDENCE_UNAVAILABLE' };
        });
      } catch { return { status: 'unresolved', code: 'READ_EVIDENCE_UNAVAILABLE' }; }
    },
  };
}