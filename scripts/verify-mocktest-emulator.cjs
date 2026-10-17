// Real SDK / real HTTP / browser fixtures. No module mocks or production credentials.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const req = createRequire(path.resolve(__dirname, '../package.json'));
const { chromium } = require(process.env.MOCKTEST_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:3103';
const project = 'demo-mocktest-phase43';
const artifactDir = process.env.MOCKTEST_ARTIFACT_DIR;
assert.ok(artifactDir && path.isAbsolute(artifactDir), 'Set an absolute MOCKTEST_ARTIFACT_DIR outside the repository');
fs.mkdirSync(artifactDir, { recursive: true });
const commit = require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }).trim();
const results = [];
let browser, db;
const check = async (name, fn) => { await fn(); results.push({ name, status: 'PASS' }); console.log('PASS: ' + name); };
async function main() {
  for (const name of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_PRIVATE_KEY', 'GOOGLE_PRIVATE_KEY', 'FIREBASE_TOKEN']) assert.ok(!process.env[name], 'Refuse credentials: ' + name);
  const hub = await (await fetch('http://127.0.0.1:4403/emulators')).json();
  assert.equal(hub.firestore.host, '127.0.0.1'); assert.equal(hub.firestore.port, 8080);
  assert.equal(hub.auth.host, '127.0.0.1'); assert.equal(hub.auth.port, 9099);
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const { initializeApp } = req('firebase-admin/app');
  const { getFirestore, Timestamp } = req('firebase-admin/firestore');
  const { getAuth } = req('firebase-admin/auth');
  const app = initializeApp({ projectId: project }); db = getFirestore(app);
  const { encode } = req('next-auth/jwt');
  const secret = 'local-fixture-secret-never-for-production-43';
  const cookies = {};
  for (const role of ['admin', 'student', 'teacher', 'assistant', 'admin_support']) {
    const email = role + '@phase43.example.test';
    await db.collection('users').doc(role).set({ email, name: 'Fixture ' + role, role, approvalStatus: 'approved' });
    try { await getAuth(app).createUser({ uid: role, email }); } catch (error) { if (error.code !== 'auth/uid-already-exists' && error.code !== 'auth/email-already-exists') throw error; }
    cookies[role] = await encode({ secret, token: { email, name: 'Fixture ' + role, id: role, role } });
  }
  async function api(role, body) {
    const r = await fetch(origin + '/api/learning/records' + (body ? '' : '?kind=mocktests'), {
      method: body ? 'POST' : 'GET', headers: { ...(role ? { cookie: 'next-auth.session-token=' + cookies[role] } : {}), 'content-type': 'application/json', origin },
      ...(body ? { body: JSON.stringify({ kind: 'mocktests', ...body }) } : {}),
    });
    return { status: r.status, data: await r.json() };
  }
  const ref = db.collection('mocktests').doc('fixture');
  const submittedAt = new Timestamp(1790000000, 123456789);
  const seed = { studentId: 'student', studentName: 'Embedded fixture', link: 'https://example.test/result', feedback: 'Original', submittedAt, unrelated: { preserved: true, at: submittedAt } };
  await ref.set(seed);
  // Compare with the persisted baseline: the emulator truncates sub-microsecond
  // precision on initial persistence, before the feedback route runs.
  const persistedSeed = (await ref.get()).data();
  console.log('PERSISTED_TIMESTAMP=' + JSON.stringify({ seconds: persistedSeed.submittedAt.seconds, nanoseconds: persistedSeed.submittedAt.nanoseconds, requestedNanoseconds: submittedAt.nanoseconds }));
  await check('Complete embedded names omit directory results', async () => {
    const r = await api('admin'); assert.equal(r.status, 200); assert.deepEqual(r.data.students, []); assert.equal(r.data.records[0].studentName, seed.studentName);
  });
  await check('Legacy name fallback through real Firestore query', async () => {
    const { FieldValue } = req('firebase-admin/firestore'); await ref.update({ studentName: FieldValue.delete() });
    const r = await api('admin'); assert.equal(r.status, 200); assert.ok(r.data.students.some(s => s.id === 'student' && s.name === 'Fixture student'));
    await ref.update({ studentName: seed.studentName });
  });
  await check('Authorization and actor-scoped reads', async () => {
    assert.equal((await api(null)).status, 401);
    for (const role of ['student', 'teacher', 'assistant', 'admin_support']) {
      assert.equal((await api(role, { id: 'fixture', feedback: 'Forbidden' })).status, 403);
      const r = await api(role); assert.equal(r.status, 200); assert.equal(r.data.records.length, role === 'student' ? 1 : 0);
    }
  });
  await check('Concurrent feedback: one committed 200 and one 409', async () => {
    const expectedVersion = (await api('admin')).data.records[0].recordVersion;
    const r = await Promise.all(['Concurrent A', 'Concurrent B'].map(feedback => api('admin', { id: 'fixture', feedback, expectedVersion })));
    assert.deepEqual(r.map(x => x.status).sort(), [200, 409]);
    const winner = r.find(x => x.status === 200).data.record;
    const current = (await ref.get()).data(); assert.equal(current.feedback, winner.feedback);
    assert.equal(winner.teacherId, 'admin'); assert.equal(winner.feedbackByName, 'Fixture admin');
  });
  await check('Native Timestamp/nanoseconds and unrelated fields preserved', async () => {
    const current = (await ref.get()).data(); assert.ok(current.submittedAt.isEqual(persistedSeed.submittedAt));
    assert.ok(current.unrelated.at.isEqual(persistedSeed.unrelated.at)); assert.equal(current.unrelated.preserved, true);
  });
  await check('Real SDK transaction retry under contention', async () => {
    // Separate SDK retry probe: does NOT prove the route callback was retried.
    const counter = db.collection('integration').doc('retry'); await counter.set({ n: 0 }); let callbacks = 0;
    await Promise.all(Array.from({ length: 4 }, () => db.runTransaction(async tx => {
      callbacks++; const snap = await tx.get(counter); await new Promise(r => setTimeout(r, 80)); tx.update(counter, { n: snap.data().n + 1 });
    }, { maxAttempts: 10 })));
    assert.equal((await counter.get()).data().n, 4); assert.ok(callbacks > 4, 'No retry observed');
    console.log('SDK_RETRY_CALLBACKS=' + callbacks);
  });
  browser = await chromium.launch({ executablePath: process.env.MOCKTEST_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext();
  const blocked = new Set();
  await context.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname !== '127.0.0.1' || !['3103', '8080', '9099'].includes(u.port)) { blocked.add(u.hostname); return route.abort(); }
    return route.continue();
  });
  await context.addCookies([{ name: 'next-auth.session-token', value: cookies.admin, url: origin }]);
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  let listGets = 0; page.on('request', r => { if (r.url().includes('/api/learning/records?') && r.method() === 'GET') listGets++; });
  await page.goto(origin + '/dashboard/mocktest/admin');
  const textarea = page.getByRole('textbox', { name: 'Feedback mocktest' });
  await textarea.waitFor();
  await check('Browser admin save updates DOM without full-list GET', async () => {
    const before = listGets; await textarea.fill('Browser committed feedback'); await page.getByRole('button', { name: 'Lưu feedback', exact: true }).click();
    await page.getByText('Đã lưu thành công.', { exact: true }).waitFor();
    assert.equal((await ref.get()).data().feedback, 'Browser committed feedback'); assert.equal(listGets, before);
    assert.equal(await textarea.inputValue(), 'Browser committed feedback');
  });
  await check('Browser 409 retains draft; explicit reload gets server record', async () => {
    await textarea.fill('Unsaved browser draft');
    const version = (await api('admin')).data.records[0].recordVersion;
    assert.equal((await api('admin', { id: 'fixture', feedback: 'External committed feedback', expectedVersion: version })).status, 200);
    await page.getByRole('button', { name: 'Lưu feedback', exact: true }).click();
    await page.getByText('Mocktest đã thay đổi. Bấm Tải lại trước khi lưu feedback.', { exact: true }).waitFor();
    assert.equal(await textarea.inputValue(), 'Unsaved browser draft');
    await page.getByRole('button', { name: 'Tải lại', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('textarea')?.value === 'External committed feedback');
  });
  await check('Browser transport failure retains draft and leaves server unchanged', async () => {
    const before = (await ref.get()).data().feedback;
    await textarea.fill('Draft retained on transport failure');
    await page.route('**/api/learning/records', route => route.request().method() === 'POST' ? route.abort('failed') : route.continue());
    await page.getByRole('button', { name: 'Lưu feedback', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('p[role="status"]')?.textContent?.includes('fetch'));
    assert.equal(await textarea.inputValue(), 'Draft retained on transport failure');
    assert.equal((await ref.get()).data().feedback, before);
    await page.unroute('**/api/learning/records');
    await page.reload(); await textarea.waitFor();
    assert.equal(await textarea.inputValue(), before);
  });
  await check('Browser teacher/student roles have no feedback save; direct request denied', async () => {
    for (const role of ['teacher', 'student']) {
      await context.addCookies([{ name: 'next-auth.session-token', value: cookies[role], url: origin }]);
      await page.goto(origin + (role === 'teacher' ? '/dashboard/mocktest/teacher' : '/dashboard/mocktest'));
      await page.waitForResponse(r => r.url().includes('/api/learning/records?') && r.status() === 200);
      assert.equal(await page.getByRole('button', { name: 'Lưu feedback', exact: true }).count(), 0);
      const status = await page.evaluate(async () => (await fetch('/api/learning/records', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'mocktests', id: 'fixture', feedback: 'forbidden browser' }),
      })).status);
      assert.equal(status, 403);
    }
  });
  assert.equal(blocked.size, 0, 'Browser attempted unexpected external networking');
  fs.writeFileSync(path.join(artifactDir, 'browser-network.json'), JSON.stringify({ blockedExternalHosts: [...blocked], listGets, note: 'External browser networking denied; explicit Web SDK emulator wiring enabled. No external host requests observed.' }, null, 2));
  await page.screenshot({ path: path.join(artifactDir, 'mocktest-browser.png'), fullPage: true });
}
main().catch(error => { results.push({ name: 'Execution failure', status: 'FAIL', error: error.message }); console.error(error); process.exitCode = 1; }).finally(async () => {
  fs.writeFileSync(path.join(artifactDir, 'integration-results.json'), JSON.stringify({ commit, results, limitations: ['Fixture NextAuth JWT, no Google OAuth login exercised', 'Browser SDK configured for loopback emulators; direct browser Auth sign-in not exercised', 'Route-specific retry and account switching during GET/save not yet evidenced'] }, null, 2));
  if (browser) await browser.close(); if (db) await db.terminate();
});