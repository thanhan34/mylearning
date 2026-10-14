const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
function load(file) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true,
  });
  assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  new Function('require', 'exports', 'module', compiled.outputText)(name => {
    if (name === 'next/link') return { default: ({ children, ...props }) => React.createElement('a', props, children) };
    if (name === 'next/image') return { default: ({ priority, ...props }) => React.createElement('img', props) };
    if (name === './ui') return load('components/ui/index.tsx');
    return require(name);
  }, module.exports, module);
  return module.exports;
}
const { default: Navigation, isStudentNavActive } = load('components/StudentNavigation.tsx');
const routes = ['','/assignments','/homework-feedback','/mocktest','/submissions','/guides'].map(route => `/dashboard${route}`);
const items = routes.map(href => ({ href, label: href, icon: React.createElement('span') }));
for (const route of routes) {
  const html = renderToStaticMarkup(React.createElement(Navigation, {
    items, pathname: route, name: 'Học viên kiểm thử', email: 'student@example.com', onLogout: async () => {},
  }));
  for (const href of routes) assert.equal(html.split(`href="${href}"`).length - 1, href === '/dashboard' ? 3 : 2);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 2, 'One active link per responsive navigation');
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="student-mobile-navigation"/);
  assert.match(html, /id="student-mobile-navigation" hidden=""/);
  assert.ok(html.includes('Hồ sơ của Học viên kiểm thử'));
  assert.ok(html.includes('Đăng xuất'));
}
assert.equal(isStudentNavActive('/dashboard/assignments/123', '/dashboard/assignments'), true);
assert.equal(isStudentNavActive('/dashboard/assignments', '/dashboard'), false);
assert.equal(isStudentNavActive('/dashboard/mocktest-other', '/dashboard/mocktest'), false);
const source = fs.readFileSync(path.join(root, 'app/components/Navigation.tsx'), 'utf8');
assert.match(source, /if \(account\?\.role === 'student'\)\s*\{\s*return <StudentNavigation/);
console.log('PASS: all student destinations, active subroutes, profile, logout, closed mobile menu and student-only integration.');