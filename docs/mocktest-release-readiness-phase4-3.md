# Phase 4.3 — Production release readiness

Date: 2026-10-15. **BLOCKED / NO-GO. No deployment or push performed.**

## Verified hosting (read-only provider evidence)

- Domain: mylearning.pteintensive.com. DNS CNAME points to Vercel; public HTTP
  returns Vercel headers and redirects to /login. The X-Vercel-Id header is a
  request identifier, NOT a deployment ID.
- Existing authenticated Vercel CLI 59.23.2 resolved that domain in scope
  `pteintensive` to production deployment `dpl_2w1bj926Xy3HBSoBxwMUPvogxH1W`.
  CLI output succeeded in fetching metadata, although PowerShell reported a
  nonzero wrapper result because native stderr was treated as an error.
- Authenticated Vercel deployment API and project API independently returned 200:
  - Provider: Vercel; project name: `mylearning`.
  - Project ID: `prj_v8B4Gk0OTSnvaGm1Tpj5UNFxZVV6`.
  - Team/account ID: `team_U6LAop8oadD2iZGiLCCHlGsd`.
  - Production deployment: `dpl_2w1bj926Xy3HBSoBxwMUPvogxH1W`, READY.
  - Deployment URL: `mylearning-fxj5e5y65-pteintensive.vercel.app`.
  - Serving commit: `a4872e0a78a0fe67781e6dbc0e22d1859c9eb021`.
  - Project production target matches that deployment.
  - Git integration: GitHub `thanhan34/mylearning`, production branch `main`.
  - Project Node setting: `22.x`; local verification used Node `24.20.0`.
- No root .vercel link, .firebaserc, or .github workflow exists. No linking command
  was run. Repository Firebase Hosting config (`out`, SPA fallback) is not the
  serving-provider evidence and must not be used for this release.
- Existing local Vercel auth was used only for read-only metadata requests.
  Token/config secrets were not printed, copied into the candidate, or fetched
  from production environment settings. No production Firebase data accessed.

## Rollback reference and procedure

Preserve the currently serving deployment above as the rollback reference before
any eventual release. Installed CLI help confirms `vercel rollback
<url|deploymentId>`, with scope and timeout options. Intended authorized rollback:

```powershell
vercel rollback dpl_2w1bj926Xy3HBSoBxwMUPvogxH1W --scope pteintensive --yes
```

Run only from an explicitly linked/verified project context; then re-query the
domain and project production target. **Not executed:** changing production to
test rollback is outside this phase. Permission/plan eligibility and an actual
rollback rehearsal remain unverified. Reconfirm current deployment immediately
before release; this is a point-in-time observation, not a permanent guarantee.

## Exact Mocktest-only candidate

- Separate branch: `release/mocktest-phase4-3` (local only).
- Verified parent: production commit above.
- Release commit: `ac27b15402235759239bbc7ab6f0a4144f9d94b8`.
- Worktree: `C:\Users\dtan4\AppData\Local\Temp\mylearning-mocktest-phase43`.
- Exactly three changed files, 62 insertions / 20 deletions:
  - app/api/learning/records/route.ts
  - components/StudentRecords.tsx
  - components/StudentMocktests.tsx
- No Accounts/Notifications/read-model changes or dependency changes included.
- Original main worktree and its uncommitted changes preserved; index untouched.
- Existing node_modules linked for local verification; no clean npm ci or
  provider-parity Node 22 build has been performed. Generated build artifacts and
  verification tools are not part of the release commit.

## Build and regression evidence

Artifacts/tools: `C:\Users\dtan4\AppData\Local\Temp\mylearning-verification-tools`.

| Gate | Result |
| --- | --- |
| Exact release next build | **PASS**, exit 0, all 28 static generation steps completed |
| Inter font blocker | Resolved by allowing Google Fonts asset hosts; font/UI unchanged |
| Candidate TypeScript --noEmit --incremental false | PASS, exit 0 |
| Candidate commit diff --check | PASS |
| Original worktree offline scripts | 36/36 PASS, per-script logs captured |
| Candidate tracked offline scripts | **23/25 PASS; 2 FAIL** |
| External updated daily-notes boundary test on candidate source | PASS |
| External Mocktest optimization test on candidate source | PASS |
| Real SDK/HTTP integration | Six groups PASS; incomplete suite |
| Browser E2E | **FAIL/BLOCKED** before feedback form appears |

Build uses an explicit sanitized child environment, demo project IDs, dummy
NextAuth/OAuth values, nonexistent ADC credential path, and socket guard allowing
only loopback plus fonts.googleapis.com/fonts.gstatic.com. No .env copied.
Warnings include existing metadata viewport, optional sharp, stale Browserslist,
and cron dynamic-render diagnostic; overall build exit was 0, not just compilation.
This does not validate production credentials or a Vercel deployment artifact.

