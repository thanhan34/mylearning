const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let lookups = 0;
let creations = 0;
let existing = { id: 'existing-admin', role: 'admin' };
const source = fs.readFileSync(path.join(root, 'app/api/auth/config.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
const mockRequire = name => {
  if (name === 'next-auth/providers/credentials') return { default: options => ({ id: 'mock', options }) };
  if (name === '../../../lib/mock/config') return { MOCK_ENABLED: false };
  if (name === 'next-auth/providers/google') return { default: options => ({ id: 'google', options }) };
  if (name === '../../firebase/services/user') return {
    getUserByEmail: async () => { lookups++; return existing; },
    createUser: async data => { creations++; assert.equal(data.role, 'student'); return 'new-student'; },
  };
  throw new Error(`Unexpected auth dependency: ${name}`);
};
new Function('require', 'exports', 'module', compiled)(mockRequire, loaded.exports, loaded);
(async () => {
  const callbacks = loaded.exports.authOptions.callbacks;
  const user = { email: 'admin@example.test' };
  assert.equal(await callbacks.signIn({ user }), true);
  assert.equal(user.id, 'existing-admin');
  assert.equal(user.role, 'admin');
  assert.equal(creations, 0);
  existing = null;
  const student = { email: 'student@example.test', name: 'Student' };
  assert.equal(await callbacks.signIn({ user: student }), true);
  assert.equal(student.role, 'student');
  assert.equal(creations, 1);
  const before = lookups;
  const token = await callbacks.jwt({ token: {}, user, account: { access_token: 'test-token' } });
  const refreshed = await callbacks.jwt({ token });
  const session = await callbacks.session({ session: { user: { email: user.email } }, token: refreshed });
  assert.equal(session.user.id, user.id);
  assert.equal(session.user.role, 'admin');
  assert.equal(lookups, before, 'JWT/session refresh must not depend on Firestore or Admin IAM');
  assert.ok(!source.includes('findAccount'));
  console.log('PASS: legacy NextAuth sign-in, account creation and database-independent session callbacks.');
})().catch(error => { console.error(error); process.exitCode = 1; });