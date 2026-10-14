const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { loadAttendanceRange, mergeAttendanceRows, mergeAttendanceDailyRows, completeAttendanceDailyRows, summarizeAttendanceDays, RANGE_AUTO_PAGE_LIMIT } = require('../lib/attendance-range-loader');
const page = (n, nextCursor) => ({ rows: [{ type: 'Read aloud', total: n, feedback: n, within: n }], scanned: n, nextCursor, fetchedAt: new Date().toISOString() });
(async () => {
  let rows = [], scanned = 0, calls = 0, active = 0;
  await loadAttendanceRange({ after: null, shouldStop: () => false,
    fetchPage: async after => {
      assert.equal(active++, 0, 'Requests must be sequential');
      const index = after ? Number(after) : 0;
      calls++; await Promise.resolve(); active--;
      return page(index === 12 ? 3 : 5, index === 12 ? null : String(index + 1));
    }, onPage: result => { rows = mergeAttendanceRows(rows, result.rows); scanned += result.scanned; } });
  assert.equal(calls, 13); assert.equal(scanned, 63); assert.equal(rows[0].total, 63);
  let stopped = false, cursor = null;
  await loadAttendanceRange({ after: null, shouldStop: () => stopped, fetchPage: async () => page(5, 'next'),
    onPage: result => { cursor = result.nextCursor; stopped = true; } });
  assert.equal(cursor, 'next');
  await loadAttendanceRange({ after: cursor, shouldStop: () => false, fetchPage: async after => { assert.equal(after, 'next'); return page(2, null); }, onPage: result => { cursor = result.nextCursor; } });
  assert.equal(cursor, null);
  let pages = 0;
  await loadAttendanceRange({ after: null, shouldStop: () => false, fetchPage: async () => page(5, String(++pages)), onPage: () => {} });
  assert.equal(pages, RANGE_AUTO_PAGE_LIMIT);
  await assert.rejects(loadAttendanceRange({ after: 'same', shouldStop: () => false, fetchPage: async () => page(5, 'same'), onPage: () => assert.fail('Must not double count') }));
  await assert.rejects(loadAttendanceRange({ after: null, shouldStop: () => false, fetchPage: async () => { throw new Error('network'); }, onPage: () => assert.fail() }), /network/);
  assert.throws(() => mergeAttendanceRows(rows, []), /Phân công/);
  assert.deepEqual(mergeAttendanceRows([], []), []);
  const daily = mergeAttendanceDailyRows([{ date: '2026-09-10', type: 'RA', total: 10, feedback: 3, within: 2 }], [
    { date: '2026-09-10', type: 'RA', total: 5, feedback: 2, within: 1 },
    { date: '2026-09-11', type: 'RA', total: 2, feedback: 0, within: 0 },
    { date: '2026-09-10', type: 'RS', total: 4, feedback: 1, within: 1 },
  ]);
  assert.deepEqual(daily[0], { date: '2026-09-10', type: 'RA', total: 15, feedback: 5, within: 3 });
  const complete = completeAttendanceDailyRows(daily, ['RA', 'RS', 'RA'], '2026-09-10', '2026-09-12');
  assert.equal(complete.length, 6);
  assert.deepEqual(complete[5], { date: '2026-09-12', type: 'RS', total: 0, feedback: 0, within: 0 });
  assert.equal(completeAttendanceDailyRows([], ['RA'], '2026-12-31', '2027-01-02').length, 3);
  assert.deepEqual(summarizeAttendanceDays(complete), { passed: 0, failed: 2, noSubmissions: 1, total: 3 });
  const dayRows = completeAttendanceDailyRows([
    { date: '2026-09-10', type: 'RA', total: 10, feedback: 3, within: 0 },
    { date: '2026-09-10', type: 'RS', total: 4, feedback: 2, within: 0 },
    { date: '2026-09-11', type: 'RA', total: 10, feedback: 9, within: 9 },
    { date: '2026-09-11', type: 'RS', total: 10, feedback: 2, within: 2 },
    { date: '2026-09-12', type: 'RA', total: 4, feedback: 2, within: 0 },
    { date: '2026-09-13', type: 'RS', total: 10001, feedback: 3000, within: 0 },
  ], ['RA', 'RS'], '2026-09-10', '2026-09-14');
  assert.deepEqual(summarizeAttendanceDays(dayRows), { passed: 2, failed: 2, noSubmissions: 1, total: 5 });
  assert.deepEqual(summarizeAttendanceDays([]), { passed: 0, failed: 0, noSubmissions: 0, total: 0 });
  const splitDay = mergeAttendanceDailyRows([
    { date: '2026-09-10', type: 'RA', total: 5, feedback: 0, within: 0 },
  ], [{ date: '2026-09-10', type: 'RA', total: 5, feedback: 3, within: 0 }]);
  assert.equal(summarizeAttendanceDays(splitDay).passed, 1, 'Evaluate days after merging all pages');
  console.log('PASS: 63 records / 13 sequential pages, totals, pause/resume, bounded reads, repeated cursor, failures and assignment changes.');
})().catch(error => { console.error(error); process.exitCode = 1; });