Candidate failures must not be hidden by the 36/36 working-tree result:

1. `test-daily-notes-removal.cjs`: baseline test boundary lacks the new transaction
   imports/adapter. Updated test from the original worktree passes against exact
   candidate source via external root-path overlay. That test update should be
   reviewed for a separate test-only commit; it is NOT in the three-file release.
2. `test-firebase-quota.cjs`: unexpected import `@/app/firebase/firestore` in
   progress.ts. Those inputs are unchanged between production base and release;
   do not merge unrelated quota test edits silently. Needs explicit baseline
   failure disposition or isolated test-only repair and rerun.

External overlays change only test source-root resolution, not application source;
they are supplementary evidence, not a passing tracked release regression suite.

## Real emulator integration

- Portable Temurin JDK 21.0.12.1 downloaded/extracted outside repository; no global
  Java installation/settings changed. Download checksum/signature not independently
  verified; tool install is local validation, not release artifact provenance.
- Firebase CLI 15.33.0 started Firestore emulator 1.22.0 and Auth emulator with
  project `demo-mocktest-phase43`; verified hub endpoints on numeric loopback.
- Auth: 127.0.0.1:9099; Firestore: 127.0.0.1:8080. No staging cloud project used.
- Temporary emulator config has no Rules file; emulator warns that it allows all
  reads/writes. Production Rules/indexes unchanged. This tests server application
  authorization, NOT Firestore Security Rules enforcement.
- SDK initialization occurs after loopback hub checks and credential rejection.
  Synthetic users use example.test addresses, no student data.
- Local production Next server uses guarded demo configuration on 127.0.0.1:3103.
- NextAuth fixture JWT cookies signed using a local-only dummy secret exercise
  actual server session/account lookup and HTTP handlers; Google OAuth login was
  not exercised. Auth emulator fixture users were created independently.

Observed PASS groups on exact release server:

1. Complete embedded names: empty fallback directory response.
2. Legacy name: real Firestore fallback directory query resolves fixture student.
3. Unauthenticated 401, non-admin write 403 (student/teacher/assistant/admin_support),
   actor-scoped reads.
4. Simultaneous feedback HTTP requests with same version: one 200, one 409;
   committed database value matches returned winning record and teacher fields.
5. Native Timestamp and unrelated nested fields equal the persisted pre-save
   baseline. Initial fixture nanoseconds 123456789 were persisted as 123456000
   BEFORE feedback; initial assertion failed when compared to the unpersisted
   seed. Corrected test compares the persisted baseline and passes. No claim of
   arbitrary nanosecond persistence beyond emulator storage precision.
6. Separate real SDK contention probe: four increments committed; ten callback
   invocations observed. This demonstrates SDK retries, NOT evidence that the
   records route callback retried.

## Browser failure and remaining blockers

Playwright 1.64.1 installed only in temporary tooling; existing Chrome used.
Browser routing denies all nonlocal requests. The Firebase client configuration
has no connectFirestoreEmulator/connectAuthEmulator wiring, including server-side
Web SDK consumers. Dashboard initialization attempted external Firestore access;
the server socket guard blocked it. The browser timed out waiting for the feedback
textarea. No production backend fallback was allowed.

The harness includes real-browser admin-save/no-list-GET and 409/draft/reload
assertions, but they were **NOT REACHED**. Do not count them as PASS. No browser
screenshot/network result artifact was produced because execution stopped earlier.
The startup blocker requires reviewed test-environment client/server Web SDK
emulator isolation, not mock mode, intercepted success responses, or removing
network protection. Such wiring would extend beyond the three-file release scope
and has not been silently added to production code.

Still required before READY:

- Establish and verify fail-closed Web SDK Auth/Firestore emulator wiring for both
  SSR and browser; no production fallback. Review any necessary extra file scope.
- Pass actual browser admin feedback, no post-save list GET, failure/draft
  retention, explicit refresh, duplicate save, and account switching during GET/save.
- Prove records-route commit failure/retry behavior with real integration evidence;
  separate SDK contention test is insufficient for route retry coverage.
- Resolve/disposition tracked candidate regression failures; attach reviewed test
  dependencies, then rerun all gates on the resulting exact commit if changed.
- Verify clean lockfile install and provider Node 22 parity; preserve durable CI
  artifacts (current logs/tooling in TEMP are not a reproducible committed harness).
- Confirm rollback permission/eligibility through approved provider evidence.

**Decision: NOT READY.** Hosting and local build blockers are substantially
resolved, but integration/browser/regression and rollback-validation gates remain.
No deploy, push, migration, backfill, Rules/index edit, Accounts read-model
activation, or production student-data experimentation was performed.