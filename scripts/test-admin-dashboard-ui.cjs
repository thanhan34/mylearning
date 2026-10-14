const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
let actor = { id: 'admin', role: 'admin', name: 'Admin' };
let states = null, index = 0;
const stub = label => ({ default: () => React.createElement('div', null, label) });
function load(file) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true,
  });
  assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  const mocks = {
    react: { ...React, useState: initial => states ? [states[index++], () => {}] : React.useState(initial) },
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/components/LearningGate': { useLearningAccount: () => actor },
    '@/components/AccountManagement': stub('Account panel'),
    '@/components/FeedbackWorkspace': stub('Feedback panel'),
    '@/components/AdminSupportPreview': stub('Attendance panel'),
    './DailyTargetSettings': stub('Targets panel'),
    '@/lib/learning-api': {},
    '@/lib/learning-access': { EXERCISE_TYPES: ['Read aloud', 'Repeat sentence'] },
  };
  new Function('require', 'exports', 'module', compiled.outputText)(name => name === '@/components/ui' ? load('components/ui/index.tsx') : mocks[name] || require(name), module.exports, module);
  return module.exports;
}
const Dashboard = load('app/dashboard/admin/components/AdminDashboardClient.tsx').default;
const Accounts = load('components/AccountManagement.tsx').default;
function render(Component, values) { states = values; index = 0; return renderToStaticMarkup(React.createElement(Component)); }
for (const [tab, panel] of [['accounts', 'Account panel'], ['feedback', 'Feedback panel'], ['targets', 'Targets panel'], ['attendance', 'Attendance panel']]) {
  const html = render(Dashboard, [tab]);
  assert.match(html, /Trung tâm quản trị/);
  assert.match(html, /href="\/dashboard\/teacher\/students"/);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  assert.equal((html.match(/aria-controls="admin-workspace"/g) || []).length, 4);
  assert.match(html, /aria-label="Điều hướng quản trị"/);
  assert.ok(html.includes(`aria-labelledby="admin-section-${tab}"`));
  assert.ok(html.includes(`id="admin-section-${tab}"`));
  assert.match(html, /Không gian quản lý/);
  assert.match(html, /admin-workspace-heading/);
  assert.match(html, /admin-primary-action/);
  assert.match(html, /admin-secondary-action/);
  assert.match(html, /<details class="admin-management-menu" open="">/);
  assert.match(html, /<summary class="admin-menu-toggle">/);
  assert.match(html, /viewBox="0 0 280 200"/);
  assert.equal((html.match(/class="admin-section-icon"/g) || []).length, 4);
  assert.equal((html.match(/Đang xem/g) || []).length, 1);
  assert.match(html, /04 mục/);
  assert.ok(html.includes(`<h2 class="text-lg font-semibold tracking-tight text-gray-900">${{ accounts: 'Tài khoản &amp; phân quyền', feedback: 'Bài tập &amp; feedback', targets: 'Mục tiêu hàng ngày', attendance: 'Chấm công' }[tab]}</h2>`));
  assert.ok(html.includes(panel));
}
for (const role of ['student', 'teacher', 'assistant', 'admin_support']) {
  actor = { role };
  assert.match(render(Dashboard, ['accounts']), /role="alert"/);
  assert.doesNotMatch(render(Dashboard, ['accounts']), /Account panel/);
}
const accounts = [{ id: 's', role: 'student', name: 'Learner', email: 's@example.com', approvalStatus: 'pending' }];
let html = render(Accounts, [accounts, 'pending', '', '', '', false, '']);
assert.match(html, /Duyệt học viên/);
assert.match(html, /Thống kê tài khoản đã tải/);
assert.match(html, /Learner/);
assert.match(html, /Tìm theo tên hoặc email/);
assert.match(html, /account-filters/);
assert.match(html, /account-record/);
assert.equal((html.match(/account-stat-value/g) || []).length, 3);
assert.match(html, /account-status-pending/);
assert.match(html, /account-avatar/);
const mixedAccounts = [
  ...accounts,
  { id: 'approved', role: 'student', name: 'Approved learner', email: 'approved@example.com', approvalStatus: 'approved' },
  { id: 'teacher', role: 'teacher', name: 'Teacher', email: 'teacher@example.com', assignedFeedbackTypes: ['Read aloud'] },
  { id: 'assistant', role: 'assistant', name: 'Assistant', email: 'assistant@example.com', assignedFeedbackTypes: [] },
];
html = render(Accounts, [mixedAccounts, 'students', '', '', '', false, '']);
assert.match(html, /account-status-approved/);
assert.match(html, /Approved learner/);
assert.doesNotMatch(html, /teacher@example.com/);
assert.equal((html.match(/>Duyệt học viên<\/button>/g) || []).length, 1);
assert.equal((html.match(/account-stat-value[^>]*>2<\/p>/g) || []).length, 2);
html = render(Accounts, [mixedAccounts, 'staff', '', '', '', false, '', ['Read aloud'], []]);
assert.match(html, /teacher@example.com/);
assert.match(html, /assistant@example.com/);
assert.doesNotMatch(html, />Duyệt học viên<\/button>/);
assert.match(html, /Lưu phân công/);
assert.match(html, /account-status-staff/);
html = render(Accounts, [accounts, 'pending', '', 's', '', false, '']);
assert.match(html, /aria-busy="true"/);
assert.match(html, /Đang lưu/);
assert.match(html, /disabled=""/);
html = render(Accounts, [[], 'pending', '', '', '', true, '']);
assert.match(html, /Đang tải tài khoản/);
assert.doesNotMatch(html, /Không có tài khoản phù hợp/);
html = render(Accounts, [[], 'pending', '', '', '', false, 'Network error']);
assert.match(html, /role="alert"/);
assert.match(html, /Thử lại/);
assert.doesNotMatch(html, /Không có tài khoản phù hợp/);
html = render(Accounts, [accounts, 'pending', 'missing', '', '', false, '']);
assert.match(html, /Không có tài khoản phù hợp/);
assert.match(html, /Xóa tìm kiếm/);
actor = { role: 'admin', name: '<Admin & team>' };
assert.match(render(Dashboard, ['accounts']), /&lt;Admin &amp; team&gt;/);
actor = { role: 'admin' };
assert.doesNotMatch(render(Dashboard, ['accounts']), /undefined/);
actor = null;
assert.match(render(Dashboard, ['accounts']), /Không có quyền truy cập/);
const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
for (const token of ['--admin-action-background:', '--admin-action-shadow:', '--admin-border:', '--admin-radius:']) assert.ok(css.includes(token));
assert.match(css, /\.admin-dashboard-navigation\s*\{\s*position: sticky;/);
assert.match(css, /max-height: calc\(100dvh - 184px\)/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /--admin-page-background: #fcfcfd/);
assert.match(css, /--admin-action-background: #fc5d01/);
assert.match(css, /\.admin-management-menu:not\(\[open\]\) > div/);
const layout = fs.readFileSync(path.join(root, 'app/dashboard/DashboardLayoutClient.tsx'), 'utf8');
assert.match(layout, /account\?\.role === 'admin'/);
assert.match(layout, /MOCK DATA · Dữ liệu chỉ nằm trong bộ nhớ server local/);
assert.match(layout, /1440|admin-app-shell/);
console.log('PASS: admin-only dashboard, four panels, labelled workspace, active navigation, safe greeting, account statistics and loading/error/search states.');