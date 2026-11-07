const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { normalizeSearch } = require('../lib/search');
const names = ['ngọc vũ', 'Ngọc Vũ', 'Ngoc Vu', 'NGỌC VŨ', 'Ngọc  Vũ', 'Đặng Đức'];
for (const search of ['ngoc vu', 'NGỌC VŨ', '  NgOc   Vu ']) {
  assert.deepEqual(names.filter(name => normalizeSearch(name).includes(normalizeSearch(search))), names.slice(0, 5));
}
assert.ok(normalizeSearch('Đặng Đức').includes(normalizeSearch('dang duc')));
assert.ok(normalizeSearch('student-id').includes(normalizeSearch('STUDENT')));
console.log('PASS: mocktest search ignores accents, case and extra whitespace.');