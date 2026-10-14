# Student directory and homework history

- Entry: Học viên in the admin/teacher/assistant navigation, at `/dashboard/teacher/students`.
- Staff can read every student's submitted homework across exercise types and dates. This is an intentional read-only expansion from the type-filtered feedback workspace. Feedback writes still require assigned types and existing authorship rules. Students cannot call this directory API.
- Mocktests and unsubmitted assignments are not part of the homework collection/history.
- Directory returns 20 students, with a 21-document query to detect a next page. Only public directory fields (id/name/email) are returned.
- Selecting a student reads their account and up to 21 homework documents, displaying 20 daily records. Each daily record can contain multiple exercises. Authorization account reads are additional.
- No offsets, counts, realtime listeners, polling or automatic history scanning. Back/refresh performs a fresh bounded request. Client filters only filter the current page and do not query while typing.
- Homework cursor includes student ID, date and document ID; ties use descending document ID. Old history is not restricted to 30 days. Records must have the existing `date` field.
- Uses existing `homework: userId ASC, date DESC` index (implicit document-ID order is DESC). Ensure that index is deployed and ready before release. Default single-field role index supports the directory. No rules expansion is needed: access is through the authenticated server API, not direct client Firestore access.
- Existing shared UI tokens and Card/Button/Input are reused without changing the visual theme.

## Missing-index recovery

- If the directory loads but selecting a student fails, inspect server logs for Firestore code `9` and `The query requires an index`. The API returns `503` with `FIRESTORE_INDEX_NOT_READY` for this condition, without exposing private diagnostics or console links.
- In the Firebase project used by the server, open Firestore Database > Indexes and create a composite index for collection `homework`, query scope `Collection`, with `userId` ascending and `date` descending. The implicit document-ID order is descending. This definition already exists in `firestore.indexes.json`; having the file locally does not create the deployed index.
- Wait for the index to become ready, then reload the student's homework. Do not broaden student permissions or replace pagination with an unbounded collection scan.
- Creating the index requires an authorized Firebase/Google Cloud operator. Application admin/assistant roles do not grant infrastructure permissions. A server credential that can read homework can still receive `403 PERMISSION_DENIED` when creating an index.
- On September 29, 2026, the configured project's directory query succeeded, the history query returned the missing-index error, and an attempt to create only the required index was denied with HTTP 403. No index was created by that attempt.

## Test commands

- `node scripts/test-student-directory.cjs` (mocked server route; no Firebase reads/writes)
- `node scripts/test-learning-access.cjs` (existing feedback policy)
- `npx tsc --noEmit --incremental false`
- `npm run build`
- Signed-in acceptance: teacher and assistant with no feedback types can browse students and old homework but cannot edit feedback; assigned staff can edit only authorized feedback; student receives 403; try >20 students and >20 homework days, including equal-date records, empty history, refresh and rapid navigation.

Pagination bounds each request, not total usage. Quota still depends on traffic, other features, and record size. Production Firebase/index and browser acceptance checks are separate from mocked tests.