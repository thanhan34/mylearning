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
    assert.ok(name.startsWith('.'), `SDK initialization forbidden: ${name}`);
    return load(path.relative(root, path.resolve(path.dirname(absolute), name + '.ts')));
  }); return exports;
}
const service = load('lib/accounts/patch-commit.ts');
const core = load('lib/accounts/transaction-core.ts');
const codec = load('lib/accounts/codec.ts');
const dir = load('lib/accounts/directory.ts');
const generation = 'commit-fake', id = 'legacy_id@example_com', paths = core.accountTransactionPaths(generation, id);
const controlPath = 'accountDirectoryControl/active';
let sequence = 0, cases = 0;
const grpc = code => Object.assign(Error('DO_NOT_EXPOSE_PERSONAL_DATA'), { code });
async function fixture(source = { role: 'student', classId: 'legacy', email: 'x@y' }) {
  const memory = new MemoryAccountAdapter({ [paths.summary]: { generation, schemaVersion: 1, codecVersion: 1,
    status: 'ready', counts: core.emptyAccountCounts() } });
  await core.mutateAccount(memory, { generation, id, kind: 'create', source, expectedRevision: 0, operationId: 'seed' });
  memory.documents.set('users/admin', { role: 'admin' });
  memory.documents.set(controlPath, { activeGeneration: generation, epoch: 1, status: 'ready', schemaVersion: 1, codecVersion: 1 });
  memory.maxAttempts = 1; memory.resetMetrics();
  const f = { memory, attempts: 0, abort: 0, unknown: false, rejectCommit: false, hook: undefined,
    request: { actor: { id: 'admin', role: 'admin' }, originVerified: true, body: { id, action: 'approve' },
      fence: { generation, epoch: 1 }, operationId: `commit-${++sequence}`, expectedRevision: 1,
      auditTime: '2026-10-15T12:00:00.000Z', sourceHash: codec.canonicalHash(source, 1) } };
  f.db = { doc: path => ({ path }), runTransaction: async (callback, options) => {
    f.attempts++; assert.deepStrictEqual(options, { maxAttempts: 1 });
    try {
      const result = await memory.runTransaction(async tx => {
        const result = await callback({ get: async ref => {
          const value = await tx.get(ref.path); return { exists: value !== undefined, data: () => value };
        }, set: (ref, value) => tx.set(ref.path, value), delete: ref => tx.delete(ref.path) });
        if (f.hook) { const hook = f.hook; f.hook = undefined; hook(); }
        if (f.abort > 0) { f.abort--; throw grpc(10); }
        if (f.rejectCommit) throw grpc(7);
        return result;
      });
      if (f.unknown) throw grpc(4);
      return result;
    } catch (error) { if (error.message === 'retry exhausted') throw grpc(10); throw error; }
  } };
  f.deps = service.createFirestorePatchCommitDependencies(f.db, () => ({ status: 'ready' }));
  return f;
}
function invariant(f) {
  const docs = f.memory.dump(), source = docs[paths.source], state = docs[paths.state];
  const projection = dir.projectAccount(id, source);
  assert.deepStrictEqual(codec.decodeDirectory(docs[paths.entry]), projection);
  assert.deepStrictEqual(docs[paths.summary].counts, projection.contribution);
  assert.equal(state.sourceHash, codec.canonicalHash(source, 1));
  assert.equal(state.projectionHash, codec.canonicalHash(projection, 1));
}
async function run(f, status = 'confirmed', code) {
  const before = f.memory.dump();
  const gate = service.createAccountsPatchCommit(f.deps), result = await gate.commit(f.request);
  assert.equal(result.status, status, JSON.stringify(result));
  if (code) assert.equal(result.code, code);
  assert.equal(result.legacyAllowed, false);
  if (status !== 'confirmed') assert.equal(result.response, undefined);
  if (status === 'rejected' && !f.hook && !['ADMIN_REVOKED', 'GENERATION_MISMATCH'].includes(code)) assert.deepStrictEqual(f.memory.dump(), before);
  assert.equal((await gate.commit(f.request)).code, 'REQUEST_ALREADY_SELECTED');
  assert.ok(!JSON.stringify(result).includes('DO_NOT_EXPOSE')); cases++;
  return result;
}
async function main() {
  const f = await fixture(); const first = await run(f); invariant(f);
  assert.equal(first.response.account.approvalStatus, 'approved');
  assert.equal(f.memory.dump()[paths.source].approvedBy, 'admin');
  assert.equal(f.memory.dump()[paths.source].approvedAt, f.request.auditTime);
  const duplicate = await run(f); assert.equal(duplicate.duplicate, true); assert.equal(f.memory.metrics.committedWrites, 3);
  f.request.body = { id, action: 'role', role: 'teacher' };
  await run(f, 'rejected', 'TARGET_CHANGED');
  const revoked = await fixture(); revoked.memory.documents.get('users/admin').role = 'teacher';
  await run(revoked, 'rejected', 'ADMIN_REVOKED'); assert.equal(revoked.memory.metrics.stagedWrites, 0);
  const deletedActor = await fixture(); deletedActor.memory.documents.delete('users/admin');
  await run(deletedActor, 'rejected', 'ADMIN_REVOKED');
  for (const role of ['teacher', 'student']) {
    const drift = await fixture(); drift.memory.documents.get(paths.source).role = role;
    drift.memory.documents.get(paths.source).approvalStatus = 'pending';
    await run(drift, 'rejected', role === 'teacher' ? 'INVALID_ACTION' : 'TARGET_CHANGED');
    assert.equal(drift.memory.metrics.stagedWrites, 0);
  }
  for (const role of ['student', 'teacher', 'assistant', 'admin_support']) {
    const roleChange = await fixture(); roleChange.request.body = { id, action: 'role', role };
    const response = await run(roleChange); invariant(roleChange);
    assert.deepStrictEqual(response.response.account.assignedFeedbackTypes, []);
    assert.equal(roleChange.memory.dump()[paths.source].classId, 'legacy');
  }
  const staff = await fixture({ role: 'teacher', email: 'same@test' });
  staff.request.body = { id, action: 'assign-types', types: ['Read aloud', 'Read aloud'] };
  await run(staff); invariant(staff);
  assert.equal(staff.memory.metrics.summaryWrites, 0);
  assert.deepStrictEqual(staff.memory.dump()[paths.source].assignedFeedbackTypes, ['Read aloud']);
  const retry = await fixture(); retry.abort = 2; await run(retry); invariant(retry);
  assert.equal(retry.attempts, 3); assert.equal(retry.memory.metrics.committedWrites, 3);
  assert.equal(retry.memory.dump()[paths.source].approvedAt, retry.request.auditTime);
  const revokedRetry = await fixture();
  revokedRetry.hook = () => { revokedRetry.memory.documents.set('users/admin', { role: 'teacher' }); revokedRetry.memory.versions.set('users/admin', 1); };
  await run(revokedRetry, 'rejected', 'ADMIN_REVOKED'); assert.equal(revokedRetry.memory.metrics.committedWrites, 0);
  const cutover = await fixture();
  cutover.hook = () => { cutover.memory.documents.get(controlPath).epoch = 2; cutover.memory.versions.set(controlPath, 1); };
  await run(cutover, 'rejected', 'GENERATION_MISMATCH'); assert.equal(cutover.memory.metrics.committedWrites, 0);
  const unknown = await fixture(); unknown.unknown = true;
  await run(unknown, 'unknown', 'UNKNOWN_COMMIT_OUTCOME'); assert.equal(unknown.attempts, 1); invariant(unknown);
  const failed = await fixture(); failed.rejectCommit = true;
  await run(failed, 'rejected', 'PERMISSION_DENIED'); assert.equal(failed.memory.metrics.committedWrites, 0);
  const staging = await fixture(); staging.memory.failAfterStagedWrites = 2;
  // Unclassified SDK-boundary failure is conservatively unknown, mock still proves rollback.
  const stagingBefore = staging.memory.dump(); await run(staging, 'unknown', 'UNKNOWN_COMMIT_OUTCOME');
  assert.deepStrictEqual(staging.memory.dump(), stagingBefore);
  const missing = await fixture(); missing.memory.documents.delete(paths.state);
  await run(missing, 'rejected', 'MISSING_STATE');
  const preflight = await fixture(); preflight.deps.preflight = () => ({ status: 'rejected', code: 'private' });
  await run(preflight, 'rejected', 'PREFLIGHT_REJECTED'); assert.equal(preflight.memory.metrics.stagedWrites, 0);
  const invalidOrigin = await fixture(); invalidOrigin.request.originVerified = false;
  await run(invalidOrigin, 'rejected', 'ORIGIN_NOT_VERIFIED'); assert.equal(invalidOrigin.attempts, 0);
  const invalidSession = await fixture(); invalidSession.request.actor.role = 'student';
  await run(invalidSession, 'rejected', 'ADMIN_REQUIRED');
  const staleRevision = await fixture(); staleRevision.request.expectedRevision = 0;
  await run(staleRevision, 'rejected', 'REVISION_CONFLICT');
  const changedApproval = await fixture();
  await core.mutateAccount(changedApproval.memory, { generation, id, kind: 'update', patch: { approvalStatus: 'pending' },
    expectedRevision: 1, operationId: 'other-writer' });
  changedApproval.memory.resetMetrics();
  await run(changedApproval, 'rejected', 'TARGET_CHANGED'); invariant(changedApproval);
  assert.equal(changedApproval.memory.metrics.committedWrites, 0);
  const unsupported = await fixture(); unsupported.memory.documents.get(paths.source).approvalStatus = undefined;
  unsupported.request.sourceHash = codec.canonicalHash(unsupported.memory.dump()[paths.source], 1);
  await run(unsupported, 'rejected', 'UNSUPPORTED_SOURCE');
  const pendingApproval = await fixture({ role: 'student', approvalStatus: 'pending', classId: 'legacy' });
  await run(pendingApproval); invariant(pendingApproval);
  assert.equal(pendingApproval.memory.metrics.summaryWrites, 1); assert.equal(pendingApproval.memory.metrics.committedWrites, 4);
  const reuse = await fixture(); await run(reuse);
  reuse.request.auditTime = '2026-10-15T13:00:00.000Z';
  await run(reuse, 'rejected', 'TARGET_CHANGED');
  const overflow = await fixture(); overflow.memory.documents.get(paths.source).name = 'a'.repeat(5000);
  overflow.request.sourceHash = codec.canonicalHash(overflow.memory.dump()[paths.source], 1);
  await run(overflow, 'rejected', 'OVERFLOW:FIELD_UNITS');
  const parallel = await fixture();
  const results = await Promise.all([1, 2].map(n => service.createAccountsPatchCommit(parallel.deps).commit({ ...parallel.request, operationId: `parallel-${n}` })));
  assert.equal(results.filter(r => r.status === 'confirmed').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 1); invariant(parallel); cases += 2;
  const same = await fixture();
  const duplicates = await Promise.all([1, 2].map(() => service.createAccountsPatchCommit(same.deps).commit(same.request)));
  assert.ok(duplicates.every(r => r.status === 'confirmed')); assert.equal(duplicates.filter(r => r.duplicate).length, 1); invariant(same); cases += 2;
  // Actor read permission never permits writing actor source with target scope established.
  const scoped = await fixture();
  const rawAdapter = load('lib/accounts/firestore-transaction-adapter.ts').createFirestoreAccountAdapter(scoped.db, scoped.request.fence, { authorizationActorId: 'admin' });
  await assert.rejects(rawAdapter.runTransaction(async tx => {
    await tx.get('users/admin'); await tx.get(paths.source); tx.set('users/admin', { role: 'student' });
  }), error => error.code === 'PATH_OUT_OF_SCOPE');
  assert.equal(scoped.memory.dump()['users/admin'].role, 'admin');
  const route = fs.readFileSync(path.join(root, 'app/api/learning/accounts/route.ts'), 'utf8');
  const branch = route.slice(route.indexOf('      let changes:'), route.indexOf('      tx.update(ref, changes);'));
  class FixedDate extends Date { constructor() { super('2026-10-15T12:00:00.000Z'); } }
  const oracle = new Function('body', 'target', 'actor', 'EXERCISE_TYPES', 'AccessError', 'Date',
    ts.transpileModule(branch + '\nreturn changes;', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText);
  for (const [source, body] of [[{ role: 'student', approvalStatus: null }, { id, action: 'approve' }],
    [{ role: 'teacher' }, { id, action: 'assign-types', types: ['Read aloud', 'Read aloud'] }],
    [{ role: 'student', teacherId: 'legacy' }, { id, action: 'role', role: 'assistant' }]]) {
    const parity = await fixture(source); parity.request.body = body;
    const changes = oracle(body, { data: () => source }, parity.request.actor, load('lib/learning-access.ts').EXERCISE_TYPES, Error, FixedDate);
    const response = await run(parity);
    assert.deepStrictEqual(parity.memory.dump()[paths.source], { ...source, ...changes });
    assert.deepStrictEqual(response.response.account, dir.accountView(id, { ...source, ...changes })); invariant(parity);
  }
  assert.ok(!route.includes('patch-commit'));
  console.log(`PASS: ${cases} commit cases plus source authorization, parity, atomicity, response and no-SDK assertions.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });