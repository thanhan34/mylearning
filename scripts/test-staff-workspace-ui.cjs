const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
let actor;
function load(file) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true,
  });
  assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const loaded = { exports: {} };
  const mocks = {
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/components/LearningGate': { useLearningAccount: () => actor },
    '@/lib/learning-access': { EXERCISE_TYPES: ['RA'], canEditFeedback: () => true },
    '@/lib/learning-api': {},
    '@/lib/homework-links': { parseHomeworkLinks: () => [] },
    '@/lib/attendance-audit': { vietnamDate: () => '2026-10-04' },
  };
  new Function('require', 'exports', 'module', compiled.outputText)(name => name === '@/components/ui' ? load('components/ui/index.tsx') : mocks[name] || require(name), loaded.exports, loaded);
  return loaded.exports;
}
const { default: Workspace, FeedbackEditor } = load('components/FeedbackWorkspace.tsx');
for (const [role, label] of [['teacher', 'Giảng viên'], ['assistant', 'Trợ giảng']]) {
  actor = { id: role, role, name: 'Demo', assignedFeedbackTypes: ['RA'] };
  const html = renderToStaticMarkup(React.createElement(Workspace));
  assert.match(html, /sm:py-6 staff-workspace/);
  assert.ok(html.includes(label));
  assert.equal((html.match(/staff-workspace-stat /g) || []).length, 4);
  assert.match(html, /staff-workspace-assignment/);
  assert.match(html, /Đang tải bài tập/);
  assert.match(html, /staff-hero-illustration/);
  assert.match(html, /aria-label="Lọc nhanh trạng thái feedback"/);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  assert.match(html, /Dữ liệu trong trang hiện tại/);
  assert.match(html, /Không phải tổng toàn hệ thống hay kết quả chấm công/);
  assert.match(html, /href="\/dashboard\/teacher\/students"/);
  for (const feedback of ['', 'Good work']) {
    const card = renderToStaticMarkup(React.createElement(FeedbackEditor, {
      homework: { id: 'hw', userName: 'Learner', date: '2026-10-04' },
      submission: { id: 'sub', type: 'RA', questionNumber: 1, link: '', feedback },
      onSaved: () => {},
    }));
    assert.ok(card.includes(`data-status="${feedback ? 'reviewed' : 'pending'}"`));
    assert.match(card, /disabled=""/);
  }
}
for (const role of ['admin', 'admin_support', 'student']) {
  actor = { id: role, role, assignedFeedbackTypes: ['RA'] };
  const html = renderToStaticMarkup(React.createElement(Workspace));
  assert.doesNotMatch(html, /sm:py-6 staff-workspace/);
  assert.doesNotMatch(html, /staff-workspace-badge/);
  assert.doesNotMatch(html, /Lọc nhanh trạng thái feedback|staff-hero-illustration/);
}
console.log('Staff workspace UI checks passed (roles, stats, loading, feedback status, disabled save).');