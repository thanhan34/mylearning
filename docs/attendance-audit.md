# Attendance audit (read only)

Admin and admin_support share the AttendanceAudit screen. The attendance and feedback tabs read the current environment's homework data; they no longer show a hardcoded workday or a simulated close-period button. Student approval in AdminSupportPreview uses the live accounts API in the current environment.

## Support admin account permissions

- Only admin may grant/revoke `admin_support` using the role selector in the staff directory. Role changes clear feedback assignments; conversion to student requires approval again. Admin accounts cannot be changed by this endpoint.
- `admin_support` may list student accounts only and approve students through `/api/learning/accounts`. The support UI hides staff, role selectors and feedback assignments. API authorization enforces the same restrictions independently of the UI.
- Approval rechecks the actor's current stored role and the target's student role within the transaction, and records `approvedBy` and `approvedAt`. Support cannot change roles or assign feedback types, including through manually crafted requests.

## Limits and reads

- Staff: 10 results; query limit 11 for next-page detection.
- Day: 5 homework documents; query limit 6. Date is mandatory. No whole-period scan.
- Detail: 20 embedded submissions returned per request. Reads one homework document and one staff document. This is array slicing, NOT a Firestore query offset. Firestore still reads the entire homework document because submissions are embedded.
- Each request also performs currentAccount's account lookup (limit 1). Approximate maximum document results read: staff 12, day 8, detail 3. These are not billing guarantees: minimum query charges, index reads, retries and other application traffic are separate.
- Browser cache: account/role/path-scoped, 60-second TTL, existing bounded cache of 200 entries with in-flight deduplication. Logout/account changes clear it. Successful learning API mutations invalidate attendance entries.
- Manual refresh has a 60-second UI cooldown. No realtime listeners, polling, automatic prefetch of every page, automatic retry or total-count query.
- The cooldown is not a server rate limiter or a project-wide quota cap. Monitor production Firestore usage. Other existing screens (including account management) are not optimized by this change.

## Correctness boundaries

### Date-range statistics

Selecting a staff member displays a date-range statistics form, defaulting to the current 21–20 period through today (Vietnam time). GET mode=range accepts inclusive submission dates, at most 31 days. It reads at most 6 homework documents per request and returns aggregates for 5, ordered by date/document ID. A scoped cursor includes staff, range and current assigned types; changing those requires restarting.

The range response includes dailyRows aggregated by submission date and exercise type, alongside whole-range rows, using the same bounded reads. The shared admin/admin_support UI merges daily rows across pages (including a day split across pages) and defaults to daily details, with a summary tab. Tables are only displayed after the range is fully loaded. Each row shows total submissions, own authored feedback, feedback percentage, in-deadline feedback and in-deadline percentage. Zero-submission dates/types are filled on the client and show zero counts and a dash for percentages; they do not imply attendance. Current assignments remain the scope, not historical assignments.

The user starts loading the selected range; the loader requests pages sequentially, pausing after at most 100 pages (500 homework documents) per run, or when stopped by the user. Loading can resume from the saved cursor. Tables remain hidden until nextCursor is null and loading has finished without errors. Totals count submissions of currently assigned types; feedback counts only nonblank feedback authored by the selected staff member, including late feedback. In-deadline counts are separate. Percentages use summed counts, not average daily percentages. Zero denominators display a dash. This is not a historical snapshot or proof of attendance; edits between page reads can affect totals. The existing account-scoped 60-second cache applies. No feedback text is returned for statistics.

Only admin/admin_support may call GET /api/learning/attendance. This grants read access, not role management or feedback editing. Cursor scope binds day pagination to staff and date. Details require a hash of the homework contents and current assignments; edits produce 409 instead of mixing versions between pages.

Timing uses Asia/Ho_Chi_Minh (UTC+7). For teachers and assistants, deadline is the earlier of end of submission date + 3 calendar days and end of day 20 of the associated 21–20 period. Empty feedback, another author, missing/invalid timezone, and late feedback are distinguished. Feedback after the deadline can still be saved to support students, but does not count as in-deadline feedback for attendance.

All ratios are provisional per homework document and exercise type. No full-day or monthly attendance conclusion is derived from a page. Duplicate legacy homework documents are not merged into one student/day calculation. Current assignments and latest feedback cannot establish historical assignments or earlier feedback versions. No attendance snapshots, actual period closing, historical migration or payroll writes are implemented.

## Validation

Run node scripts/test-attendance-audit.cjs, node scripts/test-admin-attendance.cjs, node scripts/test-attendance-guide.cjs and npx tsc --noEmit --incremental false.

Mock integration tests cover multiple staff/homework/detail pages, role denial, cursor scope, stale versions and deadline boundaries. Production Firestore quota/index behavior still requires deployment validation; mock tests do not measure billed reads.