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
    assert.ok(name.startsWith('.'), `No runtime SDK allowed: ${name}`);
    return load(path.relative(root, path.resolve(path.dirname(absolute), name + '.ts')));
  }); return exports;
}
const core = load('lib/accounts/transaction-core.ts');
const commit = load('lib/accounts/patch-commit.ts');
const recovery = load('lib/accounts/patch-reconciliation.ts');
const codec = load('lib/accounts/codec.ts');
const intent = load('lib/accounts/patch-intent.ts');
const errors = load('lib/accounts/transaction-errors.ts');
const generation = 'recovery-fake', id = 'legacy_id@example_com', paths = core.accountTransactionPaths(generation, id);
const controlPath = 'accountDirectoryControl/active';
const principal = { actorId: 'admin', originVerified: true };
let checks = 0;
function context(request) { return { request, requestHash: codec.canonicalHash(request, 1), intentBinding: codec.canonicalHash(request, 1),
  operationHash: codec.canonicalHash(intent.reconstructPatchIntent(request), 1) }; }
async function fixture(doCommit = true, action = 'approve') {
  const source = { role: action === 'assign-types' ? 'teacher' : 'student', email: 'x@y' };
  const memory = new MemoryAccountAdapter({ [paths.summary]: { generation, schemaVersion: 1, codecVersion: 1, status: 'ready', counts: core.emptyAccountCounts() } });
  await core.mutateAccount(memory, { generation, id, kind: 'create', source, expectedRevision: 0, operationId: 'seed' });
  memory.documents.set('users/admin', { role: 'admin' });
  memory.documents.set(controlPath, { activeGeneration: generation, epoch: 1, status: 'ready', schemaVersion: 1, codecVersion: 1 });
  const request = { actor: { id: 'admin', role: 'admin' }, originVerified: true, body: { id, action,
    ...(action === 'role' ? { role: 'teacher' } : action === 'assign-types' ? { types: ['Read aloud'] } : {}) },
    fence: { generation, epoch: 1 }, expectedRevision: 1, operationId: 'operation', auditTime: '2026-10-15T12:00:00.000Z', sourceHash: codec.canonicalHash(source, 1) };
  if (doCommit) {
    const result = await commit.createAccountsPatchCommit({ adapter: () => memory, preflight: () => ({ status: 'ready' }) }).commit(request);
    assert.equal(result.status, 'confirmed');
  }
  memory.resetMetrics();
  const reads = [];
  const reader = { readOnly: callback => memory.runTransaction(tx => callback(async path => { reads.push(path); return tx.get(path); })) };
  return { memory, reader, reads, ctx: context(request) };
}
async function check(f, status, code, p = principal) {
  const before = f.memory.dump();
  const result = await recovery.createAccountsPatchReconciliation(f.reader).reconcile(p, f.ctx);
  assert.equal(result.status, status, JSON.stringify(result));
  if (code) assert.equal(result.code, code);
  assert.deepStrictEqual(f.memory.dump(), before);
  assert.equal(f.memory.metrics.stagedWrites, 0); assert.equal(f.memory.metrics.committedWrites, 0);
  assert.ok(!JSON.stringify(result).includes('@')); checks++; return result;
}
async function main() {
  for (const action of ['approve', 'role', 'assign-types']) await check(await fixture(true, action), 'confirmed');
  await check(await fixture(false), 'unresolved'); // current source/preview cannot prove receipt.
  const missing = await fixture(); missing.memory.documents.delete(paths.state); await check(missing, 'unresolved');
  const expectedSourceOnly = await fixture(false);
  Object.assign(expectedSourceOnly.memory.documents.get(paths.source), { approvalStatus: 'approved', approvedBy: 'admin', approvedAt: expectedSourceOnly.ctx.request.auditTime });
  await check(expectedSourceOnly, 'unresolved');
  const originalUnknown = await fixture(false);
  const real = originalUnknown.memory;
  const uncertain = await commit.createAccountsPatchCommit({ preflight: () => ({ status: 'ready' }), adapter: () => ({
    runTransaction: async callback => { await real.runTransaction(callback); throw new errors.AccountAdapterError('UNKNOWN_COMMIT_OUTCOME', 'unknown'); },
  }) }).commit(originalUnknown.ctx.request);
  assert.equal(uncertain.status, 'unknown'); real.resetMetrics(); await check(originalUnknown, 'confirmed');
  for (const mutate of [
    f => { f.memory.documents.get(paths.state).lastOperationId = 'later'; },
    f => { f.memory.documents.get(paths.state).lastOperationHash = '0'.repeat(64); },
    f => { f.ctx.requestHash = '0'.repeat(64); },
    f => { f.ctx.intentBinding = '0'.repeat(64); },
    f => { f.ctx.operationHash = '0'.repeat(64); },
    f => { f.ctx.request.body.id = 'other'; },
    f => { f.ctx.request.fence.generation = 'other'; },
    f => { f.ctx.request.operationId = 'other'; },
    f => { f.ctx.request.expectedRevision = 0; },
    f => { f.ctx.request.fence.epoch = 2; },
  ]) {
    const f = await fixture(); mutate(f);
    const changedReceipt = f.memory.dump()[paths.state].lastOperationId !== 'operation' || f.memory.dump()[paths.state].lastOperationHash === '0'.repeat(64);
    await check(f, changedReceipt ? 'unresolved' : 'rejected');
  }
  const reuse = await fixture(); reuse.ctx.request.auditTime = '2026-10-15T13:00:00.000Z'; reuse.ctx = context(reuse.ctx.request);
  await check(reuse, 'unresolved');
  for (const damage of ['source', 'entry', 'state-version', 'summary', 'epoch', 'generation']) {
    const f = await fixture();
    if (damage === 'source') f.memory.documents.get(paths.source).name = 'out-of-band';
    if (damage === 'entry') f.memory.documents.get(paths.entry).payload = 'broken';
    if (damage === 'state-version') f.memory.documents.get(paths.state).codecVersion = 2;
    if (damage === 'summary') f.memory.documents.get(paths.summary).counts.total = -1;
    if (damage === 'epoch') f.memory.documents.get(controlPath).epoch = 2;
    if (damage === 'generation') f.memory.documents.get(controlPath).activeGeneration = 'new';
    await check(f, 'unresolved');
  }
  const revoked = await fixture(); revoked.memory.documents.get('users/admin').role = 'teacher';
  await check(revoked, 'rejected', 'NOT_AUTHORIZED'); assert.deepStrictEqual(revoked.reads, ['users/admin']);
  const switched = await fixture(); await check(switched, 'rejected', 'NOT_AUTHORIZED', { actorId: 'other', originVerified: true });
  assert.equal(switched.reads.length, 0);
  const deletedActor = await fixture(); deletedActor.memory.documents.delete('users/admin');
  await check(deletedActor, 'rejected', 'NOT_AUTHORIZED'); assert.deepStrictEqual(deletedActor.reads, ['users/admin']);
  const wrongOrigin = await fixture(); await check(wrongOrigin, 'rejected', 'NOT_AUTHORIZED', { actorId: 'admin', originVerified: false });
  const network = await fixture(); network.reader = { readOnly: async () => { throw new errors.AccountAdapterError('UNKNOWN_COMMIT_OUTCOME', 'unknown'); } };
  await check(network, 'unresolved', 'READ_EVIDENCE_UNAVAILABLE');
  const permission = await fixture(); permission.reader = { readOnly: async () => { throw Object.assign(Error('private'), { code: 7 }); } };
  await check(permission, 'unresolved', 'READ_EVIDENCE_UNAVAILABLE');
  const recreated = await fixture();
  await core.mutateAccount(recreated.memory, { generation, id, kind: 'delete', expectedRevision: 2, operationId: 'delete' });
  await core.mutateAccount(recreated.memory, { generation, id, kind: 'create', source: { role: 'student' }, expectedRevision: 3, operationId: 'recreate' });
  recreated.memory.resetMetrics(); await check(recreated, 'unresolved');
  const replaced = await fixture();
  await core.mutateAccount(replaced.memory, { generation, id, kind: 'update', patch: { name: 'later' }, expectedRevision: 2, operationId: 'later' });
  replaced.memory.resetMetrics(); await check(replaced, 'unresolved');
  // Mutate between read snapshot and validation; retry sees replaced receipt, never stale proof.
  const concurrent = await fixture(); let first = true;
  concurrent.reader = { readOnly: callback => concurrent.memory.runTransaction(async tx => {
    const proof = await callback(path => tx.get(path));
    if (first) {
      first = false;
      concurrent.memory.documents.get(paths.state).lastOperationId = 'concurrent';
      concurrent.memory.versions.set(paths.state, 100);
    }
    return proof;
  }) };
  const concurrentResult = await recovery.createAccountsPatchReconciliation(concurrent.reader).reconcile(principal, concurrent.ctx);
  assert.equal(concurrentResult.status, 'unresolved'); assert.equal(concurrent.memory.metrics.stagedWrites, 0); checks++;
  const binding = await fixture(); let calls = 0;
  const reader = recovery.createFirestorePatchRecoveryReader({ doc: path => ({ path }), runTransaction: async (callback, options) => {
    calls++; assert.deepStrictEqual(options, { readOnly: true });
    return callback({ get: async ref => { const value = binding.memory.dump()[ref.path]; return { exists: value !== undefined, data: () => value }; },
      set: () => assert.fail('write'), delete: () => assert.fail('write') });
  } });
  assert.equal(calls, 0); binding.reader = reader; await check(binding, 'confirmed'); assert.equal(calls, 1);
  console.log(`PASS: ${checks} recovery scenarios plus no-write, authorization ordering, intent and consistency assertions.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });