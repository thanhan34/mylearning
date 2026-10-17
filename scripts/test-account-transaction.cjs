const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { MemoryAccountAdapter } = require('./lib/account-transaction-memory.cjs');
const cache = new Map();
function load(file) {
  const absolute = path.resolve(__dirname, '..', file);
  if (cache.has(absolute)) return cache.get(absolute);
  const exports = {};
  cache.set(absolute, exports);
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('exports', 'require', code)(exports, name => {
    if (name === 'node:crypto') return require(name);
    assert.ok(name.startsWith('.'), `Forbidden runtime import ${name}`);
    return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(absolute), name + '.ts')));
  });
  return exports;
}
const core = load('lib/accounts/transaction-core.ts');
const codec = load('lib/accounts/codec.ts');
const dir = load('lib/accounts/directory.ts');
const generation = 'mock-generation';
const paths = id => core.accountTransactionPaths(generation, id);
const summaryPath = paths('a').summary;
function fresh() {
  return new MemoryAccountAdapter({ [summaryPath]: { generation, schemaVersion: 1, codecVersion: 1, status: 'ready', counts: core.emptyAccountCounts() } });
}
let sequence = 0, checks = 0;
const benchmarks = [];
function request(id, kind, expectedRevision, extra = {}) {
  return { generation, id, kind, expectedRevision, operationId: `operation-${++sequence}`, ...extra };
}
async function expect(db, req, status = 'committed', code) {
  const result = await core.mutateAccount(db, req);
  assert.equal(result.status, status, JSON.stringify(result));
  if (code) assert.equal(result.code, code);
  checks++; return result;
}
function invariant(db) {
  const docs = db.dump(); let counts = core.emptyAccountCounts();
  for (const [key, state] of Object.entries(docs).filter(([key]) => key.includes('/state/'))) {
    const id = key.split('/').at(-1), p = paths(id), source = docs[p.source];
    if (state.deleted) {
      assert.equal(source, undefined); assert.equal(docs[p.entry], undefined); assert.equal(state.contribution, null);
    } else {
      const projection = dir.projectAccount(id, source);
      assert.deepStrictEqual(codec.decodeDirectory(docs[p.entry]), projection);
      assert.equal(state.sourceHash, codec.canonicalHash(source, 1));
      assert.equal(state.projectionHash, codec.canonicalHash(projection, 1));
      assert.deepStrictEqual(state.contribution, projection.contribution);
      const c = projection.contribution;
      for (const scalar of ['total', 'students', 'pendingStudents', 'approvedStudents', 'staff', 'rawRejected']) counts[scalar] += c[scalar];
      for (const map of ['byRole', 'byRoleApproval']) for (const [k, v] of Object.entries(c[map])) counts[map][k] = (counts[map][k] || 0) + v;
    }
  }
  assert.deepStrictEqual(docs[summaryPath].counts, counts);
}
async function main() {
  const db = fresh();
  const id = 'legacy_random@example_com', p = paths(id);
  const create = request(id, 'create', 0, { source: { role: 'student', name: 'Nguyễn 😀 e\u0301', email: 'a@x', classId: 'legacy' } });
  await expect(db, create); invariant(db);
  assert.equal(db.dump()[p.state].revision, 1);
  assert.equal(db.dump()[summaryPath].counts.approvedStudents, 1);
  benchmarks.push({ scenario: 'create', ...db.metrics });
  db.resetMetrics(); await expect(db, create, 'duplicate');
  assert.equal(db.metrics.committedWrites, 0);
  benchmarks.push({ scenario: 'duplicate', ...db.metrics });
  await expect(db, { ...create, source: { role: 'teacher' } }, 'rejected', 'OPERATION_ID_REUSED');
  db.resetMetrics();
  await expect(db, request(id, 'update', 1, { patch: { name: 'Updated', assignedFeedbackTypes: ['Read aloud'] } }));
  assert.equal(db.metrics.summaryWrites, 0); assert.equal(db.metrics.committedWrites, 3);
  benchmarks.push({ scenario: 'profile/types zero delta', ...db.metrics }); invariant(db);
  await expect(db, request(id, 'update', 2, { patch: { approvalStatus: null } }));
  assert.equal(db.dump()[summaryPath].counts.pendingStudents, 1); invariant(db);
  await expect(db, request(id, 'update', 3, { patch: { approvalStatus: 'approved' } })); invariant(db);
  await expect(db, request(id, 'update', 4, { patch: { approvalStatus: 'rejected' } }));
  assert.equal(db.dump()[summaryPath].counts.rawRejected, 1); invariant(db);
  await expect(db, request(id, 'update', 5, { patch: {}, unset: ['approvalStatus'] }));
  assert.equal(db.dump()[summaryPath].counts.approvedStudents, 1); invariant(db);
  db.resetMetrics(); await expect(db, request(id, 'update', 6, { patch: { role: 'teacher' } })); invariant(db);
  benchmarks.push({ scenario: 'role change', ...db.metrics });
  const deletion = request(id, 'delete', 7); db.resetMetrics();
  await expect(db, deletion); invariant(db); benchmarks.push({ scenario: 'delete', ...db.metrics });
  await expect(db, deletion, 'duplicate');
  await expect(db, request(id, 'create', 0, { source: { role: 'student' } }), 'rejected', 'REVISION_CONFLICT');
  await expect(db, request(id, 'create', 8, { source: { role: 'student' } })); invariant(db);
  await expect(db, deletion, 'rejected', 'REVISION_CONFLICT'); // Old receipt cannot delete recreation.
  await expect(db, request(id, 'create', 9, { source: {} }), 'rejected', 'ALREADY_EXISTS');
  await expect(db, request('absent', 'delete', 0), 'rejected', 'NOT_FOUND');
  await expect(db, request('absent', 'update', 0, { patch: {} }), 'rejected', 'NOT_FOUND');

  const retry = fresh(); retry.retryBeforeCommit = 2;
  await expect(retry, request('retry', 'create', 0, { source: { role: 'student' } }));
  assert.equal(retry.metrics.attempts, 3); assert.equal(retry.metrics.committedWrites, 4);
  assert.equal(retry.dump()[paths('retry').state].revision, 1); invariant(retry);
  benchmarks.push({ scenario: 'two retries', ...retry.metrics });
  for (const injection of ['failCommit', 'failAfterStagedWrites']) {
    const broken = fresh(); const before = broken.dump(); broken[injection] = injection === 'failCommit' ? true : 2;
    await expect(broken, request('failure', 'create', 0, { source: {} }), 'rejected', 'ADAPTER_FAILURE');
    assert.deepStrictEqual(broken.dump(), before); assert.equal(broken.metrics.committedWrites, 0);
  }
  const exhausted = fresh(); exhausted.retryBeforeCommit = 100; const exhaustedBefore = exhausted.dump();
  await expect(exhausted, request('retry', 'create', 0, { source: {} }), 'rejected', 'ADAPTER_FAILURE');
  assert.deepStrictEqual(exhausted.dump(), exhaustedBefore);

  const concurrent = fresh();
  const outcomes = await Promise.all(Array.from({ length: 5 }, (_, i) => core.mutateAccount(concurrent,
    request(`parallel-${i}`, 'create', 0, { source: { role: i % 2 ? 'teacher' : 'student' } }))));
  assert.ok(outcomes.every(r => r.status === 'committed')); assert.ok(concurrent.metrics.retries > 0);
  checks += outcomes.length; invariant(concurrent); benchmarks.push({ scenario: 'five concurrent creates', ...concurrent.metrics });
  const competing = await Promise.all(['first', 'second'].map(name => core.mutateAccount(concurrent,
    request('parallel-0', 'update', 1, { patch: { name } }))));
  assert.equal(competing.filter(r => r.status === 'committed').length, 1);
  assert.equal(competing.filter(r => r.code === 'REVISION_CONFLICT').length, 1); checks += 2; invariant(concurrent);
  const duplicateDb = fresh(), same = request('same', 'create', 0, { source: {} });
  const duplicates = await Promise.all([core.mutateAccount(duplicateDb, same), core.mutateAccount(duplicateDb, same)]);
  assert.deepStrictEqual(duplicates.map(r => r.status).sort(), ['committed', 'duplicate']); invariant(duplicateDb); checks += 2;

  for (const damage of ['missing-state', 'missing-entry', 'source-drift', 'state-count', 'state-version', 'entry-payload', 'summary-negative', 'summary-version', 'not-ready', 'tombstone']) {
    const broken = fresh(); await expect(broken, request('a', 'create', 0, { source: { role: 'student' } }));
    const a = paths('a');
    if (damage === 'missing-state') broken.documents.delete(a.state);
    if (damage === 'missing-entry') broken.documents.delete(a.entry);
    if (damage === 'source-drift') broken.documents.get(a.source).name = 'outside writer';
    if (damage === 'state-count') broken.documents.get(a.state).contribution = core.emptyAccountCounts();
    if (damage === 'state-version') broken.documents.get(a.state).codecVersion = 2;
    if (damage === 'entry-payload') broken.documents.get(a.entry).payload = 'broken';
    if (damage === 'summary-negative') broken.documents.get(a.summary).counts.total = -1;
    if (damage === 'summary-version') broken.documents.get(a.summary).schemaVersion = 2;
    if (damage === 'not-ready') broken.documents.get(a.summary).status = 'building';
    if (damage === 'tombstone') broken.documents.get(a.state).deleted = true;
    const before = broken.dump();
    await expect(broken, request('a', 'update', 1, { patch: { name: 'no' } }), 'rejected');
    assert.deepStrictEqual(broken.dump(), before);
  }
  const invalid = fresh();
  for (const source of [{ name: 'a'.repeat(5000) }, { name: {} }, { role: {} }, { unknown: undefined },
    { unknown: new Date() }, { unknown: [[1]] }, { name: '\ud800' },
    Object.defineProperty({}, 'role', { enumerable: true, get() { throw Error('getter invoked'); } })]) {
    const before = invalid.dump(); await expect(invalid, request('invalid', 'create', 0, { source }), 'rejected');
    assert.deepStrictEqual(invalid.dump(), before);
  }
  for (const id of ['a/b', '..', '', '\ud800']) await expect(invalid, request(id, 'create', 0, { source: {} }), 'rejected', 'INVALID_PATH');
  const missingSummary = new MemoryAccountAdapter();
  await expect(missingSummary, request('a', 'create', 0, { source: {} }), 'rejected', 'GENERATION_NOT_READY');
  const fixtureResults = { committed: 0, rejected: 0 };
  for (const [index, source] of require('./fixtures/account-directory.cjs').entries()) {
    const fixtureDb = fresh(), before = fixtureDb.dump();
    const result = await core.mutateAccount(fixtureDb, request(`fixture-${index}`, 'create', 0, { source }));
    const explicitUndefined = Object.hasOwn(source, 'approvalStatus') && source.approvalStatus === undefined;
    const loneSurrogate = index === 21;
    assert.equal(result.status, explicitUndefined || loneSurrogate ? 'rejected' : 'committed');
    if (explicitUndefined || loneSurrogate) assert.equal(result.code, 'UNSUPPORTED_SOURCE');
    fixtureResults[result.status]++; checks++;
    if (result.status === 'committed') {
      invariant(fixtureDb);
      const restored = codec.decodeDirectory(fixtureDb.dump()[paths(`fixture-${index}`).entry]);
      for (const query of ['', ' ', 'undefined', 'null', 'NGUYEN', 'an nguyen'])
        assert.equal(dir.verifiedSearchMatch(restored, query), dir.verifiedSearchMatch(dir.projectAccount(`fixture-${index}`, source), query));
    } else {
      assert.match(result.code, /^(CODEC_|UNSUPPORTED|OVERFLOW)/);
      assert.deepStrictEqual(fixtureDb.dump(), before);
    }
  }
  assert.ok(fixtureResults.committed > 0);
  assert.deepStrictEqual(fixtureResults, { committed: 23, rejected: 2 });
  const snapshotDb = fresh(), mutable = request('snapshot', 'create', 0, { source: { name: 'original' } });
  snapshotDb.retryBeforeCommit = 1;
  const pending = core.mutateAccount(snapshotDb, mutable);
  mutable.source.name = 'changed by caller';
  assert.equal((await pending).status, 'committed'); checks++;
  assert.equal(snapshotDb.dump()[paths('snapshot').source].name, 'original'); invariant(snapshotDb);
  // Mock enforces read-before-write and defensive copying, independently of core.
  const isolation = fresh(); const before = isolation.dump();
  await assert.rejects(isolation.runTransaction(async tx => { tx.set('x', {}); await tx.get(summaryPath); }), /read after write/);
  assert.deepStrictEqual(isolation.dump(), before);
  await isolation.runTransaction(async tx => { const summary = await tx.get(summaryPath); summary.counts.total = 42; });
  assert.deepStrictEqual(isolation.dump(), before);
  console.log(`PASS: ${checks} transaction scenarios plus atomicity, counts, codec/hash invariants and adapter isolation assertions.`);
  console.log('25 fixture native-write outcomes: ' + JSON.stringify(fixtureResults));
  console.log('MOCK LOGICAL OPERATIONS ONLY; not Firebase billed reads/writes.');
  console.log(JSON.stringify(benchmarks, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });