# PR2B.3B — Accounts PATCH integration preparation, no activation

This PR adds a standalone READ-ONLY preparation service. It deliberately provides
no execution/commit method, legacy writer callback, application import, feature flag
or read-model writes. Existing Accounts PATCH remains unchanged and the default.
No SDK initialization, credentials, production RPC, deploy, migration/backfill,
Rules/auth/Profile/Login/frontend or unrelated feature changes. PR2B.4 not started.

## Existing route audit

The route checks origin, resolves currentAccount from the authenticated session and
requires role=admin. In its write transaction it reads actor source and target before
tx.update. It rechecks source actor.role=admin, handles target-not-found and returns
the authoritative view computed from that callback's target + changes. On retry it
uses the retried snapshot, not request/frontend values. Response contains success
and account only after transaction resolution. Document ID is target document ID.

Existing mappings, retained exactly:

| Action | Target condition | Changes |
| --- | --- | --- |
| approve | student | approvalStatus=approved, approvedBy=actor ID, approvedAt=ISO |
| assign-types | teacher/assistant | validate EXERCISE_TYPES; insertion-order dedupe; assignedFeedbackTypes, permissionsUpdatedBy/At |
| role | target not admin; requested student/teacher/assistant | role, assignedFeedbackTypes=[], approvalStatus=pending |

No new reject action; no implicit repair of email/classId/teacherId/approvalStatus.
Role change intentionally retains enrollment/audit fields not named in its patch.
Non-student approval and legacy enrollment approval still delegate to unchanged
isApproved via PR1 accountView. Client name/email/actor fields cannot enter patch.

## Service API and trust boundary

`createFirestorePreparationReader(db: Firestore)` injects Admin Firestore and uses
runTransaction({readOnly:true}); type-only SDK import, no initialization or settings.

`createAccountsPatchPreparation({reader, preflight})` creates ONE request-scoped gate.
`legacyDisposition()` initially returns legacy-only. `prepare(request)` permanently
selects preparation for that gate and returns prepared/rejected, always legacyAllowed
false afterwards. Repeated prepare calls reject REQUEST_ALREADY_SELECTED. No function
invokes legacy mutation, including timeout/unknown, generation failure or preflight.
Do not construct another gate to bypass routing decisions for the same request.

Request contains trusted session actor, originVerified, PATCH body, pinned generation/
epoch, expectedRevision, operationId and stable server auditTime. These are injected
server context, NOT capabilities validated cryptographically by this library. Future
route must call existing origin/session checks; never accept actor or audit metadata
from client body. Timestamp is captured once per intent, not generated inside retry.

Preparation snapshots request with codec. Inside one read-only snapshot: validate
control generation/epoch/ready/version, read actor and target, recheck source admin,
map allowed action, then run existing core against an in-memory staging collector.
Core reads state/entry/summary through that SAME snapshot and validates hash/revision/
contribution/precheck/codec. No collector writes reach Firestore. Required preflight
receives detached prospective source/documents; rejection returns PREFLIGHT_REJECTED,
never raw policy text. Policy must be pure/local, safe on read-only callback retries.

Prepared output: intent, source hash, actor source hash, responsePreview and
commitEligible:false. Preview uses snapshot target + mapped changes and PR1 view.
It is NOT a successful HTTP mutation response and must never be sent as success after
preparation alone. A future committing transaction must recompute the authoritative
response from its own snapshot. The service does not automatically create an adapter
or feed its intent to mutateAccount against a writable adapter.

## Critical pre-activation blockers

1. Authorization TOCTOU: prepared actor hash is diagnostic binding, not permission.
   PR2B.3A writable adapter scopes to one target and does not reauthorize actor.
   Do NOT execute a prepared intent directly. Future commit path must add actor source
   read/authorization, action mapping, target/source revision validation, fence and
   atomic writes in the SAME transaction. Session/account switching must be bound to
   original actor/target; never read mutable frontend state on completion.
2. Existing route's timestamp is generated in callback; future intent uses stable
   injected time for repeatable hash/reconciliation. Approve this operational detail.
3. Required preflight is injected, not a production-ready built-in storage policy.
   Check all source/entry/state/summary documents and complete index definitions.
   Test directory estimate is only a fixture policy, NOT storage approval.
4. No commit means no ambiguous commit can originate here. Injected unknown results
   are fail-closed with no legacy fallback. Future commit results must retain unknown
   status and explicitly reconcile receipt; never write legacy after selection.
5. Exact document/index limits, all writer inventory, generation activation fencing,
   authorization/audit/privacy, rollout/rollback and emulator/staging still required.

## Legacy classification (no writes or repairs)

- Missing/corrupt/mismatched state: consistency error; trusted bootstrap/reconciliation
  must be reviewed separately. Never assume old counts zero.
- Timestamp/SDK class, functions/accessors/cycles: CODEC_UNSUPPORTED.
- Own undefined fields, nested source arrays, lone-surrogate source strings:
  UNSUPPORTED_SOURCE. Codec capability does not imply native source-write support.
- Search/gram budget: OVERFLOW with code; codec budget: CODEC_BUDGET.
- Storage/index policy: PREFLIGHT_REJECTED (raw policy message is not exposed).
- Unsupported roles: explicit error, no role coercion.

Before enabling: inventory legacy types/shapes offline, agree typed source codec and
lossless persistence policy, repair/reconcile via separately approved procedures or
explicitly reject affected operations. Never silently skip records or normalize
approval/enrollment/role/email. Current legacy route is unaffected by these new gates.

## Verification

Tests extract unchanged route mutation branch as executable oracle for all actions,
compare exact audit patch and snapshot response view, test explicit/legacy approval,
admin/revoked admin (including retried snapshot), missing state/revision, generation,
unsupported/overflow, preflight rejection, transaction failure/unknown, request/account
isolation, caller mutation, routing gates, readOnly SDK options and zero writes.
Runtime test loader blocks SDK/route imports; no Admin instance or network is created.
Mock reads are not Firebase billed reads. No real transaction/transport/index-limit
guarantees without emulator/staging. Existing route is tested separately by regression.

Local results: 33/33 offline scripts PASS, including 33 preparation case outcomes
plus parity/isolation/fallback assertions. TypeScript noEmit, test syntax and
git diff --check PASS. App/component import search found no service activation.
No files from existing Accounts route/UI or unrelated feature modules were edited
in this PR; their preexisting working-tree changes remain untouched.