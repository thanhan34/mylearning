const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { sortPendingAccounts } = require('../lib/learning-access');

const accounts = [
  { id: 'missing' },
  { id: 'old', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'invalid', createdAt: 'invalid' },
  { id: 'new', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'same', createdAt: '2025-01-01T00:00:00Z' },
];
assert.deepEqual(sortPendingAccounts(accounts).map(account => account.id), ['new', 'same', 'old', 'invalid', 'missing']);
assert.equal(accounts[0].id, 'missing');
console.log('PASS: pending accounts sorted newest first, unknown dates last, input unchanged.');