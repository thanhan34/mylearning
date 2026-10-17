const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, TextEncoder, require(name) {
    assert.ok(Object.hasOwn(imports, name), `Blocked runtime import ${name}`); return imports[name];
  } });
  return exports;
}
const access = load('lib/learning-access.ts');
const util = load('lib/accounts/directory.ts', { '../learning-access': access });
// Extract the actual GET projection function, not a second copy of its logic.
const route = fs.readFileSync(path.join(root, 'app/api/learning/accounts/route.ts'), 'utf8');
const oracleSource = route.slice(route.indexOf('function accountView'), route.indexOf('export async function GET'));
const oracleCode = ts.transpileModule(oracleSource, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const context = { isApproved: access.isApproved };
vm.runInNewContext(oracleCode, context);
const fixture = require('./fixtures/account-directory.cjs');
const equal = (a, b) => assert.deepStrictEqual(structuredClone(a), structuredClone(b));
let checks = 0;
function verify(source, id, queries) {
  const original = { ...source }, dir = util.projectAccount(id, source);
  const view = context.accountView({ ...source, id });
  equal(dir.view, view); equal(source, original);
  equal(dir, util.projectAccount(id, source));
  assert.equal(dir.searchTextV1, `${view.name} ${view.email}`.toLowerCase());
  assert.equal(dir.approvedEffective, access.isApproved(source));
  for (const query of queries) {
    const match = `${view.name} ${view.email}`.toLowerCase().includes(query.toLowerCase());
    assert.equal(util.matchesAccountSearch(dir.view, query), match);
    if (match) assert.ok(util.isSearchCandidate(dir, query), 'Candidate index false negative');
    assert.equal(util.verifiedSearchMatch(dir, query), match); checks++;
  }
  const c = dir.contribution;
  assert.equal(c.students, Number(view.role === 'student'));
  assert.equal(c.pendingStudents, Number(view.role === 'student' && view.approvalStatus !== 'approved'));
  assert.equal(c.staff, Number(['teacher', 'assistant'].includes(view.role)));
  assert.equal(c.rawRejected, Number(source.approvalStatus === 'rejected'));
  assert.equal(c.total, 1);
  equal(util.contributionDelta(c, c), { total: 0, students: 0, pendingStudents: 0, approvedStudents: 0, staff: 0, rawRejected: 0, byRole: {}, byRoleApproval: {} });
  return dir;
}
fixture.forEach((s, i) => verify(s, `legacy-${i}`, ['', ' ', 'undefined', 'null', 'an nguyen', 'NGUYEN', '\u1ec5', '\ud83d', '\udc00', 'e\u0301', '\u00e9', '  ']));
// Seeded generative property testing without adding a dependency.
let seed = 0x12345678;
const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
const units = ['a', 'B', ' ', '@', '.', '\u1ec5', '\u0301', '\u00e9', '\ud83d', '\ude00', '\ud800', '\udc00', '\u0130', '\u03a3'];
const text = () => Array.from({ length: random(45) }, () => units[random(units.length)]).join('');
for (let i = 0; i < 2000; i++) {
  const source = { ...fixture[random(fixture.length)], name: text(), email: text() };
  const joined = `${source.name || ''} ${source.email}`.toLowerCase();
  const start = random(joined.length + 1), end = start + random(joined.length - start + 1);
  verify(source, `user_${i}`, [joined.slice(start, end), text(), '', ' ', joined]);
}
const falsePositive = util.projectAccount('false-positive', { name: 'abc---bcd', email: '' });
assert.ok(util.isSearchCandidate(falsePositive, 'abcd'));
assert.equal(util.verifiedSearchMatch(falsePositive, 'abcd'), false);
assert.notEqual(util.gramKey('\ud800'), util.gramKey('\ufffd'));
assert.notEqual(util.gramKey('\ud83d'), util.gramKey('\ude00'));
const before = util.countContribution({ role: 'student', approvalStatus: 'pending' });
const after = util.countContribution({ role: 'teacher' });
const delta = util.contributionDelta(before, after);
assert.equal(delta.students, -1); assert.equal(delta.pendingStudents, -1); assert.equal(delta.staff, 1); assert.equal(delta.total, 0);
assert.equal(util.contributionDelta(null, before).total, 1);
assert.equal(util.contributionDelta(before, null).total, -1);
assert.throws(() => util.projectAccount('invalid', { role: {} }), /Unsupported/);
const measurements = [40, 80, 160, 320, 4000].map(L => {
  const s = Array.from({ length: L }, (_, i) => String.fromCharCode(0x1000 + i)).join('');
  const dir = util.projectAccount(`length-${L}`, { name: s, email: '' });
  const risk = util.assessIndexRisk(dir);
  const direct = util.createSearchGrams(s);
  assert.equal(direct.length, 3 * L - 3);
  assert.equal(risk.estimatedIndexEntries, risk.grams * 4);
  return { L, directUniqueGrams: direct.length, projectionGrams: risk.grams, entriesFourConfigurations: risk.estimatedIndexEntries, serializedBytes: risk.serializedUtf8Bytes, warnings: risk.warnings };
});
assert.ok(measurements.at(-1).warnings.some(w => w.includes('40000')));
// Installed implementation must propagate readTime; no Firestore object is constructed.
const adminVersion = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/firebase-admin/package.json'), 'utf8')).version;
const firestoreVersion = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@google-cloud/firestore/package.json'), 'utf8')).version;
const transaction = fs.readFileSync(path.join(root, 'node_modules/@google-cloud/firestore/build/src/transaction.js'), 'utf8');
assert.ok(transaction.includes('transactionOptions.readTime'));
assert.ok(transaction.includes('readTime'));
console.log(`PASS: ${fixture.length} fixtures, 2000 seeded sources, ${checks} search parity checks, raw/effective approval, role/count deltas, idempotence, UTF-16 encoding and risk warnings.`);
console.log(JSON.stringify({ measurements, snapshot: { adminVersion, firestoreVersion, typecheck: 'run TypeScript for Admin SDK signature', runtime: 'readTime propagation inspected locally; no RPC' }, disclaimer: 'Index configurations assumed 4. JSON bytes are not exact Firestore size. No data/index writes.' }, null, 2));