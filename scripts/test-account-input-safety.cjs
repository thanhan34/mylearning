const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { spawnSync } = require('node:child_process');
const { validateEnvironment } = require('./lib/emulator-safety.cjs');
const exportsObject = {};
new Function('exports', 'require', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/accounts/input-precheck.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(exportsObject, name => { throw Error(`Unexpected import ${name}`); });
const check = exportsObject.precheckAccountInput;
assert.equal(check({ name: 'abc', email: '' }, { maxSearchUnits: 4 }).status, 'ready');
assert.equal(check({ name: 'abc', email: '' }, { maxSearchUnits: 3 }).status, 'overflow');
assert.equal(check({ name: '\u0130', email: '' }, { maxSearchUnits: 2 }).status, 'overflow');
assert.equal(check({ name: 'a'.repeat(5000) }).status, 'overflow');
assert.equal(check(Object.defineProperty({}, 'name', { get() { throw Error('getter executed'); } })).status, 'unsupported');
assert.equal(check({ name: {} }).status, 'unsupported');
for (const source of require('./fixtures/account-directory.cjs')) assert.equal(check(source).status, 'ready');
const safe = { ACCOUNTS_EMULATOR_PROJECT: 'demo-mylearning-codec', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' };
assert.equal(validateEnvironment(safe).port, 8080);
for (const patch of [{ ACCOUNTS_EMULATOR_PROJECT: 'mylearning-production' }, { FIRESTORE_EMULATOR_HOST: 'firestore.googleapis.com:443' },
  { FIRESTORE_EMULATOR_HOST: 'localhost.evil:8080' }, { FIRESTORE_EMULATOR_HOST: '' }, { GOOGLE_APPLICATION_CREDENTIALS: 'service.json' },
  { FIREBASE_CONFIG: '{}' }, { GCLOUD_PROJECT: 'production' }]) assert.throws(() => validateEnvironment({ ...safe, ...patch }), /SAFETY/);
for (const patch of [{ ACCOUNTS_EMULATOR_PROJECT: 'production' }, { FIRESTORE_EMULATOR_HOST: 'firestore.googleapis.com:443' }, { GOOGLE_APPLICATION_CREDENTIALS: 'production.json' }]) {
  const child = spawnSync(process.execPath, [path.join(__dirname, 'emulator-account-codec.cjs')], {
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...safe, ...patch }, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(child.status, 1); assert.match(child.stderr, /SAFETY/);
  assert.doesNotMatch(child.stderr, /EMULATOR_UNAVAILABLE/); // Rejected before even local readiness/SDK load.
}
console.log('PASS: pre-gram input bounds, Unicode expansion, no getter/coercion, fixtures, production/project/credential/nonlocal host rejection.');