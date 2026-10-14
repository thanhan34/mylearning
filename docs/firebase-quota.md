# Firebase read reduction

## Changes
- Removed 30/60-second polling from LearningGate, dashboard and legacy progress views.
- LearningGate still reads fresh permissions on entry, manual retry, and focus/visibility return after five minutes. Server authorization is not cached.
- Dashboard reuses LearningGate's account instead of looking it up twice. Date changes only reload submissions, not progress.
- Dashboard/chart progress queries cover the last 45 days. Legacy calendar callers retain full history; no arbitrary document cap silently truncates their counts.
- Daily/weekly progress filters dates in Firestore. Submission queries request only the first document, matching their existing return semantics.
- Homework cache is browser-memory only (submissions: two minutes, progress: five minutes), max 200 entries, with request deduplication. Errors are not cached. Old in-flight reads cannot repopulate invalidated entries.
- Successful learning API mutations invalidate homework cache. Account changes/unmount/logout clear it. API GETs and server account/authorization reads remain uncached.

## Deployment
1. Review the target Firebase project and compare existing remote indexes with the local index configuration. Preserve any remote indexes needed by other features.
2. Deploy indexes before deploying the application:
   `firebase deploy --only firestore:indexes --project YOUR_PROJECT_ID`
3. Wait until both homework userId/date indexes are ready in Firebase Console.
4. Deploy the application through the normal hosting workflow.
5. Verify login, approval retry, switching dates, homework submission/link editing and feedback updates with a test account.
6. Compare Firestore reads/day and peak usage before/after deployment at similar traffic levels. Check the actual resource-exhausted error and Storage/Auth/Functions usage if quota failures remain.

No production deployment, rules changes or billing-plan changes are performed by this patch. No guarantee of staying within quota is possible without traffic/usage measurements. Other list queries, realtime listeners and media requests remain outside this optimization.

## Freshness tradeoff
Views no longer automatically refresh every minute. Reload the page to fetch current homework; changing dates fetches that date unless its short-lived cache is still valid. API workspace refresh buttons remain uncached. Permission updates are still checked server-side on protected API calls.

## Local checks
- `node scripts/test-firebase-quota.cjs` (isolated tests, no live Firebase reads/writes)
- `npx tsc --noEmit --incremental false`
- `npm run build` (optionally set NEXT_BUILD_DIR to a separate build directory)