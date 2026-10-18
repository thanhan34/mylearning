import type { Firestore } from 'firebase-admin/firestore';
import { EXERCISE_TYPES } from '../learning-access';
import { accountView } from './directory';
import { canonicalHash, CodecError, decodeValue, encodeValue } from './codec';
import { AccountMutation, AccountTransactionAdapter, accountTransactionPaths, mutateAccount } from './transaction-core';
import { createFirestoreAccountAdapter } from './firestore-transaction-adapter';
import { classifyAdapterError } from './transaction-errors';
import type { PatchPreparationRequest, PatchPreparationDependencies } from './patch-preparation';
import { reconstructPatchIntent } from './patch-intent';

export interface PatchCommitRequest extends PatchPreparationRequest {
  /** Optimistic target binding only, never an authorization credential. */
  sourceHash: string;
}
export interface PatchCommitDependencies {
  /** Must fence generation/epoch in the same transaction, permit actor SOURCE read,
   * scope writes to target and report ambiguous outcomes. No nested transactions.
   */
  adapter(request: PatchCommitRequest): AccountTransactionAdapter;
  preflight: PatchPreparationDependencies['preflight'];
}
export type PatchCommitResult = { status: 'confirmed'; duplicate: boolean; revision: number;
  response: { success: true; account: ReturnType<typeof accountView> }; legacyAllowed: false }
  | { status: 'rejected' | 'unknown'; code: string; legacyAllowed: false };
class CommitError extends Error { constructor(public code: string) { super(code); } }
function fail(code: string): never { throw new CommitError(code); }
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
/** Explicit DI binding only. Factory does not create SDK instances or perform I/O. */
export function createFirestorePatchCommitDependencies(db: Firestore,
  preflight: PatchPreparationDependencies['preflight']): PatchCommitDependencies {
  return { preflight, adapter: request => createFirestoreAccountAdapter(db, request.fence,
    { authorizationActorId: request.actor.id }) };
}
/** One request-scoped selection. No legacy writer, no automatic reconciliation/retry
 * after unknown, no production activation. Boundary must supply verified origin/session.
 */
export function createAccountsPatchCommit(deps: PatchCommitDependencies) {
  let selected = false;
  return {
    async commit(input: PatchCommitRequest): Promise<PatchCommitResult> {
      if (selected) return { status: 'rejected', code: 'REQUEST_ALREADY_SELECTED', legacyAllowed: false };
      selected = true;
      try {
        const request = decodeValue(encodeValue(input)) as PatchCommitRequest;
        if (request.originVerified !== true) fail('ORIGIN_NOT_VERIFIED');
        if (request.actor?.role !== 'admin') fail('ADMIN_REQUIRED');
        if (!/^[0-9a-f]{64}$/.test(request.sourceHash)) fail('INVALID_SOURCE_HASH');
        if (typeof request.auditTime !== 'string' || !Number.isFinite(Date.parse(request.auditTime)) ||
          new Date(request.auditTime).toISOString() !== request.auditTime) fail('INVALID_AUDIT_TIME');
        const paths = accountTransactionPaths(request.fence.generation, request.body.id);
        const actorPath = accountTransactionPaths(request.fence.generation, request.actor.id).source;
        // Only outer runTransaction resolution constitutes commit evidence. Preview is never consumed.
        const confirmed = await deps.adapter(request).runTransaction(async tx => {
          const actor = await tx.get(actorPath);
          const target = await tx.get(paths.source);
          if (!record(actor) || actor.role !== 'admin') fail('ADMIN_REVOKED');
          if (!record(target)) fail('NOT_FOUND');
          const body = request.body;
          let patch: Record<string, unknown>;
          if (body.action === 'approve' && target.role === 'student')
            patch = { approvalStatus: 'approved', approvedBy: request.actor.id, approvedAt: request.auditTime };
          else if (body.action === 'assign-types' && ['teacher', 'assistant'].includes(target.role as string)) {
            if (!Array.isArray(body.types) || body.types.some(t => !EXERCISE_TYPES.includes(t as typeof EXERCISE_TYPES[number]))) fail('INVALID_TYPES');
            patch = { assignedFeedbackTypes: [...new Set(body.types)], permissionsUpdatedBy: request.actor.id, permissionsUpdatedAt: request.auditTime };
          } else if (body.action === 'role' && target.role !== 'admin' && ['student', 'teacher', 'assistant', 'admin_support'].includes(body.role as string))
            patch = { role: body.role, assignedFeedbackTypes: [], approvalStatus: 'pending' };
          else fail('INVALID_ACTION');
          const intent: AccountMutation = reconstructPatchIntent(request);
          const state = await tx.get(paths.state);
          const receiptMatch = record(state) && state.lastOperationId === request.operationId &&
            state.lastOperationHash === canonicalHash(intent, 1) && state.revision === request.expectedRevision + 1;
          if (!receiptMatch && canonicalHash(target, 1) !== request.sourceHash) fail('TARGET_CHANGED');
          const documents: { path: string; value: unknown }[] = [];
          const result = await mutateAccount({ runTransaction: callback => callback({
            get: path => tx.get(path),
            set: (path, value) => { documents.push({ path, value }); },
            delete: () => fail('UNEXPECTED_DELETE'),
          }) }, intent);
          if (result.status === 'rejected') fail(result.code);
          if (result.status === 'unknown') fail('UNKNOWN_COMMIT_OUTCOME');
          const source = result.status === 'duplicate' ? target : { ...target, ...patch };
          const candidate = decodeValue(encodeValue({ intent, source, documents })) as Parameters<typeof deps.preflight>[0];
          if (result.status !== 'duplicate' && deps.preflight(candidate).status !== 'ready') fail('PREFLIGHT_REJECTED');
          // All reads/core validation/preflight and response calculation precede staging.
          const account = accountView(body.id, source);
          for (const doc of documents) tx.set(doc.path, doc.value);
          return { duplicate: result.status === 'duplicate', revision: result.revision, account };
        });
        return { status: 'confirmed', duplicate: confirmed.duplicate, revision: confirmed.revision,
          response: { success: true, account: confirmed.account }, legacyAllowed: false };
      } catch (error) {
        if (error instanceof CommitError || error instanceof CodecError)
          return { status: 'rejected', code: error instanceof CommitError ? error.code : `CODEC_${error.code}`, legacyAllowed: false };
        const safe = classifyAdapterError(error, true);
        return { status: safe.outcome === 'unknown' ? 'unknown' : 'rejected', code: safe.code, legacyAllowed: false };
      }
    },
  };
}