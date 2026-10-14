const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { createSeed } = require('../lib/mock/seed');
const { execute } = require('../lib/mock/engine');
const documents = createSeed();
delete documents['users/mock-admin_support'];
documents['users/mock-student'].name = 'Edited demo student';
global.__learningMockStore = { documents, revision: 12 };
const readSupport = () => execute({ kind: 'read', ref: { path: 'users', type: 'collection', constraints: [
  { kind: 'where', field: 'email', op: '==', value: 'admin_support@mock.local' },
] } });
const result = readSupport();
assert.equal(result.documents.length, 1);
assert.equal(result.documents[0].data.role, 'admin_support');
assert.equal(result.revision, 13);
assert.equal(documents['users/mock-student'].name, 'Edited demo student');
assert.equal(readSupport().revision, 13, 'Migration must run only once');
assert.throws(() => execute({ kind: 'commit', revision: 12, writes: [] }), /MOCK_CONFLICT/);
documents['users/mock-admin_support'].name = 'Edited support';
global.__learningMockStore.seedVersion = 0;
assert.equal(readSupport().documents[0].data.name, 'Edited support');
assert.equal(readSupport().revision, 13, 'Existing account must not be overwritten');
execute({ kind: 'commit', writes: [{ kind: 'delete', path: 'users/mock-admin_support' }] });
assert.equal(readSupport().documents.length, 0, 'Do not recreate intentionally deleted accounts after migration');
console.log('PASS: old mock store upgrade, account lookup, preserved edits, idempotence and revision conflicts.');