const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const exportsValue = {};
const root = path.resolve(__dirname, '..');
const code = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/firebase-emulator.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
new Function('exports', code)(exportsValue);
const target = exportsValue.firebaseEmulatorTarget;
const valid = { enabled: '1', projectId: 'demo-mocktest-phase43', firestore: '127.0.0.1:8080', auth: '127.0.0.1:9099' };
assert.equal(target({}), null, 'Production default remains unchanged');
assert.equal(target({ enabled: '0' }), null);
assert.equal(target(valid).host, '127.0.0.1');
for (const key of Object.keys(valid)) {
  for (const value of ['', 'wrong', 'localhost:8080', 'production-project']) {
    assert.throws(() => target({ ...valid, [key]: value }), /Invalid Firebase/);
  }
  if (key !== 'enabled') assert.throws(() => target({ ...valid, [key]: undefined }), /Invalid Firebase/);
}
console.log('PASS: explicit emulator opt-in, fixed demo identity/ports, missing/malformed configuration rejected; production default unchanged.');