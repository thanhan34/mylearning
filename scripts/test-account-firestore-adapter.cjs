const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { MemoryAccountAdapter } = require('./lib/account-transaction-memory.cjs');
const cache = new Map();
function load(file) {
  const absolute = path.resolve(__dirname, '..', file);
  if (cache.has(absolute)) return cache.get(absolute);
  const exports = {}; cache.set(absolute, exports);
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText)(exports, name => {
    if (name === 'node:crypto') return require(name);
    assert.ok(name.startsWith('.'), `SDK/runtime initialization forbidden: ${name}`);
    return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(absolute), name + '.ts')));
  }); return exports;
}
const core = load('lib/accounts/transaction-core.ts');
const adapter = load('lib/accounts/firestore-transaction-adapter.ts');
const errors = load('lib/accounts/transaction-errors.ts');
const generation = 'fake-active', fence = { generation, epoch: 1 };
const p = id => core.accountTransactionPaths(generation, id);
const control = { activeGeneration: generation, epoch: 1, status: 'ready', schemaVersion: 1, codecVersion: 1 };
function grpc(code) { return Object.assign(Error('PRIVATE_EMAIL_AND_NAME_MUST_NOT_ESCAPE'), { code }); }
class FakeFirestore {
  constructor() {
    this.memory = new MemoryAccountAdapter({
      [adapter.ACCOUNT_CONTROL_PATH]: control,
      [p('a').summary]: { generation, schemaVersion: 1, codecVersion: 1, status: 'ready', counts: core.emptyAccountCounts() },
    });
    this.memory.maxAttempts = 1; this.calls = []; this.trace = []; this.beforeError = undefined;
    this.afterError = undefined; this.afterCommit = false; this.abortRemaining = 0; this.cutover = false;
  }
  doc(key) { return { path: key }; }
  async runTransaction(callback, options) {
    this.calls.push(options);
    if (this.beforeError !== undefined) throw grpc(this.beforeError);
    const trace = []; this.trace.push(trace);
    try {
      const result = await this.memory.runTransaction(async tx => {
        const result = await callback({
          get: async ref => {
            trace.push(['get', ref.path]); const data = await tx.get(ref.path);
            return { exists: data !== undefined, data: () => structuredClone(data) };
          },
          set: (ref, value) => { trace.push(['set', ref.path]); tx.set(ref.path, value); },
          delete: ref => { trace.push(['delete', ref.path]); tx.delete(ref.path); },
        });
        if (this.cutover) {
          this.cutover = false;
          this.memory.documents.set(adapter.ACCOUNT_CONTROL_PATH, { ...control, activeGeneration: 'new-active', epoch: 2 });
          this.memory.versions.set(adapter.ACCOUNT_CONTROL_PATH, 2);
        }
        if (this.abortRemaining > 0) { this.abortRemaining--; throw grpc(10); }
        if (this.afterError !== undefined && !this.afterCommit) throw grpc(this.afterError);
        return result;
      });
      if (this.afterError !== undefined && this.afterCommit) throw grpc(this.afterError);
      return result;
    } catch (error) {
      if (error.message === 'retry exhausted') throw grpc(10);
      throw error;
    }
  }
}
let seq = 0, checks = 0;
const req = (id, kind = 'create', revision = 0, extra = {}) => ({ generation, id, operationId: `op-${++seq}`, kind,
  expectedRevision: revision, ...(kind === 'create' ? { source: { role: 'student', name: 'Unicode Nguyễn 😀' } } : {}), ...extra });
const api = db => adapter.createFirestoreAccountAdapter(db, fence, { maxAbortedAttempts: 5 });
async function run(db, request, status = 'committed', code) {
  const result = await core.mutateAccount(api(db), request);
  assert.equal(result.status, status, JSON.stringify(result));
  if (code) assert.equal(result.code, code);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_')); checks++; return result;
}
async function main() {
  const db = new FakeFirestore(), create = req('legacy_id@example_com');
  assert.equal(db.calls.length, 0); // factory/import performs no SDK I/O.
  await run(db, create);
  assert.deepStrictEqual(db.calls, [{ maxAttempts: 1 }]);
  const trace = db.trace[0];
  assert.deepStrictEqual(trace.slice(0, 5).map(x => x[0]), ['get', 'get', 'get', 'get', 'get']);
  assert.deepStrictEqual(trace.slice(0, 5).map(x => x[1]), [adapter.ACCOUNT_CONTROL_PATH, ...Object.values(p(create.id))]);
  assert.deepStrictEqual(trace.slice(5).map(x => x[1]), Object.values(p(create.id)));
  await run(db, create, 'duplicate');
  const nameUpdate = req(create.id, 'update', 1, { patch: { name: 'new' } });
  await run(db, nameUpdate);
  assert.equal(db.trace.at(-1).filter(([op, key]) => op !== 'get' && key === p(create.id).summary).length, 0);
  await run(db, req(create.id, 'delete', 2));
  assert.equal(db.memory.dump()[p(create.id).state].deleted, true);
  await run(db, req(create.id, 'create', 3));
  assert.equal(db.memory.dump()[p(create.id).state].revision, 4);
  const retry = new FakeFirestore(); retry.abortRemaining = 2;
  await run(retry, req('retry')); assert.equal(retry.calls.length, 3);
  assert.equal(retry.memory.metrics.committedWrites, 4);
  const exhausted = new FakeFirestore(); exhausted.abortRemaining = 10;
  await run(exhausted, req('a'), 'rejected', 'TRANSACTION_ABORTED'); assert.equal(exhausted.memory.metrics.committedWrites, 0);
  for (const [code, expected] of [[7, 'PERMISSION_DENIED'], [4, 'DEADLINE_EXCEEDED'], [14, 'UNAVAILABLE'], [3, 'INVALID_DOCUMENT_OR_INDEX'], [8, 'RESOURCE_EXHAUSTED']]) {
    const failure = new FakeFirestore(); failure.beforeError = code; const before = failure.memory.dump();
    await run(failure, req('a'), 'rejected', expected); assert.deepStrictEqual(failure.memory.dump(), before);
  }
  for (const code of [7, 3, 8]) {
    const failure = new FakeFirestore(); failure.afterError = code; const before = failure.memory.dump();
    await run(failure, req('a'), 'rejected', code === 7 ? 'PERMISSION_DENIED' : code === 3 ? 'INVALID_DOCUMENT_OR_INDEX' : 'RESOURCE_EXHAUSTED');
    assert.deepStrictEqual(failure.memory.dump(), before);
  }
  for (const committed of [false, true]) {
    const ambiguous = new FakeFirestore(), operation = req('a');
    ambiguous.afterError = 4; ambiguous.afterCommit = committed;
    await run(ambiguous, operation, 'unknown', 'UNKNOWN_COMMIT_OUTCOME');
    assert.equal(ambiguous.calls.length, 1); // Never blind-retry timeout.
    ambiguous.afterError = undefined;
    const proof = await adapter.reconcileAccountOperation(ambiguous, operation);
    assert.equal(proof.status, committed ? 'confirmed' : 'unresolved'); checks++;
    assert.equal(ambiguous.calls.at(-1).readOnly, true);
    assert.ok(ambiguous.trace.at(-1).every(([op]) => op === 'get'));
    if (committed) {
      await run(ambiguous, operation, 'duplicate');
      await run(ambiguous, req('a', 'update', 1, { patch: { name: 'later' } }));
      assert.equal((await adapter.reconcileAccountOperation(ambiguous, operation)).status, 'unresolved');
    }
  }
  const lost = new FakeFirestore(); lost.afterError = 14; lost.afterCommit = true;
  const lostRequest = req('lost'); await run(lost, lostRequest, 'unknown');
  lost.afterError = undefined; lost.memory.documents.get(p('a').summary).counts.total = -1;
  assert.equal((await adapter.reconcileAccountOperation(lost, lostRequest)).status, 'unresolved');
  for (const [patch, code] of [[{ activeGeneration: 'other' }, 'GENERATION_MISMATCH'], [{ epoch: 2 }, 'GENERATION_MISMATCH'],
    [{ status: 'building' }, 'GENERATION_NOT_READY'], [{ codecVersion: 2 }, 'SCHEMA_CODEC_MISMATCH'], [{ epoch: 0 }, 'CORRUPT_CONTROL']]) {
    const fenced = new FakeFirestore(); fenced.memory.documents.set(adapter.ACCOUNT_CONTROL_PATH, { ...control, ...patch });
    const before = fenced.memory.dump(); await run(fenced, req('a'), 'rejected', code); assert.deepStrictEqual(fenced.memory.dump(), before);
  }
  const cutover = new FakeFirestore(); cutover.cutover = true;
  await run(cutover, req('a'), 'rejected', 'GENERATION_MISMATCH');
  assert.equal(cutover.memory.metrics.committedWrites, 0); assert.equal(cutover.calls.length, 2);
  const arbitrary = new FakeFirestore();
  await run(arbitrary, { ...req('a'), generation: 'other-ready' }, 'rejected', 'PATH_OUT_OF_SCOPE');
  assert.equal(arbitrary.memory.metrics.committedWrites, 0);
  const noControl = new FakeFirestore(); noControl.memory.documents.delete(adapter.ACCOUNT_CONTROL_PATH);
  await run(noControl, req('a'), 'rejected', 'CORRUPT_CONTROL');
  const version = new FakeFirestore(); version.memory.documents.get(p('a').summary).codecVersion = 2;
  await run(version, req('a'), 'rejected', 'SCHEMA_CODEC_MISMATCH');
  const proofCutover = new FakeFirestore(), historical = req('historical');
  await run(proofCutover, historical);
  proofCutover.memory.documents.set(adapter.ACCOUNT_CONTROL_PATH, { ...control, activeGeneration: 'new-active', epoch: 2 });
  assert.equal((await adapter.reconcileAccountOperation(proofCutover, historical)).status, 'confirmed'); checks++;
  await run(proofCutover, historical, 'rejected', 'GENERATION_MISMATCH');
  proofCutover.beforeError = 7;
  assert.deepStrictEqual(await adapter.reconcileAccountOperation(proofCutover, historical), { status: 'unresolved', code: 'PERMISSION_DENIED' }); checks++;
  const missing = new FakeFirestore(); missing.memory.documents.set(p('a').source, { role: 'student' });
  await run(missing, req('a', 'update', 0, { patch: {} }), 'rejected', 'MISSING_STATE');
  const legacy = new FakeFirestore();
  await run(legacy, req('a', 'create', 0, { source: { extra: new Date() } }), 'rejected', 'CODEC_UNSUPPORTED');
  const concurrent = new FakeFirestore();
  await run(concurrent, req('a'));
  const outcomes = await Promise.all([1, 2].map(n => core.mutateAccount(api(concurrent), req('a', 'update', 1, { patch: { name: String(n) } }))));
  assert.equal(outcomes.filter(r => r.status === 'committed').length, 1);
  assert.equal(outcomes.filter(r => r.code === 'REVISION_CONFLICT').length, 1); checks += 2;
  const guard = new FakeFirestore(), before = guard.memory.dump();
  await assert.rejects(api(guard).runTransaction(async tx => { await tx.get(p('a').source); tx.set(p('a').source, {}); await tx.get(p('a').state); }),
    error => error.code === 'READ_AFTER_WRITE');
  assert.deepStrictEqual(guard.memory.dump(), before);
  assert.equal(errors.classifyAdapterError(grpc('DEADLINE_EXCEEDED'), true).outcome, 'unknown');
  console.log(`PASS: ${checks} adapter/proof scenarios plus mapping, fencing, isolation and no-runtime-SDK assertions.`);
  console.log('Fake Firestore only. No Firebase billed operations, credentials or SDK initialization.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });