import { EXERCISE_TYPES } from '../learning-access';
import { canonicalHash } from './codec';
import type { AccountMutation } from './transaction-core';
import type { PatchCommitRequest } from './patch-commit';

/** Pure reconstruction of stable server intent. Does NOT authorize or validate target eligibility. */
export function reconstructPatchIntent(request: PatchCommitRequest): AccountMutation {
  const body = request.body;
  let patch: Record<string, unknown>;
  if (body.action === 'approve')
    patch = { approvalStatus: 'approved', approvedBy: request.actor.id, approvedAt: request.auditTime };
  else if (body.action === 'assign-types' && Array.isArray(body.types) &&
    body.types.every(t => EXERCISE_TYPES.includes(t as typeof EXERCISE_TYPES[number])))
    patch = { assignedFeedbackTypes: [...new Set(body.types)], permissionsUpdatedBy: request.actor.id, permissionsUpdatedAt: request.auditTime };
  else if (body.action === 'role' && ['student', 'teacher', 'assistant', 'admin_support'].includes(body.role as string))
    patch = { role: body.role, assignedFeedbackTypes: [], approvalStatus: 'pending' };
  else throw new Error('INVALID_ACTION');
  return { generation: request.fence.generation, id: body.id, kind: 'update', patch,
    expectedRevision: request.expectedRevision, operationId: request.operationId, intentBinding: canonicalHash(request, 1) };
}