const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const records = Array.from({ length: 25 }, (_, i) => ({ id: `hw-${String(i).padStart(2, '0')}`, date: i < 22 ? '2026-10-01' : '2026-10-02', userId: 'student', submissions: [{ type: 'RA' }] }));
records.push({ id: 'before', date: '2026-09-30', submissions: [{ type: 'RA' }] }, { id: 'after', date: '2026-10-03', submissions: [{ type: 'RA' }] });
let actor = { id: 'admin', role: 'admin' };
class AccessError extends Error { constructor(message, status = 403) { super(message); this.status = status; } }
function query() {
  let rows = [...records], limit = Infinity;
  const order = [];
  return {
    limit(value) { limit = value; return this; },
    where(field, op, value) { rows = rows.filter(row => op === '==' ? row[field] === value : op === '>=' ? row[field] >= value : row[field] <= value); return this; },
    orderBy(field, direction = 'asc') { order.push([field, direction]); return this; },
    startAfter(...values) {
      rows = rows.filter(row => {
        for (let i = 0; i < order.length; i++) {
          const [field, direction] = order[i];
          if (row[field] !== values[i]) return direction === 'desc' ? row[field] < values[i] : row[field] > values[i];
        }
        return false;
      });
      return this;
    },
    async get() {
      const dateOrder = order.find(([field]) => field === 'date');
      const idOrder = order.find(([field]) => field === 'id');
      if (dateOrder && idOrder) {
        assert.equal(idOrder[1], dateOrder[1], 'Range pagination must use the default date index document ID direction');
      }
      rows.sort((a, b) => { for (const [field, direction] of order) { const cmp = a[field].localeCompare(b[field]); if (cmp) return direction === 'desc' ? -cmp : cmp; } return 0; });
      const docs = rows.slice(0, limit).map(row => ({ id: row.id, data: () => row }));
      return { docs, size: docs.length };
    },
  };
}
const mocks = {
  'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
  'firebase-admin/firestore': { FieldPath: { documentId: () => 'id' } },
  '@/lib/server/firebase-admin': { adminDb: () => ({ collection: () => query() }) },
  '@/lib/server/access': { currentAccount: async () => actor, AccessError, apiError: error => ({ status: error.status || 500, body: { error: error.message } }) },
  '@/lib/learning-access': { canFeedback: (user, type) => user.role === 'admin' || user.assignedFeedbackTypes?.includes(type) },
  '@/lib/homework-links': {},
};
const source = fs.readFileSync(path.join(root, 'app/api/learning/homework/route.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
new Function('require', 'exports', 'module', compiled)(name => mocks[name] || require(name), loaded.exports, loaded);
const get = params => loaded.exports.GET(new Request(`http://localhost/api/learning/homework?${new URLSearchParams(params)}`));
(async () => {
  const range = { startDate: '2026-10-01', endDate: '2026-10-02', paged: '1' };
  const first = await get(range);
  assert.equal(first.status, 200);
  assert.equal(first.body.homework.length, 20);
  assert.equal(first.body.homework[0].date, range.endDate);
  assert.deepEqual(first.body.homework.slice(0, 3).map(row => row.id), ['hw-24', 'hw-23', 'hw-22']);
  const second = await get({ ...range, after: first.body.nextCursor });
  assert.equal(second.body.homework.length, 5);
  assert.equal(second.body.nextCursor, null);
  assert.equal(new Set([...first.body.homework, ...second.body.homework].map(row => row.id)).size, 25);
  assert.deepEqual([...first.body.homework, ...second.body.homework].map(row => row.id),
    Array.from({ length: 25 }, (_, i) => `hw-${String(24 - i).padStart(2, '0')}`));
  const single = await get({ ...range, startDate: range.endDate });
  assert.equal(single.body.homework.length, 3);
  for (const invalid of [
    { ...range, startDate: '2026-10-03' }, { ...range, startDate: '' },
    { ...range, startDate: '2026-02-30' }, { startDate: range.startDate },
    { ...range, date: range.startDate }, { ...range, after: 'invalid' },
    { ...range, after: JSON.stringify({ date: '2026-09-30', id: 'before' }) },
  ]) assert.equal((await get(invalid)).status, 400);
  const legacy = await get({ date: range.startDate, paged: '1' });
  assert.equal(legacy.body.homework.length, 20);
  assert.equal((await get({ date: range.startDate, paged: '1', after: legacy.body.nextCursor })).body.homework.length, 2);
  for (const role of ['teacher', 'assistant']) {
    actor = { id: role, role, assignedFeedbackTypes: ['RA'] };
    const staffFirst = await get(range);
    assert.equal(staffFirst.status, 200);
    assert.equal(staffFirst.body.homework.length, 20);
    const staffSecond = await get({ ...range, after: staffFirst.body.nextCursor });
    assert.equal(staffSecond.body.homework.length, 5);
    assert.equal(new Set([...staffFirst.body.homework, ...staffSecond.body.homework].map(row => row.id)).size, 25);
    actor.assignedFeedbackTypes = ['WFD'];
    assert.equal((await get(range)).body.homework.length, 0);
    actor.assignedFeedbackTypes = [];
    assert.equal((await get(range)).body.nextCursor, null);
  }
  actor = { id: 'other-student', role: 'student' };
  assert.equal((await get(range)).body.homework.length, 0);
  actor = { id: 'support', role: 'admin_support' };
  assert.equal((await get(range)).body.homework.length, 20);
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const uiMocks = {
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/components/LearningGate': { useLearningAccount: () => actor },
    '@/components/ui': {
      Card: ({ children, ...props }) => React.createElement('section', props, children),
      Button: ({ children, variant, ...props }) => React.createElement('button', props, children),
      Input: props => React.createElement('input', props),
    },
    '@/lib/learning-access': { EXERCISE_TYPES: ['RA', 'WFD'], canEditFeedback: user => user.role === 'admin' },
    '@/lib/attendance-audit': { vietnamDate: () => '2026-10-02' },
    '@/lib/learning-api': {}, '@/lib/homework-links': {
      parseHomeworkLinks: link => /^https:\/\//.test(link) ? [{ url: link }] : [{ error: 'Invalid link' }],
    },
  };
  const uiSource = fs.readFileSync(path.join(root, 'components/FeedbackWorkspace.tsx'), 'utf8');
  const uiCompiled = ts.transpileModule(uiSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const uiLoaded = { exports: {} };
  new Function('require', 'exports', 'module', uiCompiled)(name => uiMocks[name] || require(name), uiLoaded.exports, uiLoaded);
  for (const role of ['admin', 'admin_support', 'teacher', 'assistant', 'student']) {
    actor = { id: role, role, assignedFeedbackTypes: ['WFD', 'RA'] };
    const html = renderToStaticMarkup(React.createElement(uiLoaded.exports.default));
    assert.equal((html.match(/type="date"/g) || []).length, role === 'student' ? 1 : 2);
    if (role !== 'student') { assert.match(html, /Ngày nộp từ ngày/); assert.match(html, /Đến ngày/); }
    assert.equal((html.match(/value="2026-10-02"/g) || []).length, role === 'student' ? 1 : 2);
    if (role !== 'student') {
      assert.match(html, /Thống kê bài tập trong trang hiện tại/);
      assert.match(html, /Không phải tổng toàn hệ thống hay kết quả chấm công/);
      assert.match(html, /Bộ lọc bài tập/);
      assert.match(html, /aria-label="Phân trang bài tập giáo viên"/);
      assert.doesNotMatch(html, /Không có bài tập phù hợp trong trang này/);
      if (['teacher', 'assistant'].includes(role)) {
        assert.match(html, /Tổng quan giảng dạy/);
        assert.match(html, /Dạng bài được phân công/);
        assert.match(html, /href="\/dashboard\/teacher\/students"/);
        assert.match(html, /href="\/dashboard\/teacher\/attendance-guide"/);
      }
      assert.match(html, /<option selected="">WFD<\/option>/);
      assert.match(html, /<option value="pending" selected="">Chưa có<\/option>/);
    } else {
      assert.doesNotMatch(html, /value="pending" selected/);
      assert.match(html, /Thống kê bài nộp trên trang hiện tại/);
      assert.match(html, /Tìm nhận xét của bạn/);
      assert.match(html, /feedback-primary-action/);
      assert.match(html, /feedback-filters/);
      assert.equal((html.match(/feedback-stat flex/g) || []).length, 3);
      assert.match(html, /feedback-content-grid/);
      assert.match(html, /aria-label="Hành trình luyện tập"/);
      assert.match(html, /Vòng lặp tiến bộ/);
      assert.match(html, /feedback-title-accent/);
      assert.equal((html.match(/data-emphasis="true"/g) || []).length, 1);
      assert.match(html, /aria-label="Phân trang feedback"/);
      assert.doesNotMatch(html, /placeholder="Tên học viên"/);
    }
  }
  for (const role of ['admin', 'admin_support']) {
    actor = { id: role, role };
    const html = renderToStaticMarkup(React.createElement(uiLoaded.exports.default));
    assert.match(html, /<option selected="">RA<\/option>/);
  }
  for (const role of ['teacher', 'assistant']) {
    actor = { id: role, role, assignedFeedbackTypes: [] };
    const html = renderToStaticMarkup(React.createElement(uiLoaded.exports.default));
    assert.match(html, /Bạn chưa được admin phân công dạng bài/);
    assert.match(html, /value="pending" selected/);
  }
  actor = { id: 'student', role: 'student' };
  const homework = { id: 'test', userId: 'student', userName: 'Học viên', date: '2026-10-02', submissions: [] };
  const submission = { id: 'sub', type: 'RA', questionNumber: 1, link: 'https://example.com/submission', feedback: 'Đọc chậm hơn.\nChú ý âm cuối.', feedbackByName: 'Giáo viên' };
  const renderEditor = sub => renderToStaticMarkup(React.createElement(uiLoaded.exports.FeedbackEditor, { homework, submission: sub, onSaved: () => {} }));
  const reviewedHtml = renderEditor(submission);
  assert.match(reviewedHtml, /Nhận xét từ giáo viên/);
  assert.match(reviewedHtml, /data-feedback-status="reviewed"/);
  assert.match(reviewedHtml, /Đọc chậm hơn\.\nChú ý âm cuối\./);
  assert.match(reviewedHtml, /02\/10\/2026/);
  assert.match(reviewedHtml, /Người nhận xét: Giáo viên/);
  assert.match(reviewedHtml, /target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(reviewedHtml, /textarea|Lưu feedback|Sửa feedback cần/);
  const pendingHtml = renderEditor({ ...submission, feedback: '  ', feedbackByName: '' });
  assert.match(pendingHtml, /Bài nộp đang chờ nhận xét/);
  assert.match(pendingHtml, /data-feedback-status="pending"/);
  assert.doesNotMatch(pendingHtml, /textarea|Lưu feedback/);
  const unsafeHtml = renderEditor({ ...submission, link: 'javascript:alert(1)', feedback: '<script>alert(1)</script>' });
  assert.doesNotMatch(unsafeHtml, /href="javascript:|<script>/);
  assert.match(unsafeHtml, /Liên kết bài nộp không hợp lệ/);
  actor = { id: 'admin', role: 'admin' };
  const adminHtml = renderEditor(submission);
  assert.match(adminHtml, /textarea/);
  assert.match(adminHtml, /Lưu feedback/);
  assert.doesNotMatch(adminHtml, /feedback-primary-action|data-feedback-status/);
  const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
  assert.match(css, /--feedback-accent: #fc5d01;/);
  assert.match(css, /--feedback-background: linear-gradient\(to right, #ffffff, #fedac2\);/);
  assert.match(css, /--feedback-surface: #ffffff;/);
  assert.match(css, /--feedback-warm-surface: #fedac2;/);
  assert.match(css, /\.student-feedback \.feedback-primary-action\s*\{[^}]*background: var\(--feedback-accent\);/);
  assert.match(css, /\.student-feedback \.ui-button.feedback-primary-action:hover\s*\{[^}]*background: var\(--primary-light\);/);
  const dashboardHeader = fs.readFileSync(path.join(root, 'app/dashboard/components/WelcomeHeader.tsx'), 'utf8');
  assert.ok(dashboardHeader.includes('from-white to-[#fedac2]'));
  assert.ok(dashboardHeader.includes('text-[#fc5d01]'));
  const dashboardHomework = fs.readFileSync(path.join(root, 'app/dashboard/components/DailyHome.tsx'), 'utf8');
  assert.ok(dashboardHomework.includes('bg-[#fc5d01] text-white'));
  assert.ok(dashboardHomework.includes('hover:bg-[#fd7f33]'));
  for (const token of ['--feedback-warm-surface:', '--feedback-featured-surface:', '--feedback-page-background:']) assert.ok(css.includes(token));
  assert.match(css, /background: var\(--feedback-featured-surface\);/);
  assert.match(css, /\.student-feedback \.feedback-stat p\s*\{\s*@apply text-gray-800;/);
  for (const token of ['--feedback-glow:', '--feedback-glow-strong:', '--feedback-focus-shadow:', '--feedback-glass:', '--feedback-blur:']) assert.ok(css.includes(token));
  assert.match(css, /\.student-feedback \.ui-button:disabled\s*\{\s*box-shadow: none;/);
  assert.match(css, /\.student-feedback \.ui-button:focus-visible/);
  console.log('PASS: date ranges, pagination, permissions, student filters, read-only feedback, pending state, safe content and staff editor preserved.');
})().catch(error => { console.error(error); process.exitCode = 1; });