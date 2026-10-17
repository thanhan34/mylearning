// Test-process preload only. Never imported by application code or bundled.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
assert.equal(process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_TEST, '1');
assert.equal(process.env.FIREBASE_PROJECT_ID, 'demo-mocktest-phase43');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
for (const key of ['FIREBASE_PRIVATE_KEY', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_APPLICATION_CREDENTIALS']) assert.ok(!process.env[key]);
const dir = process.env.MOCKTEST_FAULT_DIR;
assert.ok(dir && path.isAbsolute(dir));
fs.mkdirSync(dir, { recursive: true });
const log = event => fs.appendFileSync(path.join(dir, 'events.jsonl'), JSON.stringify({ event, at: Date.now() }) + '\n');
const { Firestore } = require('@google-cloud/firestore');
const original = Firestore.prototype.request;
Firestore.prototype.request = async function(method, request, ...rest) {
  const selected = method === 'commit' && request.transaction && request.writes?.some(w => w.update?.name?.includes('/documents/mocktests/'));
  if (!selected) return original.call(this, method, request, ...rest);
  log('route-commit-request');
  const control = path.join(dir, 'control.json');
  const config = fs.existsSync(control) ? JSON.parse(fs.readFileSync(control)) : {};
  if (config.mode) {
    fs.unlinkSync(control); // Single fault only, retries run against the real emulator.
    log('fault-' + config.mode);
    if (config.mode === 'pause') {
      const deadline = Date.now() + 20000;
      while (!fs.existsSync(path.join(dir, 'release')) && Date.now() < deadline) await new Promise(r => setTimeout(r, 25));
      if (!fs.existsSync(path.join(dir, 'release'))) throw new Error('Commit pause timed out');
      fs.unlinkSync(path.join(dir, 'release'));
    } else {
      // Real emulator rollback releases read locks; then inject the RPC status.
      await original.call(this, 'rollback', { database: request.database, transaction: request.transaction }, ...rest);
      log('emulator-rollback-ack');
      const error = new Error('Local test injected ' + config.mode);
      error.code = config.mode === 'abort-once' ? 10 : 7;
      throw error;
    }
  }
  const result = await original.call(this, method, request, ...rest);
  log('emulator-commit-ack');
  return result;
};