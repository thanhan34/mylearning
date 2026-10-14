# Account-based learning rollout

## Model
- New Google sign-ins create a student account with `approvalStatus: pending`.
- Only admin can approve accounts, change roles, or assign `assignedFeedbackTypes`.
- Approved students can submit without classId/teacherId.
- Existing students without an explicit status retain access only if they already have a classId or teacherId. Explicit pending always denies access.
- Teacher/assistant assignments default to empty (deny feedback). Admin must assign types after rollout.
- Text feedback is editable by its author or admin. Legacy feedback without an author is admin-editable only. Voice feedback is separately attributed.
- Class documents and old class fields are retained for historical recovery, not authorization. Old class entry points display the new workspace.
- Mocktests have no individual exercise type: students submit their own; admin provides feedback. Staff are not implicitly granted mocktest feedback by a homework type assignment.
- Staff with at least one assigned type may append student learning notes; notes never overwrite another person's record.

## Deployment prerequisites
1. Back up Firestore before rollout. Deploy application and Firestore rules together in a maintenance window.
2. Configure server-only `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, or Google Application Default Credentials. Existing `GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY` are accepted as a fallback, but that service account must belong to / have access to the Firebase project and be authorized to sign Firebase tokens. Never expose these as NEXT_PUBLIC variables.
3. Verify Firebase Authentication is enabled. The server exchanges the authenticated NextAuth identity for a Firebase custom token whose UID is the existing users document ID.
4. Deploy `firestore.rules` and existing indexes with Firebase CLI using the correct project. No remote deployment is performed by this source change.
5. Admin opens Account & permissions, approves pending students, then assigns feedback types to each staff account. There is no automatic assignment inferred from historical classes.
6. Existing browsers should sign out and sign back in. Verify with real admin/student/teacher/assistant accounts before reopening access.

## Validation
- `node scripts/test-learning-access.cjs`
- `node scripts/test-homework-links.cjs`
- `npx tsc --noEmit`
- `npm run build`
- Manual: new student sees only pending screen; approved student without class submits; staff RA-only can read/write RA across students but cannot access DI through UI or API; revocation rejects subsequent writes; direct Firestore account privilege and homework writes are denied; student cannot read others' records; concurrent feedback writes do not overwrite other submissions.

## Limits
- Feedback list currently returns up to 500 daily documents (last 30 days unless a specific date is selected); a warning requests date filtering when truncated.
- Voice recording is limited to 60 seconds / approximately 650 KB, stored in the existing Firestore base64 format.
- Rules emulator and signed-in browser end-to-end tests require a configured Firebase test project; pure policy tests do not replace those checks.