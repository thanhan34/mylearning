const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
// Installed serializer and protobuf codec only. No Firestore constructor/credentials/RPC.
const sdk = require(path.join(root, 'node_modules/@google-cloud/firestore/build/src/serializer.js'));
const proto = require('protobufjs').Root.fromJSON(require(path.join(root, 'node_modules/@google-cloud/firestore/build/protos/v1.json')));
const serializer = new sdk.Serializer({ _settings: { ignoreUndefinedProperties: false }, doc() { throw Error('References unsupported'); } });
function firestoreWire(dto) {
  sdk.validateUserInput('dto', dto, 'root', { allowUndefined: false, allowDeletes: 'none', allowTransforms: false });
  const fields = serializer.encodeFields(dto);
  const message = proto.lookupType('google.firestore.v1.Document');
  const restored = message.decode(message.encode(message.create({ fields })).finish());
  return serializer.decodeValue({ mapValue: { fields: restored.fields } });
}
const samples = [undefined, null, -0, NaN, Infinity, -Infinity, 1.5, {}, [],
  { a: undefined, b: null, c: [], nested: [[1, undefined], {}] },
  'Nguy\u1ec5n', '\u00e9', 'e\u0301', '\ud83d\ude00', '\ud800', '\udc00',
  { ['__proto__']: 'safe', ['\ud800']: '\udc00' }, Object.assign(Object.create(null), { x: 1 })];
// The loader below executes module functions in the current realm for prototype validation.
function localLoad(file, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', code)(exports, name => {
    if (name === 'node:crypto') return require(name);
    assert.ok(Object.hasOwn(imports, name)); return imports[name];
  }); return exports;
}
const c = localLoad('lib/accounts/codec.ts');
const s = localLoad('lib/accounts/storage.ts', { './codec': c });
const a = localLoad('lib/learning-access.ts');
const d = localLoad('lib/accounts/directory.ts', { '../learning-access': a });
for (const sample of samples) assert.deepStrictEqual(c.decodeValue(firestoreWire(c.encodeValue(sample))), sample);
assert.notEqual(c.canonicalHash({}, 1), c.canonicalHash({ a: undefined }, 1));
assert.notEqual(c.canonicalHash({ a: undefined }, 1), c.canonicalHash({ a: null }, 1));
assert.equal(c.canonicalHash({ a: 1, b: 2 }, 1), c.canonicalHash({ b: 2, a: 1 }, 1));
assert.notEqual(c.canonicalHash('\u00e9', 1), c.canonicalHash('e\u0301', 1));
assert.notEqual(c.canonicalHash(0, 1), c.canonicalHash(-0, 1));
assert.notEqual(c.canonicalHash({}, 1), c.canonicalHash({}, 2));
const cycle = {}; cycle.self = cycle;
for (const unsupported of [cycle, () => 1, Symbol('x'), 1n, new Date(), new Map(), new Set(), new Uint8Array(2), [, 1], Object.defineProperty({}, 'x', { get() { throw Error('must not execute'); }, enumerable: true }), { [Symbol('x')]: 1 }]) {
  assert.throws(() => c.encodeValue(unsupported), error => error.code === 'UNSUPPORTED');
}
assert.throws(() => c.encodeValue('abcd', { maxUnits: 3 }), error => error.code === 'BUDGET');
assert.equal(c.decodeValue(c.encodeValue('abcd', { maxUnits: 4 })), 'abcd');
assert.throws(() => c.encodeValue([1, 2], { maxNodes: 2 }), error => error.code === 'BUDGET');
assert.throws(() => c.encodeValue([[1]], { maxDepth: 1 }), error => error.code === 'BUDGET');
assert.throws(() => c.encodeValue({}, { maxNodes: -1 }), error => error.code === 'BUDGET');
assert.throws(() => c.encodeValue(Object.defineProperty({}, 'length', { value: 1 })), error => error.code === 'UNSUPPORTED');
let seed = 42;
const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
for (let i = 0; i < 500; i++) {
  const name = Array.from({ length: random(30) }, () => String.fromCharCode(random(65536))).join('');
  const source = { name, email: name + '@x', role: 'student', approvalStatus: i % 2 ? undefined : null };
  const projection = d.projectAccount(`id-${i}`, source);
  assert.deepStrictEqual(c.decodeDirectory(firestoreWire(c.encodeDirectory(projection))), projection);
}
assert.throws(() => c.decodeValue({ codecVersion: 2, payload: 'n' }), error => error.code === 'INVALID_DTO');
for (const payload of ['s1:zzzz', 'o2:s1:0061ns1:0061n', 'ntrailing', 'a999999999:', 'd7ff0000000000001']) assert.throws(() => c.decodeValue({ codecVersion: 1, payload }));
const fixtures = require('./fixtures/account-directory.cjs');
for (const source of fixtures) {
  const copy = structuredClone(source);
  const restoredSource = c.decodeValue(firestoreWire(c.encodeValue(source)));
  assert.deepStrictEqual(restoredSource, source);
  const projected = d.projectAccount('legacy-id', source);
  assert.deepStrictEqual(d.projectAccount('legacy-id', restoredSource), projected);
  const restored = c.decodeDirectory(firestoreWire(c.encodeDirectory(projected)));
  assert.deepStrictEqual(restored, projected);
  for (const query of ['', ' ', 'undefined', 'null', 'NGUYEN', '\ud800', 'an nguyen']) assert.equal(d.verifiedSearchMatch(restored, query), d.verifiedSearchMatch(projected, query));
  assert.deepStrictEqual(source, copy);
}
const config = { arrayIndexes: Array.from({ length: 4 }, () => ({ scalarFields: ['groupEffective'] })), otherEntries: 0, otherIndexBytes: 0, documentNameBytes: 120, parentDocumentNameBytes: 80, maxPayloadBytes: 2000000 };
const measured = [40, 80, 320, 4000].map(L => {
  const name = Array.from({ length: L }, (_, i) => String.fromCharCode(0x1000 + i)).join('');
  const dto = c.encodeDirectory(d.projectAccount('id', { role: 'student', name, email: '' }));
  assert.deepStrictEqual(firestoreWire(dto), dto);
  return { L, ...s.storagePreflight(dto, config) };
});
assert.ok(measured.at(-1).issues.some(x => x.includes('40000')));
const minimal = c.encodeDirectory(d.projectAccount('id', {}));
assert.throws(() => c.decodeDirectory({ ...minimal, groupEffective: 'staff' }), error => error.code === 'INVALID_DTO');
assert.throws(() => c.decodeDirectory({ ...minimal, extra: undefined }), error => error.code === 'INVALID_DTO');
assert.ok(s.storagePreflight(minimal, { ...config, documentNameBytes: 1048576 }).issues.some(x => x.includes('1 MiB')));
assert.ok(s.storagePreflight(minimal, { ...config, parentDocumentNameBytes: 8000 }).issues.some(x => x.includes('7.5 KiB')));
assert.throws(() => s.storagePreflight(c.encodeDirectory(d.projectAccount('id', {})), { ...config, maxPayloadBytes: 1 }), error => error.code === 'BUDGET');
console.log('PASS: lossless primitive/container round-trip through installed SDK + binary protobuf, presence, UTF-16, numbers, canonical hashes, unsupported/budget errors, 25 projection fixtures and storage estimates.');
console.log(JSON.stringify(measured, null, 2));