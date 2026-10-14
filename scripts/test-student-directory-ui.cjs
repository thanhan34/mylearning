const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
let actor = { id: 'teacher', role: 'teacher' };
let state = null;
let stateIndex = 0;
const learner = { id: 'student', name: 'Nguyễn Minh An', email: 'an@example.com' };
const mocks = {
  'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
  react: { ...React, useState: initial => state ? [state[stateIndex++], () => {}] : React.useState(initial) },
  '@/components/LearningGate': { useLearningAccount: () => actor },
  '@/components/FeedbackWorkspace': { FeedbackEditor: () => React.createElement('div', { 'data-testid': 'feedback-editor' }, 'Feedback editor') },
  '@/lib/learning-api': { learningApi: async () => { throw Error('SSR should not fetch'); } },
  '@/lib/learning-access': { EXERCISE_TYPES: ['Read aloud', 'Repeat sentence'] },
};
function load(file) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true,
  });
  assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  new Function('require', 'exports', 'module', compiled.outputText)(name => name === '@/components/ui' ? load('components/ui/index.tsx') : mocks[name] || require(name), module.exports, module);
  return module.exports;
}
const { default: Directory, StudentTableRow } = load('components/StudentDirectory.tsx');
function render(values) {
  state = values || null; stateIndex = 0;
  return renderToStaticMarkup(React.createElement(Directory));
}
for (const role of ['admin', 'teacher', 'assistant']) {
  actor = { id: role, role };
  const html = render();
  assert.match(html, /Danh sách học viên/);
  assert.match(html, /Đang tải học viên/);
  assert.match(html, /Thống kê trên trang hiện tại/);
  assert.match(html, /aria-label="Phân trang"/);
  assert.doesNotMatch(html, /Không có học viên phù hợp/);
}
let html = render([null, null, [], { students: [learner], nextCursor: 'next' }, '', '', false, '']);
assert.match(html, /Nguyễn Minh An/);
assert.match(html, /an@example.com/);
assert.match(html, /Xem bài tập của Nguyễn Minh An/);
assert.match(html, /Còn học viên ở trang sau/);
assert.match(html, /<table class="directory-table">/);
assert.match(html, /scope="col">Email/);
assert.match(html, /scope="row"/);
assert.match(html, /aria-label="Điều hướng quản lý học viên"/);
assert.match(html, /href="\/dashboard\/teacher\/students" aria-current="page"/);
assert.doesNotMatch(html, /Ngày tham gia|Tạm dừng|Đang học|Chờ duyệt/);
assert.match(html, /20 học viên mỗi trang/);
assert.match(html, /Chỉ tải bài tập khi bạn chọn học viên/);
assert.match(html, /aria-label="Trang hiện tại: 1"/);
html = render([null, null, [], { students: [learner], nextCursor: null }, 'not found', '', false, '']);
assert.match(html, /Không tìm thấy học viên phù hợp/);
assert.match(html, /aria-label="Xóa tìm kiếm"/);
assert.match(html, /Xóa bộ lọc/);
html = render([null, null, [], null, '', '', false, 'Network error']);
assert.match(html, /role="alert"/);
assert.match(html, /Thử lại/);
assert.doesNotMatch(html, /Không có học viên phù hợp/);
html = render([learner, null, [], { student: learner, homework: [{ id: 'hw', submissions: [{ id: 'sub', type: 'Read aloud', feedback: 'Good' }] }], nextCursor: null }, '', '', false, '']);
assert.match(html, /Bài tập của Nguyễn Minh An/);
assert.match(html, /Lịch sử bài tập/);
assert.match(html, /data-testid="feedback-editor"/);
assert.match(html, /Dạng bài trong trang/);
for (const role of ['student', 'admin_support', 'unknown']) {
  actor = { id: role, role };
  assert.match(render(), /Chỉ giáo viên, trợ giảng và admin/);
  assert.doesNotMatch(render(), /Tên hoặc email|Thống kê trên trang/);
}
state = null;
html = renderToStaticMarkup(React.createElement('table', null, React.createElement('tbody', null, React.createElement(StudentTableRow, { student: { ...learner, name: '<script>bad</script>' }, onSelect: () => {} }))));
assert.doesNotMatch(html, /<script>/);
assert.match(html, /&lt;script&gt;/);
for (const role of ['admin', 'teacher', 'assistant']) {
  actor = { id: role, role };
  html = render([null, 'cursor', [null, 'previous'], { students: [learner], nextCursor: null }, '', '', false, '']);
  assert.match(html, /aria-label="Trang hiện tại: 3"/);
  assert.match(html, new RegExp(`href="/dashboard/${role === 'assistant' ? 'assistant' : 'teacher'}/feedback"`));
  assert.doesNotMatch(html, /href="\/dashboard\/admin/);
}
const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
assert.match(css, /grid-template-columns: 240px minmax\(0, 1fr\)/);
assert.match(css, /\.directory-table thead \{ @apply sr-only/);
assert.match(css, /--directory-page-background: #fafbfc/);
console.log('PASS: staff-only directory, semantic student table, real sidebar routes, scoped search, loading/error/detail states, escaped names and cursor pagination.');