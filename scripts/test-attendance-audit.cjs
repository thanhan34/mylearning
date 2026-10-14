const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const root = path.resolve(__dirname, '..');
const audit = require('../lib/attendance-audit');
const { execute } = require('../lib/mock/engine');
const { mockAdminDb, MockQuery } = require('../lib/mock/adapter');
let actor = { id: 'admin', role: 'admin' };
let reads = [];
const originalGet = MockQuery.prototype.get;
MockQuery.prototype.get = function () { reads.push({ path: this.path, type: this.type, constraints: this.constraints }); return originalGet.call(this); };
class AccessError extends Error { constructor(message, status = 403) { super(message); this.status = status; } }
const mocks = {
  'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
  'firebase-admin/firestore': { FieldPath: { documentId: () => '__name__' } },
  '@/lib/server/firebase-admin': { adminDb: () => mockAdminDb },
  '@/lib/server/access': { currentAccount: async () => { if (!actor) throw new AccessError('Login', 401); return actor; }, AccessError, apiError: error => ({ status: error.status || 500, error: error.message }) },
  '@/lib/attendance-audit': audit,
};
const mod = { exports: {} };
const source = fs.readFileSync(path.join(root, 'app/api/learning/attendance/route.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function('require', 'exports', 'module', code)(name => mocks[name] || require(name), mod.exports, mod);
async function get(params) {
  reads = [];
  const result = await mod.exports.GET(new Request(`http://localhost/api/learning/attendance?${new URLSearchParams(params)}`));
  for (const read of reads.filter(read => read.type === 'collection')) assert.ok(read.constraints.some(c => c.kind === 'limit' && c.value <= 11), 'Every collection read must have a bounded limit');
  return result;
}
const base = { type: 'Read aloud', questionNumber: 1, date: '2026-09-10', link: 'https://example.com', feedback: 'Clear advice', feedbackBy: 'audit-teacher', feedbackAt: '2026-09-13T16:59:59.999Z' };
(async () => {
  for (const [date, deadline] of [['2026-09-05', '2026-09-08'], ['2026-09-10', '2026-09-13'], ['2026-09-15', '2026-09-18'], ['2026-09-17', '2026-09-20'], ['2026-09-18', '2026-09-20'], ['2026-09-20', '2026-09-20'], ['2026-09-21', '2026-09-24'], ['2026-12-31', '2027-01-03'], ['2028-02-27', '2028-03-01']]) assert.equal(audit.auditWindow(date).deadlineDate, deadline);
  assert.equal(audit.auditWindow('2026-09-21').start, '2026-09-21');
  assert.equal(audit.auditWindow('2026-09-21').end, '2026-10-20');
  assert.equal(audit.feedbackTiming(base, 'audit-teacher', base.date), 'within');
  assert.equal(audit.feedbackTiming({ ...base, feedbackAt: '2026-09-13T17:00:00Z' }, 'audit-teacher', base.date), 'late');
  assert.equal(audit.feedbackTiming({ ...base, feedbackAt: '2026-09-17T16:59:59.999Z' }, 'audit-teacher', base.date), 'late');
  for (const staffId of ['audit-teacher', 'audit-assistant']) {
    const submission = { ...base, feedbackBy: staffId };
    assert.equal(audit.feedbackTiming(submission, staffId, base.date), 'within');
    assert.equal(audit.feedbackTiming({ ...submission, feedbackAt: '2026-09-13T17:00:00Z' }, staffId, base.date), 'late');
    assert.equal(audit.feedbackTiming({ ...submission, feedbackAt: '2026-09-20T16:59:59.999Z' }, staffId, '2026-09-18'), 'within');
    assert.equal(audit.feedbackTiming({ ...submission, feedbackAt: '2026-09-20T17:00:00Z' }, staffId, '2026-09-18'), 'late');
    const group = audit.summarizeAudit([submission, { ...submission, feedbackAt: '2026-09-14T00:00:00+07:00' }], ['Read aloud'], staffId, base.date)[0];
    assert.equal(group.within, 1);
    assert.equal(group.late, 1);
  }
  assert.equal(audit.feedbackTiming({ ...base, feedbackAt: '2026-09-10T12:00:00' }, 'audit-teacher', base.date), 'unknown');
  assert.equal(audit.feedbackTiming({ ...base, feedbackAt: '2026-09-01T12:00:00Z' }, 'audit-teacher', base.date), 'unknown');
  assert.equal(audit.feedbackTiming({ ...base, feedbackBy: '' }, 'audit-teacher', base.date), 'unknown');
  assert.equal(audit.feedbackTiming(base, 'other', base.date), 'other');
  assert.equal(audit.feedbackTiming({ ...base, feedback: '  ' }, 'audit-teacher', base.date), 'missing');
  assert.equal(audit.summarizeAudit(Array(4).fill(base), ['Read aloud'], 'audit-teacher', base.date)[0].minimum, 2);
  assert.deepEqual(audit.summarizeAudit([base], ['Repeat sentence'], 'audit-teacher', base.date), []);
  const writes = [{ kind: 'set', path: 'users/audit-teacher', data: { role: 'teacher', name: 'Audit teacher', assignedFeedbackTypes: ['Read aloud'] } }];
  // Isolate route fixtures from the rolling 45-day demo dataset.
  execute({ kind: 'read', ref: { path: 'users', type: 'collection' } });
  global.__learningMockStore.documents = {};
  for (let i = 0; i < 12; i++) writes.push({ kind: 'set', path: `users/audit-staff-${i}`, data: { role: 'assistant', name: `Staff ${i}`, secret: 'SECRET' } });
  for (let i = 0; i < 7; i++) writes.push({ kind: 'set', path: `homework/audit-${i}`, data: { date: base.date, userId: `student-${i}`, userName: `Student ${i}`, secret: 'SECRET', submissions: Array.from({ length: 25 }, (_, index) => ({ ...base, id: `sub-${index}`, questionNumber: index + 1, secret: 'SECRET' })) } });
  execute({ kind: 'commit', writes });
  for (const role of ['admin', 'admin_support']) {
    actor = { id: role, role };
    const staff = await get({ mode: 'staff' });
    assert.equal(staff.status, 200); assert.equal(staff.body.staff.length, 10); assert.ok(staff.body.nextCursor);
    assert.equal(reads.length, 1);
    const staffNext = await get({ mode: 'staff', after: staff.body.nextCursor });
    assert.ok(staffNext.body.staff.every(s => !staff.body.staff.some(first => first.id === s.id)));
    const day = await get({ mode: 'day', date: base.date, staffId: 'audit-teacher' });
    assert.equal(day.status, 200); assert.equal(day.body.homework.length, 5); assert.ok(day.body.nextCursor);
    assert.equal(reads.length, 2); assert.equal(reads[1].constraints.find(c => c.kind === 'limit').value, 6);
    assert.ok(!JSON.stringify(day.body).includes('Clear advice'), 'No feedback body before opening details');
    assert.ok(!JSON.stringify(day.body).includes('SECRET'));
    const next = await get({ mode: 'day', date: base.date, staffId: 'audit-teacher', after: day.body.nextCursor });
    assert.equal(next.body.homework.length, 2); assert.equal(next.body.nextCursor, null);
    assert.ok(next.body.homework.every(h => !day.body.homework.some(first => first.id === h.id)));
    const detailParams = { mode: 'detail', date: base.date, staffId: 'audit-teacher', documentId: day.body.homework[0].id, version: day.body.homework[0].version, type: 'Read aloud' };
    const detail = await get(detailParams);
    assert.equal(detail.status, 200); assert.equal(detail.body.submissions.length, 20); assert.equal(detail.body.hasNext, true); assert.equal(reads.length, 2);
    assert.ok(!JSON.stringify(detail.body).includes('SECRET'));
    const second = await get({ ...detailParams, page: '1' });
    assert.equal(second.body.submissions.length, 5); assert.equal(second.body.hasNext, false); assert.equal(second.body.submissions[0].id, 'sub-20');
    assert.equal((await get({ ...detailParams, page: '2' })).status, 400);
    assert.equal((await get({ ...detailParams, version: '0'.repeat(64) })).status, 409);
    assert.equal((await get({ ...detailParams, type: 'Repeat sentence' })).status, 409);
    assert.equal((await get({ mode: 'day', date: '2026-09-11', staffId: 'audit-teacher', after: day.body.nextCursor })).status, 400);
  }
  for (const role of ['admin', 'admin_support']) {
    actor = { role };
    const params = { mode: 'range', staffId: 'audit-teacher', start: base.date, end: base.date };
    const first = await get(params);
    assert.equal(first.status, 200);
    assert.equal(first.body.scanned, 5);
    assert.equal(first.body.rows[0].total, 125);
    assert.equal(first.body.rows[0].feedback, 125);
    assert.equal(first.body.rows[0].within, 125);
    assert.deepEqual(first.body.dailyRows, [{ date: base.date, type: 'Read aloud', total: 125, feedback: 125, within: 125 }]);
    assert.ok(first.body.nextCursor);
    const next = await get({ ...params, after: first.body.nextCursor });
    assert.equal(next.body.rows[0].total, 50);
    assert.equal(next.body.dailyRows[0].total, 50);
    assert.equal(next.body.nextCursor, null);
    assert.equal((await get({ ...params, end: '2026-09-11', after: first.body.nextCursor })).status, 400);
    assert.equal((await get({ ...params, start: '2026-08-01' })).status, 400);
    assert.equal((await get({ ...params, start: '2026-09-11' })).status, 400);
    const empty = await get({ ...params, start: '2020-01-01', end: '2020-01-02' });
    assert.equal(empty.body.rows[0].total, 0);
    assert.deepEqual(empty.body.dailyRows, []);
    assert.equal(empty.body.nextCursor, null);
  }
  execute({ kind: 'commit', writes: [
    { kind: 'set', path: 'users/audit-daily-assistant', data: { role: 'assistant', assignedFeedbackTypes: ['Read aloud', 'Repeat sentence'] } },
    { kind: 'set', path: 'homework/daily-types', data: { date: '2026-09-12', userId: 'daily-student', submissions: [
      { ...base, feedbackBy: 'audit-daily-assistant', feedbackAt: '2026-09-13T00:00:00+07:00' },
      { ...base, feedbackBy: 'audit-daily-assistant', feedbackAt: '2026-09-16T00:00:00+07:00' },
      { ...base, feedbackBy: 'someone-else' },
      { ...base, type: 'Repeat sentence', feedback: '' },
    ] } },
  ] });
  for (const role of ['admin', 'admin_support']) {
    actor = { role };
    const result = await get({ mode: 'range', staffId: 'audit-daily-assistant', start: '2026-09-11', end: '2026-09-12' });
    assert.deepEqual(result.body.dailyRows, [
      { date: '2026-09-12', type: 'Read aloud', total: 3, feedback: 2, within: 1 },
      { date: '2026-09-12', type: 'Repeat sentence', total: 1, feedback: 0, within: 0 },
    ]);
    assert.ok(!JSON.stringify(result.body).includes('Clear advice'));
  }
  for (const params of [{ mode: 'day', date: '2026-02-30', staffId: 'audit-teacher' }, { mode: 'day', date: base.date, staffId: 'a/b' }, { mode: 'staff', after: '' }, { mode: 'unknown' }]) {
    assert.equal((await get(params)).status, 400); assert.equal(reads.length, 0);
  }
  for (const role of ['teacher', 'assistant', 'student', 'unknown']) {
    actor = { role };
    for (const mode of ['staff', 'day', 'detail', 'range']) { assert.equal((await get({ mode })).status, 403); assert.equal(reads.length, 0); }
  }
  actor = null; assert.equal((await get({ mode: 'staff' })).status, 401);
  const ui = fs.readFileSync(path.join(root, 'components/AttendanceAudit.tsx'), 'utf8');
  assert.ok(ui.includes('cachedRequest<T>(key, TTL')); assert.ok(ui.includes('attendance:${actor.id}:${actor.role}'));
  assert.ok(!ui.includes('onSnapshot')); assert.ok(!source.includes('.offset('));
  assert.ok(ui.includes('chưa xác nhận ngày công'));
  console.log('PASS: deadlines, timing, role access, bounded cursor reads, lazy paginated details, privacy, stale versions and cache boundaries.');
})().catch(error => { console.error(error); process.exitCode = 1; });