const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const loaded = { exports: {} };
let actor = { id: 'student', role: 'student' };
const calls = [];
class AccessError extends Error {
  constructor(message, status = 403) { super(message); this.status = status; }
}
const collection = {
  where: (...args) => { calls.push(['where', ...args]); return collection; },
  limit: () => collection,
  get: async () => ({ docs: [] }),
  add: async data => { calls.push(['add', data]); },
  doc: id => ({ update: async data => { calls.push(['update', id, data]); } }),
};
const mocks = {
  'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
  'firebase-admin/firestore': { Timestamp: { now: () => 'timestamp' } },
  '@/lib/server/firebase-admin': { adminDb: () => ({ collection: name => { calls.push(['collection', name]); return collection; } }) },
  '@/lib/server/access': {
    currentAccount: async () => actor, checkOrigin: () => {}, AccessError,
    apiError: error => ({ status: error.status || 500 }),
  },
};
const compiled = ts.transpileModule(fs.readFileSync(path.join(root, 'app/api/learning/records/route.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
new Function('require', 'exports', 'module', compiled)(name => {
  assert.ok(name in mocks, `Unexpected dependency: ${name}`);
  return mocks[name];
}, loaded.exports, loaded);
const post = body => loaded.exports.POST(new Request('http://localhost/api/learning/records', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));
async function main() {
  for (const role of ['admin', 'teacher', 'assistant', 'student']) {
    actor = { id: role, role };
    calls.length = 0;
    assert.equal((await loaded.exports.GET(new Request('http://localhost/api/learning/records?kind=dailyNotes'))).status, 400);
    assert.equal((await post({ kind: 'dailyNotes', content: 'Removed' })).status, 400);
    assert.deepEqual(calls, [], 'Removed feature must not access the database');
  }
  assert.equal((await loaded.exports.GET(new Request('http://localhost/api/learning/records?kind=mocktests'))).status, 200);
  assert.ok(calls.some(call => call[0] === 'where' && call[1] === 'studentId'));
  assert.equal((await post({ kind: 'mocktests', link: 'https://example.com/test' })).status, 200);
  assert.equal((await post({ kind: 'mocktests', id: 'test', feedback: 'test' })).status, 403);
  actor = { id: 'admin', role: 'admin' };
  assert.equal((await post({ kind: 'mocktests', id: 'test', feedback: 'Good' })).status, 200);
  assert.ok(calls.some(call => call[0] === 'update'));
  for (const role of ['admin', 'teacher', 'assistant']) {
    assert.equal(fs.existsSync(path.join(root, `app/dashboard/${role}/daily-notes/page.tsx`)), false);
  }
  for (const folder of ['app', 'components', 'lib']) {
    function inspect(directory) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) inspect(file);
        else if (/\.(tsx?|jsx?)$/.test(entry.name)) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /dailyNotes|daily-notes|DailyNotes|Nhật ký học tập/, file);
      }
    }
    inspect(path.join(root, folder));
  }
  console.log('PASS: daily notes removed; API rejects old requests; mocktest reads, submissions and feedback preserved.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });