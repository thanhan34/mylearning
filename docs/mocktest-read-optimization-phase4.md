# Phase 4: Mocktest safe read quick wins

Date: 2026-10-15. No production Firebase, credentials, deployment, migration,
Rules/index changes, or read-model activation. Stop here for review.

## Audit and baseline

Active entry points: `app/dashboard/mocktest/{page,admin/page,teacher/page}.tsx`
render `components/StudentRecords.tsx`; its student/teacher presentations are
`StudentMocktests.tsx` and `TeacherMocktests.tsx`. `learningApi` uses no-store.
Pages themselves perform no Mocktest server fetch. No subscription, pagination,
shared data cache or cross-user deduplication exists on this path. Development
Strict Mode/remounts can issue additional requests: these figures are one mounted
load, not an unconditional browser-wide request count.

`GET /api/learning/records?kind=mocktests`: admin gets up to 500 documents,
without a submittedAt orderBy, followed by all users whose role is student.
This is not all user roles. Other approved roles get only studentId == actor.id,
up to 500 records, no student-directory query. Teachers/assistants cannot save
feedback; only admin can. Only students can submit. currentAccount, approval and
origin checks are unchanged.

Each endpoint additionally invokes currentAccount -> findAccount -> one users
email query with limit(1). Cold dashboard entry also invokes LearningGate's
session endpoint, with its own user lookup, plus existing authentication and
navigation work. These are outside module benchmark counts. No duplicate
Mocktest server/client read found. No claim is made for total dashboard billing.

| Operation (admin, baseline) | Module HTTP | SDK operations excluding actor | Mock results | Full refetch |
|---|---:|---|---|---|
| Initial | 1 GET | 2 queries | R + S | n/a |
| Refresh | 1 GET | 2 queries | R + S | yes |
| Save feedback | POST + GET | update + 2 queries | R + S | yes |
| Search/filter/sort | 0 | 0 | 0 | no |

R = returned records <= 500; S = all student user documents. Empty queries,
transaction retries, indexes, auth, transport and billing are not modeled.

`FeedbackMonitoring.tsx` also contains legacy Mocktest statistics queries
(classes + teachers + submittedAt range; requery on filters), but no imports or
render sites were found. Do not activate or refactor it in this PR.

## Changes

- Skip student directory query when every returned record has a truthy embedded
  studentName, including empty list. Existing components prefer those names.
- Retain role-filtered directory fallback if any record lacks a name. This is
  intentionally partial optimization: no uncontrolled N+1, name substitution,
  new index, malformed ID filtering, silent document omission or cache.
- Feedback POST transaction reads one document, updates only feedback, teacherId
  and feedbackByName, returns the server snapshot merged with those exact changes
  only after commit acknowledgment. Native fields are not rewritten; submittedAt
  uses the same serialization as GET. Existing timestamps/audit fields are kept;
  no new timestamp or storage field is introduced.
- Additive response record and SHA-256 recordVersion; optional expectedVersion
  guards the three feedback-owned fields in the transaction, returning 409 on
  conflict. Token is not an authorization credential. Legacy clients can omit it
  and retain last-writer-wins. All upgraded UI writes include it after GET/save.
  Content token does not detect ABA changes that restore exactly the same fields.
- Only replace matching local record after acknowledged success. No optimistic
  write or full GET after feedback. Missing/mismatched response is an error.
- Invalidate old GET at mutation start; disallow refresh while saving; synchronous
  save guard; key request/form state by account ID + role + kind; ignore unmounted
  results. Student submission deliberately keeps its prior GET/limit behavior.
- Refresh updates feedback textarea defaults using version key, while failed saves
  keep list and draft. Existing visual language is unchanged.

## Benchmark (same fixtures, before source from a4872e0)

Run `node scripts/test-mocktest-optimization.cjs` for complete JSON metrics.
Five reused students or N distinct students, with/without legacy missing names,
were exercised. All figures below are module mock document results, not billed
Firestore reads. One transaction attempt per success in benchmark.

| Records | Unique students | Legacy missing names | Initial before -> after | Feedback before -> after |
|---:|---:|---|---:|---:|
| 100 | 5 | no | 105 -> 100 | 105 -> 1 |
| 100 | 5 | yes | 105 -> 105 | 105 -> 1 |
| 100 | 100 | no | 200 -> 100 | 200 -> 1 |
| 100 | 100 | yes | 200 -> 200 | 200 -> 1 |
| 500 | 5 | no | 505 -> 500 | 505 -> 1 |
| 500 | 5 | yes | 505 -> 505 | 505 -> 1 |
| 500 | 500 | no | 1000 -> 500 | 1000 -> 1 |
| 500 | 500 | yes | 1000 -> 1000 | 1000 -> 1 |

Initial HTTP 1 -> 1. Initial queries 2 -> 1 with complete names; otherwise 2 -> 2.
Feedback HTTP 2 -> 1; queries 2 -> 0; targeted get calls 0 -> 1; student lookups
S -> 0; full-list feedback refetch 1 -> 0; write count remains one. Including
the unchanged actor query per HTTP, successful feedback logical results decrease
from R + S + 2 to 2 (when actor exists). Actual SDK transaction retries can add reads.
In isolation, feedback POST adds a document read relative to the old write-only
POST; savings assume the actual old UI's POST + full GET workflow.

## Parity and deferred work

Record IDs, returned count, server selection and order are unchanged. Legacy
embedded names win, fallback retains role filter; duplicate IDs do not cause
repeated lookup. Missing students stay visible. Malformed/missing student IDs or
dates are not removed. Existing malformed types that break UI formatting are not
silently repaired. Search retains case-insensitive substring name/ID matching.
Admin/teacher sort still prefers date, student prefers submittedAt. Counts/status
filters still operate over the original loaded set, not global collection counts.

Pagination is NO-GO in this PR. Current search is global over the selected <=500
records, not the entire collection above that cap. Smaller pages cannot preserve
that search/count semantics without more work. submittedAt orderBy excludes
missing-field documents; legacy fallback sort, canonical types, stable ID tiebreak,
authorization-scoped cursors, concurrent insert/delete/edit behavior and global
counts/search need a separate design and migration/index feasibility decision.
No claim that current cap selects the globally latest 500.

Targeted missing-name lookups remain deferred. Direct get/getAll can cost more
for missing documents and cannot blindly replace role == student membership.
Chunked filtered ID queries need benchmark/index compatibility evidence. No
cross-user cache is added. Measure actual R/S, missing-name fraction, latency,
refresh/search frequency and billing before deciding further work.

## Verification and limitations

Baseline 35/35 scripts PASS before edits. Final 36/36 scripts PASS, including new
Mocktest tests; TypeScript --noEmit --incremental false exit 0; git diff --check
exit 0. Tests transpile actual route/component with allowlisted dependencies and
mock browser FormData, Firestore, auth and HTTP boundaries. Coverage: role access,
401/origin, missing dates/names/students, duplicates/malformed data preservation,
search selection parity, save success/failure, commit retry, concurrent expected
version conflict, unchanged unrelated records, stale GET, duplicate submit guard,
refresh failure, account switch and unmount isolation. Existing presentation
scripts cover teacher/student filters, dates, safe links and read-only feedback.

No browser E2E, Firebase emulator, Admin IAM/real contention integration or
production billing measurements were performed. Boundary tests do not prove all
real SDK timings. runTransaction exists in the existing mockAdminDb adapter;
node:crypto is server-only, erased DocumentSnapshot types are not client imports.
Old clients omitting expectedVersion remain compatible, not concurrency-protected.
Network loss after commit remains an unknown outcome: UI keeps data/draft and
requires explicit refresh; there is no blind retry or durable operation ledger.

Scope: records route, StudentRecords, MocktestRecord optional type, new regression
script, daily-notes-removal test's transaction mock, and this report. Other dirty
Accounts/Notifications/test files are pre-existing/unrelated; preserve them and do
not include them in a Mocktest-only PR. Accounts read model stays inactive.

Decision: GO for Mocktest-only code review/integration after review of these
limitations. NO-GO for immediate production deployment based only on offline
tests: require controlled non-production SDK/browser smoke tests and conflict/
session-switch checks first. Do not start another phase automatically.