const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const loaded = { exports: {} };
const mocks = {
  'next-auth': { getServerSession: async () => null },
  'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
  '@/app/api/auth/config': { authOptions: {} },
  './accounts': { findAccount: async () => null },
  '../learning-access': { isApproved: () => false },
};
const compiled = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/server/access.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
new Function('require', 'exports', 'module', compiled)(name => {
  if (!(name in mocks)) throw Error(`Unexpected dependency ${name}`);
  return mocks[name];
}, loaded.exports, loaded);
const { apiError, AccessError } = loaded.exports;
const originalError = console.error;
console.error = () => {};
try {
  for (const code of [9, '9', 'failed-precondition', 'firestore/failed-precondition', 'FAILED_PRECONDITION']) {
    for (const field of ['message', 'details']) {
      const result = apiError({ code, [field]: 'The query requires an index. private diagnostic detail' });
      assert.equal(result.status, 503);
      assert.equal(result.body.code, 'FIRESTORE_INDEX_NOT_READY');
      assert.match(result.body.error, /index Firestore/);
      assert.ok(!JSON.stringify(result.body).includes('private diagnostic detail'));
    }
  }
  assert.equal(apiError({ code: 9, message: 'Other precondition failure' }).status, 500);
  assert.equal(apiError({ code: 9 }).status, 500);
  assert.equal(apiError({ code: 9, details: 'The index is not ready yet.' }).status, 503);
  assert.equal(apiError(new Error('The query requires an index.')).status, 500);
  for (const code of [8, '8', 'resource-exhausted', 'firestore/resource-exhausted', 'RESOURCE_EXHAUSTED']) {
    const result = apiError({ code, message: 'private diagnostic detail' });
    assert.equal(result.status, 503);
    assert.equal(result.body.code, 'FIRESTORE_RESOURCE_EXHAUSTED');
    assert.match(result.body.error, /quota/);
    assert.ok(!JSON.stringify(result.body).includes('private diagnostic detail'));
  }
  for (const status of [400, 401, 403, 404, 409]) {
    const result = apiError(new AccessError('Access validation', status));
    assert.equal(result.status, status);
    assert.equal(result.body.error, 'Access validation');
  }
  for (const code of [7, 'permission-denied']) {
    const result = apiError({ code });
    assert.equal(result.status, 503);
    assert.match(result.body.error, /Firebase Admin/);
  }
  assert.equal(apiError(new Error('internal')).status, 500);
  assert.equal(apiError(null).status, 500);
} finally {
  console.error = originalError;
}
console.log('PASS: index and quota errors are actionable; unrelated preconditions, access statuses, permission errors and private diagnostics are preserved.');