# Phase 4.2 — Controlled production release audit

Date: 2026-10-15. **BLOCKED / NO-GO. Nothing deployed.**

## Source identity and scope

- Branch: main.
- HEAD: a4872e0a78a0fe67781e6dbc0e22d1859c9eb021.
- Local origin/main ref also points to HEAD; no fetch or remote-state verification.
- Index empty. Phase 4 changes are uncommitted. No release commit exists.
- Working tree also contains unrelated Accounts, Notifications, Accounts read-model
  files and tests. Do not deploy this working directory wholesale.
- No commit, push, stash, reset, checkout, production call or deployment performed.

Mocktest runtime allowlist (62 additions / 20 deletions against HEAD):

1. app/api/learning/records/route.ts
2. components/StudentRecords.tsx
3. components/StudentMocktests.tsx

Supporting Phase 4 scope:

- scripts/test-mocktest-optimization.cjs (new)
- scripts/test-daily-notes-removal.cjs (transaction boundary mock update)
- docs/mocktest-read-optimization-phase4.md
- docs/mocktest-integration-verification-phase4-1.md
- this Phase 4.2 report

Exclude modified accounts route, AccountManagement, NotificationBell, notification
service, test-firebase-quota, useNotifications, notification-store, lib/accounts,
Accounts/Notifications tests and associated docs/config/fixtures. Existing shared
imports (access, firebase-admin, LearningGate, learning-api, UI, teacher display)
are in HEAD. node:crypto is built-in/server-only; Firestore types erase at runtime;
no package/lockfile update is required by the Mocktest diff.

Runtime SHA-256 at audit:

| File | SHA-256 |
|---|---|
| records route | B41A498E4E9F73BDD8375F62ED025BE2740ACAFA483AA18F94A183FB00EBD408 |
| StudentRecords | 33682391272C1FE98A2DD1484A16C786D75509AA9CAABB24397228CA6DE45B57 |
| StudentMocktests | EBB33D7F2113A49D473BD96DC734A3CBC5D6D014F8C033D16A519B94AA0ED20F |

## Actual repository deployment evidence

- vercel.json configures /api/cron/daily-home only; no project/team/deployment ID.
- firebase.json configures Hosting public out with index.html fallback, plus
  Firestore/Storage Rules and Functions predeploy. It is not proof of the current
  production host or a working deployment path for these server API routes.
- package.json has next build / next start, no deploy script.
- README deploy instructions are generic template guidance, not production evidence.
- No .github workflow, .vercel project link or .firebaserc found in root inspection.
- No Vercel CLI found; Firebase CLI exists. No project listing/login attempted.

Therefore hosting target, production URL, current production commit, deployment
ID and rollback deployment are **UNVERIFIED**. Local HEAD is NOT a verified
production rollback reference. A real release must first record provider/project,
current serving deployment ID + commit and a tested provider-specific rollback
procedure. Do not run a broad firebase deploy: unrelated Rules/functions/config
must not enter this release.

## Verification executed in Phase 4.2

| Check | Result |
|---|---|
| All current scripts/test-*.cjs | 36/36 PASS |
| Working-tree TypeScript --noEmit --incremental false | exit 0 |
| git diff --check | exit 0 |
| Isolated HEAD + Mocktest runtime files TypeScript | exit 0 |
| Isolated optimized production build | NOT PASS; exit 1 at Google Font fetch |
| Real SDK integration / staging | BLOCKED; not run |
| Browser E2E | BLOCKED; not run |
| Production smoke / logs / usage | NOT RUN |
| Production billed reads | NOT MEASURED |

An isolated candidate was created outside the repository from a git archive of
HEAD, overlaying ONLY the three runtime files. Generated next-env.d.ts was copied;
existing node_modules was linked, not installed/changed. No .env.local copied or
loaded. Build child environment was allowlisted with dummy demo- config, dead
loopback emulator endpoints, telemetry off and network connections blocked.
No production credentials were supplied. Isolated artifact path:

`C:\Users\dtan4\AppData\Local\Temp\mylearning-mocktest-release-712d8833e7c944fe963bb07956591cfd`

next build reached optimized compilation, then next/font/google could not fetch
Inter because RELEASE_BUILD_NETWORK_BLOCKED denied networking. Exit 1; not a build
PASS or deployable artifact. HEAD already imports Inter from next/font/google in
app/layout.tsx, so this is an existing build dependency blocked by isolation, not
a demonstrated Mocktest regression. Remaining compile/prerender stages are not
verified. No font substitution or application patch was made to manufacture PASS.
Initial archive attempt included untracked next-env.d.ts and failed; corrected
by copying that generated file separately. Initial runner preload path failed
Windows quoting and was corrected before the actual guarded build. Neither was
an application failure. Temporary build artifacts remain outside the repository.

## Integration gate remains blocked

- CLI Java preflight again reports inability to spawn java -version. Installed
  Firebase CLI requires Java >=21. No Java/JDK install was performed.
- Safe loopback probe 127.0.0.1:8080 again reports EMULATOR_UNAVAILABLE before SDK
  initialization. No production fallback permitted.
- No verified dedicated staging project/config/test identities were supplied or
  discovered from repository evidence. No staging resources were provisioned.
- Project cannot resolve Playwright/@playwright/test/Puppeteer. Existing browser
  cache is not a runnable test harness. No dependency installed without review.
- Browser client Firebase emulator isolation is not established by existing
  configuration. Mock development mode replaces Firestore, not real SDK evidence.

All required staging cases remain BLOCKED: complete/legacy name loads, committed
feedback, real concurrent 409/retry, unrelated native fields/Timestamp preservation,
unauthorized role writes, no full-list GET, failed-save DOM draft retention and
session/account-switch isolation. Offline mocks remain separate evidence only.

## Deployment and rollback record

- Files deployed: NONE.
- Release commit: NONE.
- Hosting target: UNVERIFIED.
- Deployment ID/result: NONE; no deployment command invoked.
- Production version/smoke/error logs/Firestore usage: NOT CHECKED.
- Rollback reference: UNVERIFIED; no production release changed to roll back.
- No migration/backfill, Rules/index edit, Accounts read-model activation, student
  data mutation, production credentials use or production database access.

## Gate to resume, not automatic next work

1. Verify actual hosting project/environment through approved provider evidence;
   record serving deployment ID/commit and rollback operation before release.
2. Prepare the allowlisted Mocktest-only commit/PR on verified base, preserving
   unrelated working changes. Audit complete commit diff and CI workflow.
3. Supply/provision approved isolated staging, JDK/emulator/browser tooling and
   safe auth/session fixture setup; prevent production SDK/network fallbacks.
4. Run required real SDK + browser cases and preserve artifacts/request traces.
5. Obtain a full production build PASS with required build assets available in a
   controlled environment; rerun regression/TypeScript on the final exact commit.
6. Only after every gate PASS, deploy exact commit to verified target, capture
   deployment result, then perform approved isolated-test-data production smoke
   and monitor errors/usage. Roll back using the recorded reference if needed.

Current decision: **NO-GO for production deployment**. Stop for review; do not
interpret user intent to deploy as permission to bypass the required release gate.