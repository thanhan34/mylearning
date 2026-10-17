# PR2B.3A — inactive Admin transaction adapter

No application import/activation, SDK instance creation, credentials, production
connection, dual-write, migration, deployment, Rules or unrelated module changes.
PR2B.2A emulator verification remains deferred. PR2B.3B is not started.

## APIs

`createFirestoreAccountAdapter(db: Firestore, { generation, epoch },
{ maxAbortedAttempts?: number })` implements the existing AccountTransactionAdapter.
Firestore is injected; its import is type-only and disappears at runtime. Factory
does no I/O. Pass this adapter explicitly to `mutateAccount` only in future approved
integration. No app flag or configuration enables it in this PR.

Paths are passed unchanged to db.doc; SDK transaction.get/set/delete map to core
operations. Full sets, not merges/transforms. Source ID is never rewritten. Adapter
limits each callback to one source account and its pinned generation's entry/state/
summary. Core still checks missing state, source consistency, revisions and deltas.
Guard rejects reads after writes; closed callback handles cannot be reused.
Set values are detached using the existing codec before SDK staging. Core rejects
unsupported native source types rather than stripping them. No Client SDK imports.

## Generation fence (proposed control schema, not provisioned)

Control document: `accountDirectoryControl/active`:

    { activeGeneration: string, epoch: positiveSafeInteger, status: 'ready',
      schemaVersion: 1, codecVersion: 1 }

Operator/bootstrap must provision this document separately after review. No default
generation, missing-control fallback, activation or automatic repair. Factory pins
generation AND epoch. Every callback attempt reads the control FIRST, in the same
transaction as core reads/writes. Core then verifies ready generation summary.
Five logical reads on a normal mutation (control + four core reads).

Generation/epoch mismatch rejects; a cutover conflict can trigger an ABORTED retry,
which re-reads control and rejects the old fence. Never switch generation or rebase
expectedRevision inside a retry. Epoch must increase on every activation/cutover to
avoid generation-name ABA. A future active-control manager must enforce this; this
adapter never writes control. Ready non-active generations are not writable through
this adapter. Direct legacy writers remain outside this guarantee and need inventory.

## Retry and ambiguous outcomes

Each SDK runTransaction uses maxAttempts:1. Adapter retries ONLY explicit ABORTED,
bounded by maxAbortedAttempts (default 3, valid 1..10). No added backoff yet: contention
load/backoff policy is a pre-integration gate. This avoids the installed SDK's broader
automatic callback retry list for network failures. It does not claim to disable
lower-level transport retries; those must be validated with the real SDK/emulator.

Callback validation failure means no callback commit. Once a callback completed with
staged writes, deadline/unavailable/unclassified errors are conservatively UNKNOWN,
not rollback. Core now returns `{status:'unknown', code:'UNKNOWN_COMMIT_OUTCOME',
reason}`. No blind retry occurs for these errors. Even an uncommitted fake timeout
returns unknown because the caller cannot infer the remote outcome.

`reconcileAccountOperation(db, originalRequest)` is an explicit READ-ONLY transaction:
compare latest receipt operation ID, canonical request hash and exact next revision;
then reuse core's source/entry/state/summary consistency and duplicate validation.
Writes are prohibited. Matching proof returns confirmed; absent/corrupt/superseded
receipt or failed read returns unresolved, NEVER proof of rollback. It may inspect
historical generation state after cutover (no active fence needed for read-only proof).
It never repairs data or creates a receipt. Receipt retention/immutability must be
reviewed; this is not a permanent ledger or an authorization mechanism.

## Safe errors

AccountAdapterError exposes static codes/outcome, never raw SDK message/path/source.
No logging is added. Permission/unauthenticated -> PERMISSION_DENIED; exhausted
ABORTED -> TRANSACTION_ABORTED; read-phase timeout -> DEADLINE_EXCEEDED; unavailable
before callback completion -> UNAVAILABLE. Completed-write network failures ->
UNKNOWN_COMMIT_OUTCOME, with safe reason. Invalid argument/failed precondition/out of
range -> INVALID_DOCUMENT_OR_INDEX; resource exhaustion -> RESOURCE_EXHAUSTED.
Generic status alone cannot distinguish index overflow from quota/configuration;
never label those exact causes without evidence. Core retains structured missing/
corrupt state, unsupported/overflow and schema/codec errors. No error payload includes
email, name, feedback or raw request data.

## Offline verification

Fake Firestore wraps the existing versioned atomic memory engine. Runtime module
loader refuses non-local imports except node:crypto, proving no Admin/Client SDK
initialization. It asserts SDK options/mapping, read order, aborted retries, concurrent
mutations, generation switch conflicts, unknown outcomes both before/after fake commit,
read-only proof, missing state, zero delta, tombstone/recreate, permission rejection,
unsupported source, version mismatches and atomic rollback. Fake scheduling does not
prove real pessimistic locks, gRPC semantics, backend index limits or billed operations.

Before PR2B.3B: emulator/staging transaction tests, transport/ambiguous-commit testing,
reviewed control provisioning/epoch ownership and activation fencing, full source-writer
inventory, exact per-document/index storage guards, Timestamp/legacy source policy,
reconciliation/receipt retention, authorization/audit/privacy and contention/backoff
policy. No API integration or production readiness is claimed by offline PASS.

## Execution result

32/32 offline test scripts PASS, including 40 adapter/proof scenario outcomes plus
mapping/isolation assertions and the existing 89 core mutation scenarios. TypeScript
noEmit, adapter test syntax and git diff --check PASS. No emulator/staging RPC ran.
Regression initially exposed read-only permission errors losing their code inside
core; read-only adapter classification was corrected and all tests rerun successfully.
Application/component import search found no adapter activation.