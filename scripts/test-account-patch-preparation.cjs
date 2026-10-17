const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { MemoryAccountAdapter } = require('./lib/account-transaction-memory.cjs');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(file) {
  const absolute = path.resolve(root, file);
  if (cache.has(absolute)) return cache.get(absolute);
  const exports = {}; cache.set(absolute, exports);
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText)(exports, name => {
    if (name === 'node:crypto') return require(name);
    assert.ok(name.startsWith('.'), `SDK/route imports forbidden: ${name}`);
    return load(path.relative(root, path.resolve(path.dirname(absolute), name + '.ts')));
  }); return exports;
}
const service = load('lib/accounts/patch-preparation.ts');
const core = load('lib/accounts/transaction-core.ts');
const codec = load('lib/accounts/codec.ts');
const dir = load('lib/accounts/directory.ts');
const errors = load('lib/accounts/transaction-errors.ts');
const storage = load('lib/accounts/storage.ts');
const generation = 'prepare-only', fence = { generation, epoch: 1 };
const p = id => core.accountTransactionPaths(generation, id);
let sequence = 0, checks = 0;
const request = (id = 'legacy_id@example_com', extra = {}) => ({ actor: { id: 'admin', role: 'admin' }, originVerified: true,
  body: { id, action: 'approve' }, fence, expectedRevision: 1, operationId: `prepare-${++sequence}`,
  auditTime: '2026-10-15T12:00:00.000Z', ...extra });
async function fixture(source = { role: 'student', classId: 'legacy', email: 'x@y', name: 'Nguyễn 😀', untouched: 'preserve' }) {
  const memory = new MemoryAccountAdapter({ [p('a').summary]: { generation, schemaVersion: 1, codecVersion: 1,
    status: 'ready', counts: core.emptyAccountCounts() } });
  for (const id of ['legacy_id@example_com', 'second']) {
    assert.equal((await core.mutateAccount(memory, { generation, id, kind: 'create', expectedRevision: 0,
      operationId: `seed-${id}`, source })).status, 'committed');
  }
  memory.documents.set('users/admin', { role: 'admin', email: 'admin@test' });
  memory.documents.set('accountDirectoryControl/active', { activeGeneration: generation, epoch: 1, status: 'ready', schemaVersion: 1, codecVersion: 1 });
  memory.resetMetrics();
  let preflightCalls = 0;
  const deps = {
    reader: { readOnly: callback => memory.runTransaction(tx => callback(path => tx.get(path))) },
    preflight: candidate => {
      preflightCalls++;
      assert.equal(candidate.intent.id, candidate.source.id || candidate.intent.id);
      const entry = candidate.documents.find(doc => doc.path.includes('/entries/')).value;
      const estimate = storage.storagePreflight(entry, { arrayIndexes: [{ scalarFields: ['groupEffective'] }], otherEntries: 0,
        otherIndexBytes: 0, documentNameBytes: 200, parentDocumentNameBytes: 150, maxPayloadBytes: 1000000 });
      // Test policy only; docs/state/source exact guards remain a rollout blocker.
      return estimate.issues.length ? { status: 'rejected', code: 'TEST_OVERFLOW' } : { status: 'ready' };
    },
  };
  return { memory, deps, preflightCalls: () => preflightCalls };
}
async function result(f, req, code) {
  const before = f.memory.dump(), gate = service.createAccountsPatchPreparation(f.deps);
  assert.equal(gate.legacyDisposition().legacyAllowed, true);
  const value = await gate.prepare(req);
  assert.equal(value.status, code ? 'rejected' : 'prepared', JSON.stringify(value));
  if (code) assert.equal(value.code, code);
  assert.deepStrictEqual(f.memory.dump(), before);
  assert.equal(f.memory.metrics.committedWrites, 0);
  assert.equal(gate.legacyDisposition().legacyAllowed, false);
  assert.equal(value.legacyAllowed, false);
  assert.equal((await gate.prepare(req)).code, 'REQUEST_ALREADY_SELECTED');
  checks++; return value;
}
async function main() {
  // Extract unchanged route mapping as executable business oracle; no route/Admin runtime imports.
  const route = fs.readFileSync(path.join(root, 'app/api/learning/accounts/route.ts'), 'utf8');
  const branch = route.slice(route.indexOf('      let changes:'), route.indexOf('      tx.update(ref, changes);'));
  class AccessError extends Error {}
  class FixedDate extends Date { constructor() { super('2026-10-15T12:00:00.000Z'); } }
  const oracle = new Function('body', 'target', 'actor', 'EXERCISE_TYPES', 'AccessError', 'Date',
    ts.transpileModule(branch + '\nreturn changes;', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText);
  const types = load('lib/learning-access.ts').EXERCISE_TYPES;
  for (const source of [{ role: 'student', approvalStatus: 'pending' }, { role: 'student', classId: 'legacy' },
    { role: 'student', approvalStatus: null, teacherId: 'legacy' }, { role: 'student', approvalStatus: 'rejected' }]) {
    const f = await fixture(source), req = request(), prepared = await result(f, req);
    const changes = oracle(req.body, { data: () => source }, req.actor, types, AccessError, FixedDate);
    assert.deepStrictEqual(prepared.intent.patch, changes);
    assert.deepStrictEqual(prepared.responsePreview.account, dir.accountView(req.body.id, { ...source, ...changes }));
    assert.equal(prepared.commitEligible, false);
    assert.equal(prepared.sourceHash, codec.canonicalHash(source, 1));
    assert.equal(prepared.intent.patch.approvedBy, 'admin');
  }
  for (const role of ['teacher', 'assistant']) {
    const source = { role, assignedFeedbackTypes: ['Write Essay'], classId: 'unchanged', email: 'same@test' };
    const f = await fixture(source), req = request(undefined, { body: { id: 'legacy_id@example_com', action: 'assign-types', types: ['Read aloud', 'Read aloud', 'Write Essay'] } });
    const prepared = await result(f, req), changes = oracle(req.body, { data: () => source }, req.actor, types, AccessError, FixedDate);
    assert.deepStrictEqual(prepared.intent.patch, changes);
    assert.deepStrictEqual(prepared.responsePreview.account, dir.accountView(req.body.id, { ...source, ...changes }));
    assert.equal(prepared.intent.patch.permissionsUpdatedBy, 'admin');
  }
  for (const role of ['student', 'teacher', 'assistant']) {
    const f = await fixture(), req = request(undefined, { body: { id: 'legacy_id@example_com', action: 'role', role } });
    const prepared = await result(f, req), source = f.memory.dump()[p(req.body.id).source];
    assert.deepStrictEqual(prepared.intent.patch, oracle(req.body, { data: () => source }, req.actor, types, AccessError, FixedDate));
    assert.equal(prepared.responsePreview.account.approvalStatus, role === 'student' ? 'pending' : 'approved');
    assert.deepStrictEqual(prepared.intent.patch.assignedFeedbackTypes, []);
    assert.equal(prepared.intent.patch.email, undefined); assert.equal(prepared.intent.patch.classId, undefined);
  }
  for (const role of ['student', 'teacher', 'assistant', 'admin_support']) await result(await fixture(), request(undefined, { actor: { id: 'admin', role } }), 'ADMIN_REQUIRED');
  const revoked = await fixture(); revoked.memory.documents.get('users/admin').role = 'teacher';
  await result(revoked, request(), 'ADMIN_REVOKED');
  await result(await fixture(), request(undefined, { originVerified: false }), 'ORIGIN_NOT_VERIFIED');
  await result(await fixture(), request('missing'), 'NOT_FOUND');
  await result(await fixture(), request(undefined, { expectedRevision: 0 }), 'REVISION_CONFLICT');
  await result(await fixture(), request(undefined, { fence: { generation, epoch: 2 } }), 'GENERATION_MISMATCH');
  await result(await fixture({ role: 'admin' }), request(undefined, { body: { id: 'legacy_id@example_com', action: 'role', role: 'teacher' } }), 'INVALID_ACTION');
  await result(await fixture({ role: 'teacher' }), request(undefined, { body: { id: 'legacy_id@example_com', action: 'assign-types', types: ['INVALID'] } }), 'INVALID_TYPES');
  const unsupported = await fixture(); unsupported.memory.documents.get(p('legacy_id@example_com').source).createdAt = new Date();
  await result(unsupported, request(), 'CODEC_UNSUPPORTED');
  const missing = await fixture(); missing.memory.documents.delete(p('legacy_id@example_com').state);
  await result(missing, request(), 'MISSING_STATE');
  const large = await fixture(); large.memory.documents.get(p('legacy_id@example_com').source).name = 'a'.repeat(5000);
  await result(large, request(), 'OVERFLOW:FIELD_UNITS');
  const explicitUndefined = await fixture(); explicitUndefined.memory.documents.get(p('legacy_id@example_com').source).approvalStatus = undefined;
  await result(explicitUndefined, request(), 'UNSUPPORTED_SOURCE');
  const retry = await fixture(); retry.memory.retryBeforeCommit = 1;
  await result(retry, request()); assert.equal(retry.memory.metrics.attempts, 2);
  const revokedRetry = await fixture(); revokedRetry.memory.retryBeforeCommit = 1; let attempts = 0;
  revokedRetry.deps.reader = { readOnly: callback => revokedRetry.memory.runTransaction(async tx => {
    const value = await callback(path => tx.get(path));
    if (++attempts === 1) revokedRetry.memory.documents.get('users/admin').role = 'teacher';
    return value;
  }) };
  const revokeGate = service.createAccountsPatchPreparation(revokedRetry.deps);
  assert.deepStrictEqual(await revokeGate.prepare(request()), { status: 'rejected', code: 'ADMIN_REVOKED', legacyAllowed: false });
  assert.equal(revokedRetry.memory.metrics.committedWrites, 0); checks++;
  const overflow = await fixture(); overflow.deps.preflight = () => ({ status: 'rejected', code: 'private user data must not escape' });
  await result(overflow, request(), 'PREFLIGHT_REJECTED');
  const failure = await fixture(); failure.memory.failCommit = true;
  await result(failure, request(), 'ADAPTER_FAILURE');
  const unknown = await fixture(); unknown.deps.reader = { readOnly: async () => { throw new errors.AccountAdapterError('UNKNOWN_COMMIT_OUTCOME', 'unknown'); } };
  await result(unknown, request(), 'UNKNOWN_COMMIT_OUTCOME');
  // Separate request-scoped gates cannot replace each other's target/session.
  const switching = await fixture();
  const [a, b] = await Promise.all([result(switching, request()), result(switching, request('second'))]);
  assert.equal(a.intent.id, 'legacy_id@example_com'); assert.equal(b.intent.id, 'second');
  const snapshot = await fixture(), mutable = request();
  const gate = service.createAccountsPatchPreparation(snapshot.deps), pending = gate.prepare(mutable);
  mutable.body.id = 'second'; mutable.actor.id = 'other';
  assert.equal((await pending).intent.id, 'legacy_id@example_com'); checks++;
  // Injected Firestore binding uses readOnly and never accesses SDK initialization/writes.
  const bind = await fixture(); let calls = 0;
  const reader = service.createFirestorePreparationReader({ doc: path => ({ path }), runTransaction: async (callback, options) => {
    calls++; assert.deepStrictEqual(options, { readOnly: true });
    return callback({ get: async ref => { const data = bind.memory.dump()[ref.path]; return { exists: data !== undefined, data: () => data }; } });
  } });
  assert.equal(calls, 0); bind.deps.reader = reader; await result(bind, request()); assert.equal(calls, 1);
  assert.ok(!route.includes('patch-preparation')); // no production activation.
  console.log(`PASS: ${checks} preparation cases plus route-oracle parity, zero writes, account isolation and fallback guards.`);
  console.log('Read-only fake operations; no SDK initialization, credentials or Firebase RPC.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });