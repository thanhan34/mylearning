const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { staffFeedbackDefaultRange, vietnamDate } = require('../lib/attendance-audit');
for (const [today, start, end] of [
  ['2026-11-01', '2026-10-21', '2026-11-01'],
  ['2026-11-20', '2026-10-21', '2026-11-20'],
  ['2026-11-21', '2026-10-21', '2026-11-20'],
  ['2027-01-05', '2026-12-21', '2027-01-05'],
  ['2028-03-01', '2028-02-21', '2028-03-01'],
]) assert.deepEqual(staffFeedbackDefaultRange(today), { start, end });
assert.equal(vietnamDate(new Date('2026-10-31T17:00:00Z')), '2026-11-01');
console.log('PASS: staff default date range, month/year boundaries and Vietnam time.');