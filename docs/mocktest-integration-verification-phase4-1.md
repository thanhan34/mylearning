# Phase 4.1 — Mocktest Integration Verification

Date: 2026-10-15. Decision: **NO-GO for production deployment**.
Environment preflight completed; SDK and browser verification are BLOCKED, not PASS.
No application code, dependencies, authentication, Rules, indexes or environment
files were modified. This report is the only Phase 4.1 file addition.

## Executed evidence

| Check | Observed result |
|---|---|
| All scripts/test-*.cjs | 36/36 PASS, rerun in Phase 4.1 |
| Mocktest offline route/component tests | PASS as part of the suite |
| TypeScript --noEmit --incremental false | exit 0 |
| git diff --check | exit 0 |
| Node / npm | 24.20.0 / 11.19.0 |
| Firebase CLI | 15.33.0 |
| Installed Firebase client / Admin | 9.23.0 / 13.0.2 |
| Installed @google-cloud/firestore | 7.11.0 |
| Installed Next / React | 14.2.0 / 18.3.1 |
| java -version / javac -version | commands not found |
| JAVA_HOME | unset |
| JDK search | no java.exe in checked common installation directories |
| Firebase CLI's own checkJavaMajorVersion() | could not spawn java -version |
| Firebase CLI local MIN_SUPPORTED_JAVA_MAJOR_VERSION | 21 |
| User Firebase emulator cache | absent |
| Safe loopback readiness probe 127.0.0.1:8080 | EMULATOR_UNAVAILABLE: no SDK initialized |
| Browser automation packages resolvable from project | Playwright/Puppeteer and core/test variants not installed |
| Browser executables | Chrome and Edge present |
| Playwright browser cache | Chromium/headless cache present; not an installed test harness |
| Browser E2E scripts/config | no Mocktest browser harness found; current Mocktest scripts are offline tests |
| Production billed reads | NOT MEASURED |

Readiness probe reused the existing safety utility with an explicit isolated
object containing only demo-mocktest-verification and numeric loopback host.
It did not load a database SDK or connect to Firebase. CLI Java check was invoked
directly without starting emulators, logging in, choosing a project, or invoking
production APIs. No environment secrets or .env.local contents were read.
The absence of Java on PATH is proven; absence of every possible JDK installation
on the machine is not claimed. No runtime installer/download was attempted.

An initial version-inspection command used firebase-admin/package.json and failed
with ERR_PACKAGE_PATH_NOT_EXPORTED. This was an inspection-command error, not an
application regression. Rerunning with filesystem package metadata succeeded.

## Phase 4 code review

- Authorization: currentAccount still resolves session/account approval first;
  only role admin passes feedback branch. teacher, assistant, student and other
  roles cannot gain write permission through body fields or expectedVersion.
  Read query is all records only for admin; otherwise studentId == actor.id.
  Origin checks remain unchanged. Real login/session flow is not browser-verified.
- Feedback transaction: reads target before staging update; checks optional
  expectedVersion inside callback; returns 404 for missing record and 409 for
  different feedback-owned content. Only feedback, teacherId and feedbackByName
  are written. Actor audit values come from server account, not request body.
- Response: awaited runTransaction gates success. It is the transaction's source
  snapshot plus exact acknowledged changes, not a post-commit fresh reread or a
  guarantee that no later writer has changed the document. No transforms are used
  by this mutation. Unrelated fields are not rewritten. submittedAt serialization
  matches GET. Existing timestamps/audit fields are retained; no new time added.
- Conflict token: SHA-256 over field existence/value pairs for feedback, teacherId,
  feedbackByName. Unrelated changes cause normal transaction consistency handling
  but do not invalidate feedback token. Content tokens do not detect ABA history.
  Legacy callers omitting expectedVersion retain last-writer-wins intentionally.
  Expected 409 under real two-writer contention remains unverified.
- Client: successful feedback maps only matching ID, no list GET; duplicate-save
  guard is synchronous. Incrementing requestVersion rejects older GET results;
  refresh is blocked while saving. Keyed child remount by account ID/role isolates
  form/request state when account context changes. Cleanup invalidates in-flight
  responses. This is offline component evidence, not browser lifecycle evidence.
