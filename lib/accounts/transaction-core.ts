import { AccountSource, CountContribution, contributionDelta, projectAccount } from './directory';
import { canonicalHash, CodecError, decodeDirectory, decodeValue, encodeDirectory, encodeValue, PersistedDirectoryDTO } from './codec';
import { precheckAccountInput } from './input-precheck';
import { AccountAdapterError } from './transaction-errors';

/** Adapter must provide serializable atomic commits, read conflict detection and callback retries.
 * Missing documents are undefined. Returned/staged values must be detached from caller objects.
 * A rejected callback must not publish writes. Adapter rejection may have an unknown commit outcome.
 * No SDK initialization, I/O, clocks or randomness belong in this core.
 */
export interface AccountTransaction {
  get(path: string): Promise<unknown | undefined>;
  set(path: string, value: unknown): void;
  delete(path: string): void;
}
export interface AccountTransactionAdapter {
  runTransaction<T>(callback: (tx: AccountTransaction) => Promise<T>): Promise<T>;
}
export type AccountMutation = {
  generation: string; id: string; operationId: string; expectedRevision: number;
  /** Optional stable server intent context, included in the canonical operation receipt. */
  intentBinding?: string;
} & ({ kind: 'create'; source: Record<string, unknown> }
  | { kind: 'update'; patch: Record<string, unknown>; unset?: string[] }
  | { kind: 'delete' });
export interface AccountState {
  generation: string; schemaVersion: 1; codecVersion: 1; revision: number;
  deleted: boolean; sourceHash: string | null; projectionHash: string | null;
  contribution: CountContribution | null;
  lastOperationId: string; lastOperationHash: string;
}
export interface AccountSummary {
  generation: string; schemaVersion: 1; codecVersion: 1; status: 'ready'; counts: CountContribution;
}
export type MutationResult = { status: 'committed' | 'duplicate'; revision: number; summaryWritten: boolean }
  | { status: 'rejected'; code: string }
  | { status: 'unknown'; code: 'UNKNOWN_COMMIT_OUTCOME'; reason?: string };
class CoreError extends Error { constructor(public code: string) { super(code); } }
function fail(code: string): never { throw new CoreError(code); }
const scalars = ['total', 'students', 'pendingStudents', 'approvedStudents', 'staff', 'rawRejected'] as const;
const maps = ['byRole', 'byRoleApproval'] as const;
function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
function segment(value: unknown): value is string {
  return typeof value === 'string' && !!value && !value.includes('/') && value !== '.' && value !== '..' &&
    !/^__.*__$/.test(value) && Buffer.byteLength(value, 'utf8') <= 1500 && Buffer.from(value).toString('utf8') === value;
}
export function accountTransactionPaths(generation: string, id: string) {
  if (!segment(generation) || !segment(id)) fail('INVALID_PATH');
  const base = `accountDirectoryGenerations/${generation}`;
  return { source: `users/${id}`, entry: `${base}/entries/${id}`, state: `${base}/state/${id}`, summary: `${base}/meta/summary` };
}
export function emptyAccountCounts(): CountContribution {
  return { total: 0, students: 0, pendingStudents: 0, approvedStudents: 0, staff: 0, rawRejected: 0, byRole: {}, byRoleApproval: {} };
}
function validCounts(value: unknown): value is CountContribution {
  if (!plain(value) || Object.keys(value).sort().join() !== [...scalars, ...maps].sort().join()) return false;
  for (const key of scalars) if (!Number.isSafeInteger(value[key]) || (value[key] as number) < 0) return false;
  for (const key of maps) {
    const map = value[key];
    if (!plain(map) || Object.values(map).some(n => !Number.isSafeInteger(n) || (n as number) <= 0)) return false;
    const sum = Object.values(map).reduce<number>((a, n) => a + (n as number), 0);
    if (!Number.isSafeInteger(sum) || sum !== value.total) return false;
  }
  const c = value as unknown as CountContribution;
  return c.students === c.pendingStudents + c.approvedStudents && c.students + c.staff <= c.total && c.rawRejected <= c.total;
}
function same(a: unknown, b: unknown): boolean { return canonicalHash(a, 1) === canonicalHash(b, 1); }
function hasDelta(delta: CountContribution): boolean {
  return scalars.some(key => delta[key] !== 0) || maps.some(key => Object.keys(delta[key]).length !== 0);
}
function addCounts(counts: CountContribution, delta: CountContribution): CountContribution {
  const next = emptyAccountCounts();
  for (const key of scalars) next[key] = counts[key] + delta[key];
  for (const key of maps) {
    next[key] = Object.fromEntries([...new Set([...Object.keys(counts[key]), ...Object.keys(delta[key])])]
      .map(k => [k, (counts[key][k] || 0) + (delta[key][k] || 0)]).filter(([, n]) => n !== 0));
  }
  if (!validCounts(next)) fail('CORRUPT_SUMMARY');
  return next;
}
/** Conservative native source subset: no undefined, SDK classes, sparse/nested arrays or accessors.
 * Codec handles richer projection semantics, but does not authorize unsupported source writes.
 */
function nativeSource(source: unknown): asserts source is Record<string, unknown> {
  if (!plain(source)) fail('UNSUPPORTED_SOURCE');
  encodeValue(source); // Reject descriptors/cycles/classes before accessing any values.
  function visit(value: unknown, parentArray = false): void {
    if (value === undefined) fail('UNSUPPORTED_SOURCE');
    if (Array.isArray(value)) {
      if (parentArray) fail('UNSUPPORTED_SOURCE');
      value.forEach(v => visit(v, true));
    } else if (plain(value)) {
      for (const [key, v] of Object.entries(value)) {
        if (Buffer.from(key).toString('utf8') !== key || Buffer.byteLength(key) > 1500 || /^__.*__$/.test(key)) fail('UNSUPPORTED_SOURCE');
        visit(v);
      }
    } else if (typeof value === 'string' && Buffer.from(value).toString('utf8') !== value) fail('UNSUPPORTED_SOURCE');
  }
  visit(source);
}
function projection(id: string, source: unknown) {
  nativeSource(source);
  const check = precheckAccountInput(source as AccountSource);
  if (check.status !== 'ready') fail(`${check.status.toUpperCase()}:${check.code}`);
  if (source.role !== undefined && source.role !== null && typeof source.role !== 'string') fail('UNSUPPORTED_ROLE');
  const value = projectAccount(id, source);
  return { value, dto: encodeDirectory(value), sourceHash: canonicalHash(source, 1), projectionHash: canonicalHash(value, 1) };
}

