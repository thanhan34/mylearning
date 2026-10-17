# PR2B.4B — read-only Accounts commit proof / recovery preparation

No route/UI activation, Firebase initialization, production access, receipts writes,
mutation retries, legacy fallback, deploy/migration, or Rules/Profile/Login changes.
PR2B.5 is not started. Emulator/staging remains unverified.

## API / trust model

`createAccountsPatchReconciliation(reader).reconcile(principal, context)`:

- principal: fresh trusted SERVER session actorId and originVerified.
- context: immutable original PatchCommitRequest, requestHash, intentBinding and
  operationHash, retrieved from trusted SERVER request storage, never client body.
- `createFirestorePatchRecoveryReader(db)` injects Admin Firestore, performs no I/O
  at construction, uses a single runTransaction with readOnly:true and exposes ONLY get.
- No endpoint or context store is added. Hashes are integrity bindings, not signatures
  or authentication tokens. A caller able to forge server context can recompute them;
  authenticated context ownership/storage must be designed before API activation.
- No account data, responsePreview, email, name, feedback, raw paths or SDK error text
  is returned in result/errors. Confirmed returns revision only.

## Result contract

- confirmed {revision}: complete current proof; no new mutation or writes occurred.
- unresolved {code}: receipt missing/replaced, hash/revision mismatch at receipt,
  generation evidence unavailable, corrupt source/entry/state/summary, unsupported
  legacy, or read/network failure. NEVER implies failed/rolledBack/not committed.
- rejected {code}: invalid original context/binding or unauthorized principal/source.

## Required proof

1. Snapshot arguments through codec; validate paths, canonical auditTime, bounded
   operation ID, expectedRevision, epoch and hash formats.
2. Principal matches original actor, origin verified, original session role admin.
   Original request hash equals canonicalHash(request,1); intentBinding equals that
   hash; operationHash equals canonicalHash(reconstructed intent,1).
3. In SAME read-only snapshot, read actor SOURCE first, require role exactly admin.
   Revoked/missing actor returns identical NOT_AUTHORIZED without any target/control
   reads. Different principal rejects before I/O. Never authorize via read model.
4. Control must match original generation AND epoch, ready, schema/codec=1. After
   cutover return unresolved, even if historical receipt remains: no epoch history
   exists to validate independently. No generation activation/repair.
5. State must match generation, schema/codec, live status, exact operation ID,
   canonical operation hash and expectedRevision+1.
6. Reuse core duplicate validation in a proof-only adapter WITHIN the same reader:
   reads source/entry/state/summary, validates source/projection hashes, decoded DTO,
   contribution and summary structure. Any attempted set/delete throws. Only duplicate
   result confirms. Source looking correct or a preparation preview is insufficient.

## Intent parity

patch-intent.ts reconstructs the stable canonical core intent, including actor audit,
stable timestamp, action payload and intentBinding. Commit service now uses the same
helper AFTER its original current-target eligibility/authorization checks. No action
or authorization rules changed. The helper itself is not authorization. Old receipts
use the same hash format; no schema migration required.

## Receipt audit and retention proposal

Core stores lastOperationId, lastOperationHash and monotonically increasing per-account
revision in state (including tombstones). lastOperationHash covers full core intent,
including intentBinding; binding covers original actor, source hash, generation/epoch,
expectedRevision, action, timestamp and operation ID. Receipt does NOT store full request,
explicit binding, epoch history or a response. Reconstruct proof from trusted context.

Only the latest receipt survives. Subsequent mutation, delete/recreate or receipt
replacement makes an earlier unknown operation unresolved, not proof of non-commit.
No permanent ledger is introduced; no durable unlimited idempotency guarantee.

Proposed policy (not activated):
- Preserve state/tombstone while generation is available for reads/reconciliation;
  never independently TTL-delete state for an active generation or reset revision.
- Retain original immutable server recovery context under access control for an
  operator-approved finite recovery window. Duration/PII minimization/encryption are
  unresolved product/security decisions, not arbitrary defaults in code.
- Reconcile promptly; after newer mutations/cutover/escalation use operator review and
  generation reconciliation, NOT automatic original mutation replay or legacy fallback.
- Generation cleanup must consider outstanding unknown requests and tombstones.
  A future permanent ledger requires a separately demonstrated retention requirement,
  access/TTL/cost design and atomic receipt writes; none is silently added here.
- Never reuse operation IDs; mismatched context is rejected, mismatched persisted hash
  is unresolved. Missing receipt cannot license re-executing a non-idempotent request.

## Tests / rollout blockers

Fake tests use real commit/core intent hashing and memory snapshots. Cover all actions,
original unknown-after-commit then proof, missing/superseded receipts, source-only false
positive, operation reuse, hash/binding/request/target/generation/epoch changes,
source drift, corrupt entry/state/summary, permission revocation, principal switching,
delete/recreate, network/permission read failure, concurrent receipt replacement,
readOnly SDK options and ZERO staged/committed writes. No SDK runtime imports.
Concurrent proof is valid for its snapshot only; later writes may supersede it.
Summary structure checks are not a global independent count reconciliation.

Before production: emulator/staging read snapshot/transaction/transport verification;
trusted recovery context storage and authenticated lookup endpoint; retention/privacy
review; all writer inventory and receipt ownership; generation/epoch historical policy;
exact source/directory/state/summary storage/index guards; Timestamp/legacy codec policy;
authorization/audit, contention/backoff, rollback and operator escalation procedures.
Mock operations are not Firebase billed reads/writes or backend consistency proof.

## Local execution

35/35 offline test scripts PASS, including 34 recovery scenario outcomes plus
authorization-ordering, no-write and integrity assertions. Existing 35 commit cases
remain PASS after shared intent reconstruction. TypeScript noEmit, test syntax and
git diff --check PASS. App/components import search found no activation. No real SDK
initialization, emulator/staging or production RPC ran.