const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let actor = { id: 'staff', role: 'teacher', assignedFeedbackTypes: [] };
let calls = [];
let documents = [];
let target = { role: 'student', name: 'Learner', email: 'learner@example.com' };
class AccessError extends Error { constructor(message, status = 403) { super(message); this.status = status; } }
const query = {
  where(...args) { calls.push(['where', ...args]); return this; },
  orderBy(...args) { calls.push(['orderBy', ...args]); return this; },
  limit(...args) { calls.push(['limit', ...args]); return this; },
  select(...args) { calls.push(['select', ...args]); return this; },
  startAfter(...args) { calls.push(['startAfter', ...args]); return this; },
  async get() { calls.push(['get']); return { docs: documents, size: documents.length }; },
  doc(id) { calls.push(['doc', id]); return { get: async () => ({ exists: !!target, data: () => target }) }; },
};
const mocks = {
  'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
  'firebase-admin/firestore': { FieldPath: { documentId: () => '__name__' } },
  '@/lib/server/firebase-admin': { adminDb: () => ({ collection: name => { calls.push(['collection', name]); return query; } }) },
  '@/lib/server/access': { currentAccount: async () => { if (!actor) throw new AccessError('Login', 401); return actor; }, AccessError, apiError: error => ({ status: error.status || 500 }) },
};
const loaded = { exports: {} };
const compiled = ts.transpileModule(fs.readFileSync(path.join(root, 'app/api/learning/students/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function('require', 'exports', 'module', compiled)(name => { assert.ok(name in mocks, name); return mocks[name]; }, loaded.exports, loaded);
async function get(params = '') { calls = []; return loaded.exports.GET(new Request(`https://example.com/api/learning/students${params}`)); }
function docs(count) { return Array.from({ length: count }, (_, i) => ({ id: `id-${String(i).padStart(2, '0')}`, data: () => ({ userId: 'learner', name: 'Learner', email: 'learner@example.com', secret: 'hidden', date: '2020-01-01', submissions: [{ type: 'Describe image', link: 'example' }] }) })); }
(async () => {
  for (const role of ['teacher', 'assistant', 'admin']) {
    actor = { id: 'staff', role, assignedFeedbackTypes: [] };
    documents = docs(21);
    const result = await get();
    assert.equal(result.status, 200);
    assert.equal(result.body.students.length, 20);
    assert.equal(result.body.nextCursor, 'id-19');
    assert.ok(!JSON.stringify(result.body).includes('secret'));
    assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(['limit', 21])));
    assert.ok(!calls.some(call => call[1] === 'homework'));
  }
  await get('?after=id-19');
  assert.ok(calls.some(call => call[0] === 'startAfter' && call[1] === 'id-19'));
  documents = docs(25).map((doc, index) => ({ ...doc, data: () => ({ name: index === 24 ? 'Nguyễn An' : 'Other', email: index === 24 ? 'an@example.com' : 'other@example.com' }) }));
  const search = await get('?search=nguy%E1%BB%85n');
  assert.deepEqual(search.body.students.map(student => student.id), ['id-24']);
  assert.equal(search.body.nextCursor, null);
  assert.ok(!calls.some(call => call[0] === 'limit'));
  documents = ['ngọc vũ', 'Ngọc Vũ', 'Ngoc Vu', 'NGỌC VŨ', 'Ngọc  Vũ', 'Đặng Đức', 'Đoàn', 'Khác'].map((name, index) => ({
    id: `id-${String(index).padStart(2, '0')}`, data: () => ({ name, email: `user${index}@example.com` }),
  }));
  for (const term of ['ngoc vu', 'NGỌC VŨ', '  NgOc   Vu  ']) {
    const result = await get(`?search=${encodeURIComponent(term)}`);
    assert.deepEqual(result.body.students.map(student => student.id), ['id-00', 'id-01', 'id-02', 'id-03', 'id-04']);
  }
  assert.deepEqual((await get('?search=dang%20duc')).body.students.map(student => student.id), ['id-05']);
  assert.deepEqual((await get('?search=DOAN')).body.students.map(student => student.id), ['id-06']);
  assert.deepEqual((await get('?search=USER0%40EXAMPLE.COM')).body.students.map(student => student.id), ['id-00']);
  documents = docs(25);
  const searchPage = await get('?search=learner');
  assert.equal(searchPage.body.students.length, 20);
  assert.equal(searchPage.body.nextCursor, 'id-19');
  const searchNext = await get('?search=learner&after=id-19');
  assert.equal(searchNext.body.students.length, 5);
  assert.equal(searchNext.body.students[0].id, 'id-20');
  documents = docs(21);
  const first = await get('?studentId=learner');
  assert.equal(first.body.homework.length, 20);
  assert.equal(first.body.homework[0].submissions[0].type, 'Describe image');
  assert.ok(calls.some(call => call[0] === 'where' && call[1] === 'userId' && call[3] === 'learner'));
  assert.ok(!calls.some(call => call[0] === 'where' && call[1] === 'date'));
  const cursor = first.body.nextCursor;
  documents = docs(2);
  const second = await get(`?studentId=learner&after=${cursor}`);
  assert.equal(second.body.nextCursor, null);
  assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(['startAfter', '2020-01-01', 'id-19'])));
  for (const params of ['?after=', '?after=a/b', '?studentId=', '?studentId=a/b', '?studentId=learner&after=invalid', `?studentId=other&after=${cursor}`]) assert.equal((await get(params)).status, 400);
  target = null;
  assert.equal((await get('?studentId=missing')).status, 404);
  target = { role: 'teacher' };
  assert.equal((await get('?studentId=staff')).status, 404);
  documents = [];
  assert.deepEqual((await get()).body, { students: [], nextCursor: null });
  for (const role of ['student', 'unknown']) {
    actor = { role };
    for (const params of ['', '?studentId=learner']) { assert.equal((await get(params)).status, 403); assert.equal(calls.length, 0); }
  }
  actor = null;
  assert.equal((await get()).status, 401);
  console.log('PASS: staff access, privacy projection, bounded queries, historical/all-type reads, cursors, invalid input and access denial.');
})().catch(error => { console.error(error); process.exitCode = 1; });