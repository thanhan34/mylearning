const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let session = null;
let account = null;
let reads = 0;
const loaded = { exports: {} };
const mocks = {
  '@/lib/mock/config': { MOCK_ENABLED: false },
  'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
  'next-auth': { getServerSession: async () => session },
  '@/app/api/auth/config': { authOptions: {} },
  '@/app/firebase/services/user': { getUserByEmail: async () => { reads++; return account; } },
  '@/lib/server/access': { apiError: () => ({ status: 500 }), currentAccount: () => { throw Error('Admin lookup must not run'); } },
  '@/lib/server/firebase-admin': { adminAuth: () => { throw Error('Admin token must not run'); } },
  '@/lib/learning-access': { isApproved: () => false },
};
const source = fs.readFileSync(path.join(root, 'app/api/learning/session/route.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
new Function('require', 'exports', 'module', compiled)(name => {
  if (!(name in mocks)) throw Error(`Unexpected dependency ${name}`);
  return mocks[name];
}, loaded.exports, loaded);
(async () => {
  const get = loaded.exports.GET;
  assert.equal((await get()).status, 401);
  assert.equal(reads, 0);
  session = { user: { email: 'student@example.test' } };
  assert.equal((await get()).status, 503);
  account = { id: 's', email: session.user.email, role: 'student', approvalStatus: 'pending' };
  const pending = await get();
  assert.equal(pending.status, 200);
  assert.equal(pending.body.account.approvalStatus, 'pending');
  assert.equal(pending.body.token, undefined);
  account = { ...account, email: 'other@example.test' };
  assert.equal((await get()).status, 503);
  const gate = fs.readFileSync(path.join(root, 'components/LearningGate.tsx'), 'utf8');
  assert.ok(!gate.includes('signInWithCustomToken'));
  assert.ok(gate.includes('!isApproved(account)'));
  console.log('PASS: session lookup uses legacy account service, rejects missing/mismatched identity, preserves pending status and does not require Admin IAM.');
})().catch(error => { console.error(error); process.exitCode = 1; });