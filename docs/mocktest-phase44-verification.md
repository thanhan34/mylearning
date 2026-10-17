# Phase 4.4 final verification

2026-10-17. No deploy/push/promote/rollback, migrations/backfill, production data,
Rules or index changes. Runtime unchanged from f2eef4b4; this phase adds only
route fault-injection preload, browser integration assertions and this report.
Final commit and pass/fail evidence are recorded externally after commit so every
gate is rerun against the actual final SHA, not the preceding dirty tree.

## Current provider verification (authenticated read-only API)

Verified 2026-10-17 07:13–07:19 UTC, not inherited from old reference:
- team pteintensive, team_U6LAop8oadD2iZGiLCCHlGsd, plan hobby;
- authenticated account's team membership role OWNER;
- project prj_v8B4Gk0OTSnvaGm1Tpj5UNFxZVV6;
- domain mylearning.pteintensive.com resolves via deployment API to READY
  dpl_2w1bj926Xy3HBSoBxwMUPvogxH1W, target production;
- project production target matches; domain appears in deployment aliases;
- deployed commit a4872e0a78a0fe67781e6dbc0e22d1859c9eb021.

Rollback authorization evidence is OWNER role and Vercel documented full
production access. Hobby permits rollback to immediately previous production
deployment only. References: Vercel docs /instant-rollback, /cli/rollback,
/rbac/access-roles. No mutation dry-run endpoint was assumed; actual rollback is
not rehearsed because prohibited. Permission verification is read-only role/plan
evidence, not a successful executed rollback.

Before eventual release, re-query current alias/target/commit, retain the current
deployment as immediately previous, and prevent intervening production changes.
Do not delete it. In approved emergency only, from verified project context:
`vercel rollback <reconfirmed-immediately-previous-id> --scope pteintensive --yes`.
Re-query domain deployment and project production target until both match that
ID; verify READY, expected commit, login redirect/session, Mocktest list/save with
approved synthetic identity and server error rates. No environment/DB rollback
is implied. Trigger on cross-account exposure, login failures, corrupt/failed
feedback commits or sustained Mocktest 5xx. Reauthenticate if permission expires.

## Browser/session evidence

Actual NextAuth JWT session cookie is used. Google OAuth external exchange is
intentionally excluded; Google provider, JWT strategy, actual /api/auth/session,
and /api/learning/session GET are used without mock mode. LearningGate removes
legacy Firebase sessions and does not POST for custom tokens. No Firebase Auth
sign-in is needed by this dashboard architecture; no new sign-in flow added.

Browser Playwright captures actual A response using route.fetch, delays delivery,
changes signed fixture cookie to B and triggers NextAuth's normal storage session
refresh, then releases A after B's draft exists. GET and SAVE scenarios verify B
draft survives and A success is not published. SAVE checks carry known identities.
Separate student-private GET scenario verifies late A cannot insert A's private
record into B's DOM; B's link submission draft survives. Admin/adminB save test
does not mistake authorized shared admin records for private data leakage.

Artifacts: integration-results.json, session-network.json (no cookie/token values),
switch-GET.png, switch-POST.png, private-student-switch.png, browser-network.json.
Browser denies non-loopback requests and requires zero external attempts.

## Route-level transaction evidence

scripts/lib/mocktest-route-faults.cjs is a Node preload in TEST SERVER ONLY. Not
imported by application, not bundled; requires explicit emulator flag, demo project,
loopback Admin hosts and absence of credentials. Hooks installed SDK RPC boundary,
not route code or callback. Real emulator transaction reads remain in use.

- Pause commit RPC: HTTP stays unresolved until released; real emulator commit
  ack precedes returned success, persisted feedback matches.
- ABORTED once: real emulator rollback releases transaction, inject gRPC status 10;
  actual records handler/SDK retries, >=2 route commit requests, real commit ack.
  This is deterministic RPC fault injection, not a naturally generated emulator
  conflict. Existing concurrent same-version HTTP test independently proves 409.
- Denied commit: real rollback then status 7; route returns 503 with no success,
  database unchanged; browser retains draft and does not publish confirmed state.
- Timestamp/unrelated preservation compares persisted baseline, accounting for
  emulator's initial sub-microsecond truncation.

Standalone SDK contention remains supplementary only; it is not route evidence.
Fault controls/events live outside repository via MOCKTEST_FAULT_DIR. Start test
Next process with NODE_OPTIONS requiring this preload as well as network guard.
Never preload in production or run against cloud. Emulator local Rules permissive;
this is application authorization testing, not production Security Rules testing.

## Production-mode gate

Use Node 22.23.3 and clean npm ci with lifecycle scripts enabled. Full regression,
TypeScript and optimized build rerun on final SHA. Build env excludes ALL emulator
variables and fault preload, contains demo-only Firebase config, dummy local OAuth
and NextAuth values, inaccessible ADC file, isolated user config. Network guard
allows loopback/Google font assets only, no Firebase cloud access. Inter unchanged.
Scan generated client JS for fixed emulator endpoints/config markers and inspect
any match; generic SDK emulator exports are not active app test configuration.

Final evidence must record SHA, exit codes, session/route traces and production
bundle findings. If any gate fails, report NO-GO rather than reusing earlier PASS.
All tooling and artifacts are external TEMP paths; archive before cleanup.