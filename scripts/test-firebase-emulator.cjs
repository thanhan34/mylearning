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

const vm = require('node:vm');
const buildConfig = fs.readFileSync(path.join(root, 'next.config.js'), 'utf8');
function config(env) {
  const module = { exports: {} };
  vm.runInNewContext(buildConfig, { process: { env }, module });
  return module.exports;
}
assert.equal(config({}).env.NEXT_PUBLIC_FIREBASE_EMULATOR_TEST, '0');
assert.equal(config({ NEXT_PUBLIC_FIREBASE_EMULATOR_TEST: '1' }).env.NEXT_PUBLIC_FIREBASE_EMULATOR_TEST, '1');
assert.throws(() => config({ NEXT_PUBLIC_FIREBASE_EMULATOR_TEST: 'bad' }), /Invalid emulator/);
assert.throws(() => config({ NEXT_PUBLIC_FIREBASE_EMULATOR_TEST: '1', VERCEL: '1' }), /local-test only/);

function initialize(flag, invalid = false) {
  const calls = [];
  const app = {};
  const global = {};
  const imports = {
    'firebase/app': { getApps: () => [], initializeApp: () => app },
    'firebase/firestore': { getFirestore: () => ({}), connectFirestoreEmulator: () => calls.push('firestore') },
    'firebase/auth': { getAuth: () => ({}), connectAuthEmulator: () => calls.push('auth') },
    'firebase/storage': { getStorage: () => ({}) },
    '../../lib/mock/config': { MOCK_ENABLED: false },
    '../../lib/firebase-emulator': { firebaseEmulatorTarget: target },
  };
  const source = fs.readFileSync(path.join(root, 'app/firebase/config.ts'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(js, { exports: {}, globalThis: global, WeakSet, process: { env: {
    NEXT_PUBLIC_FIREBASE_EMULATOR_TEST: flag,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: invalid ? 'wrong' : valid.projectId,
    NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: valid.firestore,
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: valid.auth,
  } }, require: name => { assert.ok(name in imports, name); return imports[name]; } });
  return { global, calls };
}
for (const flag of [undefined, '0']) {
  const result = initialize(flag);
  assert.deepEqual(result.calls, []);
  assert.equal(Object.hasOwn(result.global, '__learningEmulatorApps'), false);
}
assert.deepEqual(initialize('1').calls, ['firestore', 'auth']);
assert.throws(() => initialize('1', true), /Invalid Firebase/);
console.log('PASS: build literal/default/hosting rejection; production initialization has zero emulator globals/calls; test wiring connects both SDKs and fails closed.');