export async function mutateAccount(adapter: AccountTransactionAdapter, input: AccountMutation): Promise<MutationResult> {
  try {
    // Snapshot once, before retries, without invoking accessors. No caller mutation can alter retry intent.
    const request = decodeValue(encodeValue(input)) as AccountMutation;
    const paths = accountTransactionPaths(request.generation, request.id);
    if (!['create', 'update', 'delete'].includes(request.kind) || typeof request.operationId !== 'string' ||
      !request.operationId || request.operationId.length > 128 || !Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) fail('INVALID_REQUEST');
    if (request.kind === 'create') nativeSource(request.source);
    if (request.kind === 'update') {
      if (!plain(request.patch) || (request.unset !== undefined && (!Array.isArray(request.unset) || request.unset.some(k => typeof k !== 'string')))) fail('INVALID_REQUEST');
    }
    const operationHash = canonicalHash(request, 1);
    return await adapter.runTransaction(async tx => {
      // Fixed four reads. Adapter must register even absent documents in the read set.
      const source = await tx.get(paths.source);
      const entry = await tx.get(paths.entry);
      const rawState = await tx.get(paths.state);
      const rawSummary = await tx.get(paths.summary);
      if (!plain(rawSummary) || rawSummary.generation !== request.generation || rawSummary.status !== 'ready') fail('GENERATION_NOT_READY');
      if (rawSummary.schemaVersion !== 1 || rawSummary.codecVersion !== 1) fail('SCHEMA_CODEC_MISMATCH');
      if (!validCounts(rawSummary.counts)) fail('CORRUPT_SUMMARY');
      const summary = rawSummary as unknown as AccountSummary;
      let state: AccountState | undefined;
      if (rawState !== undefined) {
        if (plain(rawState) && (rawState.schemaVersion !== 1 || rawState.codecVersion !== 1)) fail('SCHEMA_CODEC_MISMATCH');
        if (!plain(rawState) || rawState.generation !== request.generation || rawState.schemaVersion !== 1 || rawState.codecVersion !== 1 ||
          !Number.isSafeInteger(rawState.revision) || (rawState.revision as number) < 1 || typeof rawState.deleted !== 'boolean' ||
          typeof rawState.lastOperationId !== 'string' || !rawState.lastOperationId || typeof rawState.lastOperationHash !== 'string' ||
          !/^[0-9a-f]{64}$/.test(rawState.lastOperationHash)) fail('CORRUPT_STATE');
        state = rawState as unknown as AccountState;
        if (state.deleted) {
          if (source !== undefined || entry !== undefined || state.contribution !== null || state.sourceHash !== null || state.projectionHash !== null) fail('CORRUPT_STATE');
        } else {
          if (source === undefined || entry === undefined || !validCounts(state.contribution)) fail('CORRUPT_STATE');
          const before = projection(request.id, source);
          if (state.sourceHash !== before.sourceHash || state.projectionHash !== before.projectionHash ||
            !same(state.contribution, before.value.contribution) || !same(decodeDirectory(entry as PersistedDirectoryDTO), before.value)) fail('STATE_SOURCE_MISMATCH');
        }
      } else if (source !== undefined || entry !== undefined) fail('MISSING_STATE');
      // Check current consistency before accepting a duplicate receipt.
      if (state?.lastOperationId === request.operationId) {
        if (state.lastOperationHash !== operationHash) fail('OPERATION_ID_REUSED');
        return { status: 'duplicate', revision: state.revision, summaryWritten: false };
      }
      const revision = state?.revision || 0;
      if (request.expectedRevision !== revision) fail('REVISION_CONFLICT');
      if (revision >= Number.MAX_SAFE_INTEGER) fail('REVISION_OVERFLOW');
      const exists = source !== undefined;
      if (request.kind === 'create' && exists) fail('ALREADY_EXISTS');
      if (request.kind !== 'create' && !exists) fail('NOT_FOUND');
      let nextSource: Record<string, unknown> | undefined;
      if (request.kind === 'create') nextSource = request.source;
      if (request.kind === 'update') {
        nextSource = { ...(source as Record<string, unknown>), ...request.patch };
        for (const key of request.unset || []) delete nextSource[key];
      }
      const after = nextSource === undefined ? undefined : projection(request.id, nextSource);
      const delta = contributionDelta(state?.contribution || null, after?.value.contribution || null);
      const summaryWritten = hasDelta(delta);
      const nextCounts = addCounts(summary.counts, delta);
      const nextState: AccountState = { generation: request.generation, schemaVersion: 1, codecVersion: 1,
        revision: revision + 1, deleted: !after, sourceHash: after?.sourceHash || null,
        projectionHash: after?.projectionHash || null, contribution: after?.value.contribution || null,
        lastOperationId: request.operationId, lastOperationHash: operationHash };
      // All reads, validation and calculations are complete before staging the first write.
      if (after) { tx.set(paths.source, nextSource); tx.set(paths.entry, after.dto); }
      else { tx.delete(paths.source); tx.delete(paths.entry); }
      tx.set(paths.state, nextState);
      if (summaryWritten) tx.set(paths.summary, { ...summary, counts: nextCounts });
      return { status: 'committed', revision: nextState.revision, summaryWritten };
    });
  } catch (error) {
    if (error instanceof AccountAdapterError) return error.outcome === 'unknown'
      ? { status: 'unknown', code: 'UNKNOWN_COMMIT_OUTCOME', reason: error.reason }
      : { status: 'rejected', code: error.code };
    if (error instanceof CoreError) return { status: 'rejected', code: error.code };
    if (error instanceof CodecError) return { status: 'rejected', code: `CODEC_${error.code}` };
    // Do not report success after adapter failure. A real adapter must distinguish ambiguous commits.
    return { status: 'rejected', code: 'ADAPTER_FAILURE' };
  }
}