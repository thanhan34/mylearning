# Local mock data

Run `npm run dev:mock` from the application directory, then open `/login`.
Choose Admin, Teacher, Assistant, Student, or Pending Student. No Google login,
Firebase credentials, Java, emulator, or additional packages are needed for mock data.
Keep the existing NextAuth configuration; if no NEXTAUTH_SECRET is configured,
add a local development secret to `.env.local` for stable sessions.

`npm run dev` uses the normal backend unless `.env.local` explicitly contains
`NEXT_PUBLIC_USE_MOCK_DATA=true`. Restart Next.js after changing modes and sign out
of the previous account. Mock mode is disabled unless NODE_ENV is development;
production builds never expose passwordless demo accounts or the mock endpoint.

The seeded data includes six users, a class, an assignment, seven days of homework
with/without feedback, a mocktest, a daily note, and a notification. Dates are
relative to server startup. Example links are placeholders, not real submissions.
Edit `lib/mock/seed.ts` to customize the fixtures.

Browser reads/writes and existing server APIs share one in-memory store through
`/api/mock-data`. Changes survive page refreshes and are shared across local tabs.
Restart the development process to reset; no production Firestore documents are
read, written, or deleted. Hot reload may retain the store. This is intended for
a single local Next.js process, not multiple workers or a deployed service.

Supported operations cover this app's reads, filters, ordering, cursors, limits,
document writes, array transforms, batches, transactions (optimistic retries),
and listeners (local polling every 1.5 seconds). This is not a full Firestore
emulator: it does not test security rules, indexes, offline persistence, or exact
SDK timing. The local SDK endpoint is deliberately permissive for demo users;
the existing learning APIs still perform their authorization checks.

Firebase file uploads are blocked in mock mode. Other external services, such as
Cloudinary and external submission links, are not mocked. Avoid uploading real
files while testing. Run `npm run test:mock` to test the local store and adapters.