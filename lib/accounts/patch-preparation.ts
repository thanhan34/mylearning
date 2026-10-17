import type { Firestore } from 'firebase-admin/firestore';
import { EXERCISE_TYPES } from '../learning-access';
import { accountView, AccountSource } from './directory';
import { canonicalHash, CodecError, decodeValue, encodeValue } from './codec';
import { AccountMutation, AccountTransaction, accountTransactionPaths, mutateAccount } from './transaction-core';
import { ACCOUNT_CONTROL_PATH, GenerationFence } from './firestore-transaction-adapter';
import { classifyAdapterError } from './transaction-errors';

export interface PreparationReader {
  readOnly<T>(callback: (get: (path: string) => Promise<unknown>) => Promise<T>): Promise<T>;
}
/** Inert injected Admin binding; preparation cannot stage writes. */
export function createFirestorePreparationReader(db: Firestore): PreparationReader {
  return { readOnly: callback => db.runTransaction(tx => callback(async path => {
    const snap = await tx.get(db.doc(path)); return snap.exists ? snap.data() : undefined;
  }), { readOnly: true }) };
}
export interface PatchPreparationRequest {
  /** Trusted server session context, never values copied from PATCH body. */
  actor: { id: string; role: string };
  originVerified: boolean;
  body: { id: string; action: string; role?: unknown; types?: unknown };
  fence: GenerationFence;
  expectedRevision: number;
  operationId: string;
  /** Stable server timestamp captured once per intent, not inside a retried callback. */
  auditTime: string;
}
export interface PreparationCandidate {
  intent: AccountMutation;
  source: Record<string, unknown>;
  documents: ReadonlyArray<{ path: string; value: unknown }>;
}
export interface PatchPreparationDependencies {
  reader: PreparationReader;
  /** Required pure local policy. Must check ALL prospective documents/index assumptions.
   * Returning ready is preparation-only, never production storage approval.
   */
  preflight(candidate: PreparationCandidate): { status: 'ready' } | { status: 'rejected'; code: string };
}
export type PatchPreparationResult = { status: 'prepared'; intent: AccountMutation;
  responsePreview: { success: true; account: ReturnType<typeof accountView> };
  authorization: { actorId: string; sourceHash: string }; sourceHash: string;
  commitEligible: false; legacyAllowed: false }
  | { status: 'rejected'; code: string; legacyAllowed: false };
class PreparationError extends Error { constructor(public code: string) { super(code); } }
function reject(code: string): never { throw new PreparationError(code); }
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
/** One request-scoped routing gate. Disabled requests may continue their EXISTING legacy
 * handler; no legacy writer is accepted/called here. Once preparation is selected this
 * gate can never authorize legacy, including after failures or unknown outcomes.
 */
export function createAccountsPatchPreparation(deps: PatchPreparationDependencies) {
  let selected = false;
  return {
    legacyDisposition(): { status: 'legacy-only' | 'blocked'; legacyAllowed: boolean } {
      return { status: selected ? 'blocked' : 'legacy-only', legacyAllowed: !selected };
    },
    async prepare(input: PatchPreparationRequest): Promise<PatchPreparationResult> {
      if (selected) return { status: 'rejected', code: 'REQUEST_ALREADY_SELECTED', legacyAllowed: false };
      selected = true;
      try {
        const request = decodeValue(encodeValue(input)) as PatchPreparationRequest;
        if (!request.originVerified) reject('ORIGIN_NOT_VERIFIED');
        if (request.actor?.role !== 'admin') reject('ADMIN_REQUIRED');
        const paths = accountTransactionPaths(request.fence.generation, request.body.id);
        const actorPath = accountTransactionPaths(request.fence.generation, request.actor.id).source;
        if (typeof request.auditTime !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(request.auditTime) ||
          !Number.isFinite(Date.parse(request.auditTime))) reject('INVALID_AUDIT_TIME');
        return await deps.reader.readOnly(async get => {
          const control = await get(ACCOUNT_CONTROL_PATH);
          if (!record(control) || control.schemaVersion !== 1 || control.codecVersion !== 1) reject('SCHEMA_CODEC_MISMATCH');
          if (!Number.isSafeInteger(request.fence.epoch) || request.fence.epoch < 1 || control.activeGeneration !== request.fence.generation ||
            control.epoch !== request.fence.epoch) reject('GENERATION_MISMATCH');
          if (control.status !== 'ready') reject('GENERATION_NOT_READY');
          const actor = await get(actorPath);
          const target = await get(paths.source);
          if (!record(actor) || actor.role !== 'admin') reject('ADMIN_REVOKED');
          if (!record(target)) reject('NOT_FOUND');
          let patch: Record<string, unknown>;
          const body = request.body;
          if (body.action === 'approve' && target.role === 'student') {
            patch = { approvalStatus: 'approved', approvedBy: request.actor.id, approvedAt: request.auditTime };
          } else if (body.action === 'assign-types' && ['teacher', 'assistant'].includes(target.role as string)) {
            if (!Array.isArray(body.types) || body.types.some(type => !EXERCISE_TYPES.includes(type as typeof EXERCISE_TYPES[number]))) reject('INVALID_TYPES');
            patch = { assignedFeedbackTypes: [...new Set(body.types)], permissionsUpdatedBy: request.actor.id, permissionsUpdatedAt: request.auditTime };
          } else if (body.action === 'role' && ['student', 'teacher', 'assistant'].includes(body.role as string) && target.role !== 'admin') {
            patch = { role: body.role, assignedFeedbackTypes: [], approvalStatus: 'pending' };
          } else reject('INVALID_ACTION');
          const intent: AccountMutation = { generation: request.fence.generation, id: body.id, kind: 'update', patch,
            expectedRevision: request.expectedRevision, operationId: request.operationId };
          const documents: { path: string; value: unknown }[] = [];
          const simulation = await mutateAccount({ runTransaction: async callback => {
            let writing = false;
            const tx: AccountTransaction = {
              get: async path => {
                if (writing) reject('READ_AFTER_WRITE');
                if (!Object.values(paths).includes(path)) reject('PATH_OUT_OF_SCOPE');
                return path === paths.source ? target : get(path);
              },
              set: (path, value) => { writing = true; documents.push({ path, value }); },
              delete: () => reject('UNEXPECTED_DELETE'),
            };
            return callback(tx);
          } }, intent);
          if (simulation.status !== 'committed') reject(simulation.status === 'rejected' ? simulation.code :
            simulation.status === 'unknown' ? 'UNKNOWN_COMMIT_OUTCOME' : 'RECEIPT_REQUIRES_RECONCILIATION');
          const source = { ...target, ...patch };
          const check = deps.preflight(decodeValue(encodeValue({ intent, source, documents })) as PreparationCandidate);
          if (check.status !== 'ready') reject('PREFLIGHT_REJECTED');
          return { status: 'prepared', intent, responsePreview: { success: true, account: accountView(body.id, source as AccountSource) },
            authorization: { actorId: request.actor.id, sourceHash: canonicalHash(actor, 1) },
            sourceHash: canonicalHash(target, 1), commitEligible: false, legacyAllowed: false };
        });
      } catch (error) {
        const code = error instanceof PreparationError ? error.code : error instanceof CodecError ? `CODEC_${error.code}` : classifyAdapterError(error, false).code;
        return { status: 'rejected', code, legacyAllowed: false };
      }
    },
  };
}