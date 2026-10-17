export type AdapterErrorCode = 'PERMISSION_DENIED' | 'TRANSACTION_ABORTED' | 'DEADLINE_EXCEEDED'
  | 'UNAVAILABLE' | 'UNKNOWN_COMMIT_OUTCOME' | 'INVALID_DOCUMENT_OR_INDEX' | 'RESOURCE_EXHAUSTED'
  | 'GENERATION_MISMATCH' | 'GENERATION_NOT_READY' | 'CORRUPT_CONTROL' | 'SCHEMA_CODEC_MISMATCH'
  | 'READ_AFTER_WRITE' | 'PATH_OUT_OF_SCOPE' | 'ADAPTER_FAILURE';
/** Deliberately excludes raw SDK messages, document paths and personal data. */
export class AccountAdapterError extends Error {
  constructor(public readonly code: AdapterErrorCode, public readonly outcome: 'not_committed' | 'unknown',
    public readonly reason?: 'DEADLINE_EXCEEDED' | 'UNAVAILABLE' | 'UNCLASSIFIED') {
    super(code); this.name = 'AccountAdapterError';
  }
}
export function grpcCode(error: unknown): number | undefined {
  const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : undefined;
  if (typeof code === 'number') return code;
  if (typeof code !== 'string') return undefined;
  const names: Record<string, number> = { CANCELLED: 1, UNKNOWN: 2, INVALID_ARGUMENT: 3, DEADLINE_EXCEEDED: 4,
    NOT_FOUND: 5, ALREADY_EXISTS: 6, PERMISSION_DENIED: 7, RESOURCE_EXHAUSTED: 8,
    FAILED_PRECONDITION: 9, ABORTED: 10, OUT_OF_RANGE: 11, UNIMPLEMENTED: 12, INTERNAL: 13,
    UNAVAILABLE: 14, UNAUTHENTICATED: 16 };
  return names[code.toUpperCase().replace(/-/g, '_')];
}
export function classifyAdapterError(error: unknown, commitPossible: boolean): AccountAdapterError {
  if (error instanceof AccountAdapterError) return error;
  const code = grpcCode(error);
  // These server statuses explicitly reject the request. Do not inspect/log SDK error.message.
  if (code === 7 || code === 16) return new AccountAdapterError('PERMISSION_DENIED', 'not_committed');
  if (code === 10) return new AccountAdapterError('TRANSACTION_ABORTED', 'not_committed');
  if (code === 3 || code === 9 || code === 11) return new AccountAdapterError('INVALID_DOCUMENT_OR_INDEX', 'not_committed');
  if (code === 8) return new AccountAdapterError('RESOURCE_EXHAUSTED', 'not_committed');
  if (commitPossible) return new AccountAdapterError('UNKNOWN_COMMIT_OUTCOME', 'unknown',
    code === 4 ? 'DEADLINE_EXCEEDED' : code === 14 ? 'UNAVAILABLE' : 'UNCLASSIFIED');
  return new AccountAdapterError(code === 4 ? 'DEADLINE_EXCEEDED' : code === 14 ? 'UNAVAILABLE' : 'ADAPTER_FAILURE', 'not_committed');
}