// Isolated tests: no Firebase credentials or production reads/writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(file, imports = {}, browser = true) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, Date, URL, console, ...(browser ? { window: {} } : {}),
    require: name => {
      if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
      return imports[name];
    },
  }, { filename: file });
  return exports;
}

async function main() {
  const cache = load('lib/client-cache.ts');
  let reads = 0;
  const loader = async () => ++reads;
  await Promise.all([cache.cachedRequest('same', 1000, loader), cache.cachedRequest('same', 1000, loader)]);
  assert.equal(reads, 1, 'Concurrent requests must share one read');
  await cache.cachedRequest('same', 1000, loader);
  assert.equal(reads, 1, 'Fresh values must be reused');
  cache.invalidateCache('same');
  await cache.cachedRequest('same', 1000, loader);
  assert.equal(reads, 2, 'Invalidation must force a fresh read');
  await cache.cachedRequest('expired', 0, loader);
  await cache.cachedRequest('expired', 0, loader);
  assert.equal(reads, 4, 'Expired entries must be reloaded');
  await assert.rejects(cache.cachedRequest('error', 1000, async () => { throw new Error('quota'); }));
  assert.equal(await cache.cachedRequest('error', 1000, async () => 'ok'), 'ok', 'Failures must not be cached');
  let resolveOld;
  const old = cache.cachedRequest('race', 1000, () => new Promise(resolve => { resolveOld = resolve; }));
  await Promise.resolve();
  cache.invalidateCache('race');
  await cache.cachedRequest('race', 1000, async () => 'new');
  resolveOld('old');
  await old;
  assert.equal(await cache.cachedRequest('race', 1000, loader), 'new', 'Old reads must not repopulate invalidated cache');
  const server = load('lib/client-cache.ts', {}, false);
  let serverReads = 0;
  await server.cachedRequest('user', 1000, async () => ++serverReads);
  await server.cachedRequest('user', 1000, async () => ++serverReads);
  assert.equal(serverReads, 2, 'Server must not cache account data across requests');

  const queries = [];
  const firestore = {
    collection: (_db, name) => name,
    where: (...args) => ({ where: args }),
    orderBy: (...args) => ({ orderBy: args }),
    limit: value => ({ limit: value }),
    query: (...args) => args,
    getDocs: async query => {
      queries.push(query);
      return { empty: false, docs: [{ data: () => ({ date: '2026-09-27', submissions: [{ link: 'https://example.com' }] }) }] };
    },
  };
  const imports = { '@/app/firebase/firestore': firestore, '../config': { db: {} }, '@/lib/client-cache': cache };
  const progress = load('app/firebase/services/progress.ts', imports);
  await progress.getHomeworkProgress('student', 45);
  assert(queries.at(-1).some(c => c.where?.[0] === 'date' && c.where[1] === '>='));
  const count = queries.length;
  await progress.getHomeworkProgress('student', 45);
  assert.equal(queries.length, count);
  await progress.getHomeworkProgress('student');
  assert(!queries.at(-1).some(c => c.where?.[0] === 'date'), 'Legacy calendar retains full history');
  await progress.getWeeklyProgress('student');
  assert(queries.at(-1).some(c => c.where?.[0] === 'date' && c.where[1] === '>='));
  await progress.getDailyProgress('student');
  assert(queries.at(-1).some(c => c.where?.[0] === 'date' && c.where[1] === '=='));
  const homework = load('app/firebase/services/homework.ts', {
    ...imports, '@/lib/learning-api': { learningApi: async () => ({}) },
  });
  await homework.getHomeworkSubmissions('student');
  assert(queries.at(-1).some(c => c.limit === 1), 'Latest submission only reads one document');

  for (const file of ['app/dashboard/page.tsx', 'app/components/HomeworkProgress.tsx',
    'app/dashboard/class/components/InlineStudentSubmissions.tsx', 'components/LearningGate.tsx']) {
    assert(!fs.readFileSync(path.join(root, file), 'utf8').includes('setInterval('), `${file}: no background polling`);
  }
  JSON.parse(fs.readFileSync(path.join(root, 'firestore.indexes.json'), 'utf8'));
  const calls = [];
  const chain = {};
  for (const method of ['limit', 'where', 'orderBy', 'startAfter']) {
    chain[method] = (...args) => { calls.push([method, ...args]); return chain; };
  }
  chain.get = async () => ({ size: 21, docs: Array.from({ length: 21 }, (_, i) => ({
    id: `doc-${i}`, data: () => ({ userId: 'student', date: '2026-09-27', submissions: [{ type: 'Read aloud' }] }),
  })) });
  const account = { id: 'teacher', role: 'teacher', assignedFeedbackTypes: ['Read aloud'] };
  class AccessError extends Error { constructor(message, status) { super(message); this.status = status; } }
  const route = load('app/api/learning/homework/route.ts', {
    'next/server': { NextResponse: { json: body => body } },
    'firebase-admin/firestore': { Timestamp: {}, FieldPath: { documentId: () => '__name__' } },
    crypto: { randomUUID: () => 'test' },
    '@/lib/server/firebase-admin': { adminDb: () => ({ collection: () => chain }) },
    '@/lib/server/access': { currentAccount: async () => account, AccessError, apiError: error => ({ error: error.message }), checkOrigin: () => {} },
    '@/lib/learning-access': { canFeedback: () => true },
    '@/lib/homework-links': {},
  }, false);
  const first = await route.GET({ url: 'https://example.com/api/learning/homework?paged=1&date=2026-09-27' });
  assert.equal(first.homework.length, 20);
  assert.equal(first.nextCursor, 'doc-19');
  assert(calls.some(call => call[0] === 'limit' && call[1] === 21));
  await route.GET({ url: 'https://example.com/api/learning/homework?paged=1&date=2026-09-27&after=doc-19' });
  assert(calls.some(call => call[0] === 'startAfter' && call[1] === 'doc-19'));
  assert((await route.GET({ url: 'https://example.com/api/learning/homework?paged=1' })).error);
  account.assignedFeedbackTypes = [];
  calls.length = 0;
  assert.equal((await route.GET({ url: 'https://example.com/api/learning/homework?paged=1&date=2026-09-27' })).homework.length, 0);
  assert.equal(calls.length, 0, 'Unassigned staff must not scan homework');
  console.log('PASS: feedback pagination, cursor, validation, unassigned staff');
  let accountReads = 0;
  let update;
  const feedbackRoute = load('app/api/learning/feedback/route.ts', {
    'next/server': { NextResponse: { json: body => body } },
    '@/lib/server/access': {
      currentAccount: async () => { accountReads++; return { id: 'teacher' }; },
      AccessError, apiError: error => ({ status: error.status }), checkOrigin: () => {},
    },
    '@/lib/learning-access': { canFeedback: () => true, canEditFeedback: () => true },
    '@/lib/server/firebase-admin': { adminDb: () => ({
      collection: name => ({ doc: id => ({ name, id }) }),
      runTransaction: callback => callback({
        get: async ref => ({ exists: true, data: () => ref.name === 'users'
          ? { name: 'Teacher', role: 'teacher' }
          : { submissions: [{ id: 'sub', type: 'Read aloud', questionNumber: 1, feedback: '' }] } }),
        update: (_ref, value) => { update = value; },
      }),
    }) },
  }, false);
  for (const body of [{ kind: 'voice' }, { audioUrl: 'data:audio/webm;base64,AAA' }]) {
    assert.equal((await feedbackRoute.POST({ json: async () => body })).status, 410);
  }
  assert.equal(accountReads, 0, 'Removed voice requests must not read Firestore accounts');
  assert.equal(feedbackRoute.DELETE, undefined, 'Voice deletion endpoint must be removed');
  const saved = await feedbackRoute.POST({ json: async () => ({
    documentId: 'homework', submissionId: 'sub', feedback: ' Good job ', expectedFeedback: '',
  }) });
  assert.equal(saved.success, true);
  assert.equal(update.submissions[0].feedback, 'Good job');
  assert.equal(saved.submission.feedbackBy, 'teacher');
  console.log('PASS: voice requests rejected without reads, voice DELETE removed, text feedback preserved');
  console.log('PASS: cache deduplication, TTL, invalidation, races, errors, server isolation, date filters, query limit, polling removal, indexes JSON');
}
main().catch(error => { console.error(error); process.exitCode = 1; });