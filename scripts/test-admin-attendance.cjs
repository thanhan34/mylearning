const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
function load(relative, mockEnabled = true) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', code)(name =>
    name === '@/components/ui' ? load('components/ui/index.tsx', mockEnabled)
      : name === '@/lib/mock/config' ? { MOCK_ENABLED: mockEnabled }
      : name === '@/components/FeedbackWorkspace' ? { default: () => React.createElement('div', null, 'Shared feedback workspace') }
      : name === '@/components/AttendanceAudit' ? { default: () => React.createElement('div', null, 'Shared attendance audit') } : require(name), module.exports, module);
  return module.exports;
}
const Preview = load('components/AdminSupportPreview.tsx').default;
const admin = renderToStaticMarkup(React.createElement(Preview, { initialTab: 'attendance', audience: 'admin' }));
const support = renderToStaticMarkup(React.createElement(Preview, { initialTab: 'attendance' }));
for (const html of [admin, support]) {
  for (const text of ['Shared attendance audit', 'Chấm công &amp; chi tiết']) {
    assert.ok(html.includes(text), text);
  }
}
assert.ok(!admin.includes('Không có quyền đổi vai trò'));
assert.ok(!admin.includes('Xác nhận công mẫu'));
const defaultView = renderToStaticMarkup(React.createElement(Preview));
assert.ok(defaultView.includes('pending@mock.local'), 'Support default remains student approval');
const disabled = renderToStaticMarkup(React.createElement(load('components/AdminSupportPreview.tsx', false).default));
assert.ok(disabled.includes('Bản xem thử duyệt học viên chỉ có trong chế độ mock'));
assert.ok(!disabled.includes('Xác nhận công mẫu'));
const productionAudit = renderToStaticMarkup(React.createElement(load('components/AdminSupportPreview.tsx', false).default, { initialTab: 'attendance' }));
assert.ok(productionAudit.includes('Shared attendance audit'));
const dashboard = fs.readFileSync(path.join(root, 'app/dashboard/admin/components/AdminDashboardClient.tsx'), 'utf8');
assert.ok(dashboard.includes("account?.role !== 'admin'"));
assert.ok(dashboard.includes("{ value: 'attendance', label: 'Chấm công',"));
assert.ok(dashboard.includes('<AdminSupportPreview initialTab="attendance" audience="admin" />'));
console.log('PASS: shared admin/support audit, admin tab, role guard, mock approval and live audit availability.');