- Failure: no optimistic list mutation; draft textarea stays mounted on ordinary
  save failure. Network loss after commit is still an unknown outcome requiring
  explicit refresh. No automatic replay or durable operation ledger exists.
- Initial load: skips student directory only when all returned names are truthy;
  legacy missing names retain existing role-filtered query. No pagination change.

No new application defect was reproduced during review/offline verification;
therefore no speculative production-code patch was made. Real-SDK native-value
preservation, automatic retry and browser draft behavior are still test gaps.

## Scenario status

| Scenario | Offline evidence | Real SDK emulator | Browser E2E |
|---|---|---|---|
| Initial records with names | PASS | BLOCKED | BLOCKED |
| Legacy missing names | PASS | BLOCKED | BLOCKED |
| Feedback commit/server record | PASS (mock commit) | BLOCKED | BLOCKED |
| Failure / transaction retry | PASS (simulated) | BLOCKED | BLOCKED |
| Concurrent expectedVersion conflict | PASS (mock serialization/retry) | BLOCKED | BLOCKED |
| Unrelated field/record preservation | PASS (fixtures/review) | BLOCKED | BLOCKED |
| No list GET after feedback | PASS (module request counters) | BLOCKED | BLOCKED |
| Unauthorized feedback | PASS (injected actor boundary) | BLOCKED | BLOCKED |
| Admin edit then refresh | separate offline save/load checks, not browser workflow proof | BLOCKED | BLOCKED |
| Account switch during GET/save | PASS (component harness) | BLOCKED | BLOCKED |
| Failure retains draft | source review; list unchanged test, no real DOM draft proof | BLOCKED | BLOCKED |
| Teacher/student data isolation | PASS (query/mock role checks) | BLOCKED | BLOCKED |

## Why integration and E2E stopped

1. Java runtime missing from executable environment; CLI requires JDK >=21.
2. Firestore emulator not reachable at checked local endpoint and no cached JAR.
3. No installed project browser automation runner/harness, despite browser binaries.
4. Existing mock development mode replaces Firestore with mockAdminDb: it cannot
   count as real SDK integration. In real mode, reviewed browser Firebase config
   has no connectFirestoreEmulator/connectAuthEmulator wiring; Admin setup can use
   applicationDefault/cert. Merely setting the server emulator host is not proof
   that browser auth/session/service calls are isolated from production.

Do not launch the normal app using existing environment files to bypass these
blockers. Shared authentication/emulator wiring was not changed under this
Mocktest-only verification task. No emulator start, SDK writes, browser E2E run,
production calls, deployment, migration, backfill or fixture deletion occurred.

## Unblock requirements for a separately reviewed verification run

- Make JDK >=21 available and verify java/javac versions; obtain/start Firestore
  Emulator with numeric loopback binding and a dedicated demo- project.
- Fail closed before any SDK initialization: disallow production credentials,
  reject conflicting project variables, verify the intended emulator endpoint.
  Use isolated fixtures only; do not point tests at real projects or accounts.
- Establish an isolated browser environment for every auth/session/client SDK
  dependency, with no inherited production configuration and external Firebase
  requests blocked. Any required shared auth/config changes need separate scope
  approval, not a hidden modification in the Mocktest PR.
- Select/install a reviewed browser runner and supply reproducible fixture/login
  setup. Do not treat existing Chromium cache or mock server renders as E2E.
- Execute all blocked scenarios, including real SDK automatic retry/abort,
  two independent admins sharing expectedVersion, Timestamp/native audit-field
  preservation, DOM draft retention, delayed GET/save across identity switch,
  refresh after save and request traces proving no full-list feedback GET.
- Rerun offline suite, TypeScript and diff check after any justified fixes.

## Final gate

Offline regression baseline remains green. Phase 4.1 integration gate is **not
satisfied**: SDK integration BLOCKED, browser E2E BLOCKED, production billed reads
NOT MEASURED. Keep Mocktest changes available for code review; **NO-GO to recommend
production deployment** until non-production evidence is captured. Preserve all
unrelated Accounts/Notifications working-tree changes and exclude them from the
Mocktest-only PR. Stop here; no next phase is started automatically.