# Phase 4.5 bundle isolation

Root cause: Web config created globalThis.__learningEmulatorApps WeakSet before
checking emulator target. Unspecified NEXT_PUBLIC flag was not replaced by Next,
leaving runtime process.env lookups and non-foldable validation/connect branches.

Fix: next.config.js validates explicit 0/1 flag, always defines a build-time literal
(default 0), rejects emulator builds on Vercel. Client validation and all emulator
global mutations/connect calls are inside literal-gated branches. Admin validation
is similarly gated. Production Firebase initialization/persistence remain unchanged.
No Mocktest business logic, NextAuth, authorization, Rules/indexes changes.

tests/test-firebase-emulator (in scripts) exercises default/disabled initialization
with SDK spies, asserts no global property or emulator calls, enabled wiring and
invalid target rejection. Build config rejects malformed flags and hosted emulator
build. Production scanner checks all generated client/server JS (including dynamic
chunks) for app-specific initialization markers, global and fixed endpoints. SDK
library emulator exports may exist, but app call sites are eliminated by literal 0.

All final evidence recorded externally with final commit SHA after commit: clean
Node 22 install, TypeScript, complete offline scripts, production build + scan,
separate emulator build + SDK/HTTP/browser suite, current read-only provider metadata.
Do not infer readiness until every final run passes. No deploy/push/rollback.