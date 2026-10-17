# PR2B.4A — standalone commit-time source authorization

Not activated or imported by Accounts API/UI. No production connection, SDK instance
creation, credentials, deployment/migration, Rules, Profile/Login or unrelated module
changes. Real dual-write remains disabled. All commits in tests are fake memory commits.

## API and trust boundary

`createAccountsPatchCommit({adapter, preflight}).commit(request)` is request-scoped and
single-use, including after rejection/unknown. Every result has legacyAllowed:false.
No legacy callback exists. Caller must never reconstruct a new gate to fallback after
selection. API boundary must keep checkOrigin/currentAccount; originVerified and actor
are trusted SERVER context, not client-body authorization. Preparation output/actor hash/
responsePreview are not accepted as commit evidence. Request extends preparation input
with sourceHash, used ONLY for optimistic target binding. Request is codec-snapshotted
once; stable auditTime is validated canonical ISO and retained across attempts.

`createFirestorePatchCommitDependencies(db, preflight)` binds injected Admin Firestore.
No SDK initialization, environment config or I/O in factory. Existing adapter now
permits an optional actor source READ (authorizationActorId), never actor write scope.
All generation/control and target-write restrictions remain. No Client SDK.

## Protocol: one outer transaction

1. Adapter reads active control and checks pinned generation + epoch + ready + versions.
2. Service reads actor from users/{actorId} and target from users/{actualTargetId}.
   Requires source actor.role exactly admin, same as current Accounts PATCH. No read
   model authorization. Missing/revoked actor rejects before staging.
3. Re-map action against CURRENT target, not prepared patch: approve student with audit
   fields; assign-types teacher/assistant with whitelist and insertion-order dedupe;
   role student/teacher/assistant only, never change admin target, reset types and pending.
   All other fields including source ID/email/enrollment remain unchanged.
4. Build canonical intent with expectedRevision, stable operationId/time, and intentBinding
   hash of the original server request. Binding prevents actor/body/fence/sourceHash reuse
   from masquerading as the same operation. Core receipt hash covers this optional field.
5. Read state; unless exact latest receipt + hash + next revision match, require current
   source canonical hash equal to bound preparation sourceHash. Drift rejects TARGET_CHANGED;
   no rebase. Matching duplicate bypasses stale BEFORE-source hash, not authorization or
   action checks. Core still verifies decoded entry/state/source/count/version consistency.
6. Run core callback against SAME outer transaction reads and an in-memory write collector,
   NOT a nested SDK transaction. Core enforces revision, missing-state, unsupported and
   overflow. Required pure injected preflight examines all prospective documents before
   first real staging. Zero contribution delta still has no summary write.
7. Compute response candidate from this transaction's source + mapped patch (or verified
   current source for duplicate). Stage collected source/entry/state/optional summary.
   Only after outer transaction resolves successfully return confirmed and success response.
   Candidate calculated inside aborted callbacks is never returned to caller.

All transaction reads precede actual writes. Actor revocation/cutover after a snapshot
must conflict via the real transaction read set; each ABORTED attempt re-reads actor,
target/control and repeats authorization, action and binding checks. Audit time/revision
are not rebased. Adapter only retries ABORTED; unknown does not trigger another mutation.

## Outcomes and duplicates

- confirmed: acknowledged outer commit or verified latest duplicate; response available.
- rejected: safe validation/server rejection, no success response, no legacy fallback.
- unknown: network/unclassified uncertain outcome, no success response or automatic retry.

Do not infer rollback from unknown. Existing adapter reconciliation can prove a canonical
core intent's latest receipt. Commit intent includes intentBinding; a secure operation
reconciliation endpoint for this service is NOT provided in this PR and must be designed
before activation (server request storage/intent reconstruction, authorization, receipt
retention). Do not strip binding to reuse an old preparation intent's receipt hash.
Latest-only receipt means superseded retries cannot be confirmed by a permanent ledger.
Current actor is reauthorized even for duplicate success; revocation may prevent returning
a response for an operation which previously committed. This is intentional fail-closed.

## Tests and known limits

Offline fake SDK wraps versioned memory engine and real adapter/core. Loader forbids SDK
runtime imports except node:crypto. Assertions cover source admin/revocation before commit
and after first attempt, fresh target role/approval drift, concurrent operations, duplicate
concurrency/reused operation, generation cutover, retries/stable audit time, unknown,
permission failure/staging rollback, preflight, unsupported/overflow/missing state,
zero-delta, role/types/approval and source/entry/state/summary/hash parity. Route branch is
used as executable mapping/authoritative view oracle. No app activation.

Before API activation: emulator/staging proof of locks/conflicts/atomicity and transport
ambiguity; complete storage/index guards and legacy Timestamp policy; full writer inventory;
generation/control ownership; service-level secure reconciliation; boundary session/origin
binding and request lifecycle; authorization/privacy review; load/backoff and rollback plan.
Injected test preflight returning ready is NOT storage approval. Generic injected adapters
must honor fencing/atomicity/ambiguous-outcome contract. Proxy/untrusted in-process objects
remain outside codec guarantees. Mock operations are not Firebase billed reads/writes.
PR2B.4B is not started.

## Local execution results

34/34 offline scripts PASS; commit runner 35 case outcomes plus parity/security
assertions. TypeScript noEmit, test syntax and git diff --check PASS. App/component
import search found no commit service activation. No emulator/staging calls ran.
Legacy-approved approve fixture committed 3 documents with zero summary writes;
explicit-pending approve committed 4 with one summary write. Two injected ABORTED
retries committed only once and kept identical approvedAt. These are fake logical
operations, not backend billing or throughput evidence.