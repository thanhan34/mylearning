# Mocktest Phase 4.3 blocker resolution — NO-GO

Recorded 2026-10-17 (environment clock artifacts may show 2026-10-17 UTC).
No deployment, push, migration, backfill, production data access, Rules/index edit.
Work is isolated on release/mocktest-phase4-3, parent ac27b154.

## Changes

- app/firebase/config.ts: explicit local-test Web SDK Auth/Firestore emulator
  connection before exports, shared hot-reload guard, no IndexedDB persistence in
  test mode. Existing production initialization remains the default.
- lib/firebase-emulator.ts: only flag `1`, project demo-mocktest-phase43 and numeric
  loopback ports 8080/9099 are accepted. Malformed enabled configuration throws.
- lib/server/firebase-admin.ts: same validation, matching public/server targets,
  reject credential variables in test mode; Admin SDK uses demo project only.
- scripts/test-daily-notes-removal.cjs: crypto and transaction fixture support.
- scripts/test-firebase-quota.cjs: correct service import mock path.
- scripts/test-firebase-emulator.cjs: strict configuration rejection tests.
- scripts/test-mocktest-optimization.cjs: existing optimization boundary suite.
- scripts/verify-mocktest-emulator.cjs: reproducible real SDK/HTTP/browser checks;
  requires external Playwright and an absolute external artifact directory.

No additional Mocktest application bug was proven; original three-file runtime
optimization remains unchanged. No Accounts/Notifications changes included.

## Two previous failures

1. daily-notes-removal: AssertionError Unexpected dependency: node:crypto at
   scripts/test-daily-notes-removal.cjs:32. Fixture also lacked runTransaction.
   Updated imports and transaction boundary, retaining existing assertions.
2. firebase-quota: Unexpected import: @/app/firebase/firestore at line 18 while
   loading progress.ts. Test expected firebase/firestore despite service importing
   the project wrapper. Both inputs unchanged from production baseline; fixture
   import corrected without changing application code or assertions.

## Evidence

Node 22.23.3 portable downloaded from nodejs.org and SHA256 checked against its
published SHASUMS256.txt. Candidate dependency junction removed, original shared
dependencies untouched. Lockfile clean install completed: npm ci --ignore-scripts
--no-audit --no-fund, exit 0 (726 packages). Lifecycle scripts deliberately disabled;
this is not evidence of an unrestricted install or a dependency security audit.

27/27 candidate regression scripts PASS; TypeScript PASS; optimized Next build
PASS with demo configuration, emulator mode, Node 22, no production credentials.
Google Fonts allowed only during guarded build. Existing viewport, sharp and
Browserslist warnings remain. Emulator build is NOT a production-environment build
with emulator flag absent; that separate gate remains open.

Real integration groups passed:
- embedded-name omission and legacy directory fallback;
- 401/403 authorization and actor-scoped reads;
- concurrent same-version POST: one 200 and one 409;
- commit result agrees with database;
- Timestamp and unrelated nested data preserved against persisted baseline;
- four real SDK transactions with observed retry callbacks (11 in last run);
- browser admin save updates DOM without post-save full-list GET;
- browser 409 retains draft, explicit reload shows server value;
- browser aborted transport retains draft, database unchanged, refresh correct;
- teacher/student browser has no feedback save, direct browser POST returns 403.

Browser denies all nonlocal requests; last run observed zero external hosts.
Web SDK server-side user lookup now succeeds against emulator. NextAuth fixture
JWTs exercise actual sessions, but OAuth login and browser Auth sign-in are not
exercised. Emulator has permissive local Rules; no claim about production Rules.
SDK retry probe is separate from records route. Transport abort is not server
transaction commit failure. Account switching during in-flight GET/save remains
unverified in real browser (boundary suite only).

Harness prerequisites: demo Auth/Firestore emulators on 127.0.0.1:9099/8080, hub
4403; local built app 127.0.0.1:3103, dummy local NextAuth secret as defined in
harness, emulator flag 1 and matching public/server project/host variables.
Set MOCKTEST_PLAYWRIGHT_MODULE to an external installed Playwright module path,
MOCKTEST_ARTIFACT_DIR to an absolute temporary artifact directory, optionally
MOCKTEST_CHROME_PATH. No production credentials may be present. Execute with Node
22. Test fixtures use example.test identities and must never target cloud data.

## Rollback gate — blocked

Read-only Vercel API revalidation returned forbidden / invalidToken:true. No
automatic login or credential refresh attempted. Current deployment and rollback
permission could NOT be reconfirmed. User must reauthenticate Vercel outside logs
before read-only verification can resume; never paste tokens into chat.

Previously verified reference, NOT reconfirmed in this run:
- domain mylearning.pteintensive.com, Vercel scope pteintensive;
- project prj_v8B4Gk0OTSnvaGm1Tpj5UNFxZVV6;
- deployment dpl_2w1bj926Xy3HBSoBxwMUPvogxH1W;
- commit a4872e0a78a0fe67781e6dbc0e22d1859c9eb021.

Before release, re-query domain deployment and project production target, record
current ID/commit, verify member role and rollback eligibility. Approved rollback:
`vercel rollback <reconfirmed-deployment-id> --scope pteintensive --yes` only from
verified project context. Re-query domain and project target, test login, list and
feedback using approved test identities. Trigger rollback for login/session
regressions, cross-account data exposure, failed/corrupt feedback commits or
sustained Mocktest 5xx. Do not use the historical ID without reconfirming it.

## Decision

**NO-GO. Stop release operations.** Outstanding: current hosting/rollback access,
browser in-flight identity switching, records-route retry/commit-failure evidence,
direct browser SDK Auth verification, and build with test mode absent. These are
not marked PASS by the successful partial integration suite. Final SHA is recorded
in the agent completion report and artifact metadata, avoiding a self-reference.