# Accounts directory PR1 (offline only)

No API, UI, authentication, rules, indexes, database writes or migration are changed.
`lib/accounts/directory.ts` is a pure in-memory model, NOT a Firestore write DTO.

## Parity contract

- Approval delegates to the unchanged `isApproved`. Explicit null/rejected is pending
  for students even with legacy enrollment. Missing/undefined falls back to JS
  truthiness of classId/teacherId. Non-student role behavior is unchanged.
- API view uses `name || ''`, unmodified email/role, and assigned types `|| []`.
- Search interpolates view name + one space + email, then native toLowerCase/includes.
  No trimming, accent removal, Unicode normalization or whitespace collapsing.
- Raw status presence is separate from effective approval. Raw rejected remains
  pending in current UI; no new approval business action is added.
- Contribution retains all roles, student/pending/approved/staff counts and raw
  rejected count. Delta supports creation/deletion/change; it is not a transaction.
- Non-string non-null role values fail explicitly for review, not silent coercion.

## Candidate index

Unique 1/2/3 UTF-16-unit grams are generated locally and hex-encoded per code unit.
This preserves lone surrogates and avoids UTF-8 replacement collisions. Query uses
one leading gram of size min(3, lowercase query length). Empty query has no gram.
Every true substring contains that gram. Candidate matches are NOT sufficient:
verification always uses the original includes expression. No truncation occurs.

For L >= 3, unique count <= 3L-3 before considering repetition. Four array index
configurations multiply unique count by four, plus other entries. JSON UTF-8 bytes
are a warning proxy, not exact Firestore document or index size. Exact entry sizes,
8 MiB aggregate index limit, 1 MiB document limit, document paths and index definitions
must be checked before persistence. Very large inputs still allocate full grams;
there is no production input-budget/overflow implementation in PR1.

## Installed SDK snapshot feasibility

`lib/accounts/snapshot-types.ts` imports SDK types only. TypeScript checks that
runTransaction accepts ReadOnlyTransactionOptions with readOnly:true and readTime.
The regression script reads local package metadata and transaction implementation;
it never constructs Firestore or invokes an SDK transaction.
Installed typings document readTime within 60 seconds. Future cursors need conservative
expiry and an explicit restart flow. Backend behavior, query/aggregate consistency,
historical retention/PITR and emulator support have not been integration-tested.
The official REST TransactionOptions documentation instead describes microsecond
timestamps within one hour (or whole-minute timestamps within seven days with PITR).
The installed SDK comment is therefore not a verified backend retention limit.
Do not finalize cursor TTL based only on that comment; validate the applicable
backend contract before rollout. No PITR configuration is changed here.

## Required decisions before PR2

1. Inventory and synchronize all writers (including client profile names and legacy
   class/teacher changes). Accounts PATCH alone cannot guarantee immediate parity.
2. Specify source updateTime/generation/version checks and transactional summary
   contention behavior. They are intentionally not fabricated in this pure projection.
3. Define a lossless storage codec for missing/undefined fields. JSON drops undefined;
   Firestore cannot accept this raw model as-is. Search text must be computed before
   encoding and decoded view must preserve the original semantics.
4. Specify handling of malformed roles and UI rendering for absent name/email.
5. Validate exact storage/fanout; choose overflow fallback without truncating results.
6. Approve global verified search total cost and snapshot cursor expiry behavior.
7. Reconciliation, idempotent write protocol and rollback require separate PRs.

## Tests

Run `node scripts/test-account-directory.cjs`, existing `test-*.cjs`, and
`npx tsc --noEmit --incremental false`. Test obtains the oracle function directly
from the existing Accounts route without importing/initializing server SDKs.
Seeded generative tests require no new test framework or library.