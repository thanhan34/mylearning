# PR2B.2A: local-only harness and pre-gram safety

No application writers, rules, indexes or production configuration are modified.
The integration script is intentionally not named test-*.cjs: offline regression
success must not be confused with emulator persistence success.

## Environment gate

Requires ACCOUNTS_EMULATOR_PROJECT=demo-mylearning-codec and an explicit numeric
loopback FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 (or [::1]:port). localhost DNS names
are deliberately not accepted. Credential/config variables and conflicting project
variables cause failure before socket probing or SDK load. No dotenv/application
initialization or production helper is imported. The client uses an explicit local
host, ssl:false and dummy credentials, never ADC. Run in a clean terminal.

scripts/firebase.accounts-emulator.json contains only local emulator configuration,
not production rules/indexes. Do not use it for deploy. It creates no production
resources and the Admin integration tests do not prove Security Rules enforcement.

After installing suitable Java and Firebase CLI separately, an operator can start:

    firebase emulators:start --only firestore --project demo-mylearning-codec --config scripts/firebase.accounts-emulator.json

In another clean terminal, from repository root:

    $env:ACCOUNTS_EMULATOR_PROJECT='demo-mylearning-codec'
    $env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'
    node scripts/emulator-account-codec.cjs

No emulator download/install/start is performed by the integration script. Missing
endpoint returns EMULATOR_UNAVAILABLE and nonzero exit before SDK initialization.
Each run uses unique local generation paths and deletes only its own test records.

## Coverage prepared

25 source fixtures persisted as directory DTOs, legacy document IDs, decode/hash
parity, primitive nested payload, malformed payload/version, multiple input sizes,
gram arrays and raw payload boundary probes at 1048400/1048487/1048488/1100000 bytes.
Boundary outcomes are observations, not assertions of production limits. Document
overhead can cause rejection before a nominal field limit. No index billing/storage
accuracy is claimed. Payload index exemption is not configured or deployed here.

## Pure precheck

Checks name/email before projection/grams. Bounds original field units before native
lowercase, then lowercased search units and worst-case gram occurrences. No trim,
normalization or truncation; overflow/unsupported is an explicit routing result,
not permission to skip or persist a record. Objects/custom coercion/accessors are
unsupported. This is search-processing precheck, not full codec validation of every
source field. Call codec/storage validation afterwards. Defaults are provisional:
4096 field/search units and 12285 gram occurrences, not Firestore storage guarantees.

## Execution status

Current environment has no java on PATH and no ready Firestore endpoint at
127.0.0.1:8080. The integration command failed closed with EMULATOR_UNAVAILABLE.
Persistence and boundary results remain BLOCKED, not PASS. Offline negative tests
exercise the actual runner in subprocesses with production project/remote endpoint/
credential variables and confirm rejection before readiness/SDK load.

Before PR2B.2B: execute this harness against a real local emulator, review observed
boundary behavior, validate query/index assumptions separately and approve overflow
routing. No transaction/application integration or fallback write is implemented.