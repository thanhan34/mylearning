const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '..');
function load(file, imports) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
  });
  assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  new Function('require', 'exports', 'module', compiled.outputText)(name => {
    if (Object.hasOwn(imports, name)) return imports[name];
    return require(name);
  }, module.exports, module);
  return module.exports;
}

const access = load('lib/learning-access.ts', {});
const approved = { id: 'student', role: 'student', approvalStatus: 'approved' };
function render({ account = null, ready = false, error = '', status = 'authenticated', pathname = '/dashboard' } = {}) {
  const states = [account, ready, error, 0];
  let stateIndex = 0;
  const { default: LearningGate } = load('components/LearningGate.tsx', {
    react: { ...React, useState: () => [states[stateIndex++], () => {}], useEffect: () => {} },
    'next-auth/react': { useSession: () => ({ data: null, status }), signOut: async () => {} },
    'firebase/auth': { signOut: async () => {} },
    '@/app/firebase/config': { auth: { currentUser: null } },
    '@/lib/learning-access': access,
    '@/lib/learning-api': { learningApi: async () => { throw new Error('Unexpected API call during render'); } },
    '@/lib/client-cache': { invalidateCache: () => {} },
    'next/navigation': { usePathname: () => pathname },
    '@/components/ui': {
      Card: ({ children, ...props }) => React.createElement('div', props, children),
      Button: ({ children, variant, ...props }) => React.createElement('button', props, children),
    },
  });
  return renderToStaticMarkup(React.createElement(LearningGate, null,
    React.createElement('div', null, 'Protected dashboard content')));
}

for (const status of ['loading', 'authenticated', 'unauthenticated']) {
  assert.equal(render({ status }), '', `Account checking must be invisible for ${status}`);
}
assert.equal(render({ account: approved }), '', 'Do not mount content until account checking is ready');
assert.equal(render({ ready: true }), '', 'Do not mount content without an account');
assert.match(render({ ready: true, account: approved }), /Protected dashboard content/);
const pending = render({ ready: true, account: { ...approved, approvalStatus: 'pending' } });
assert.match(pending, /Tài khoản đang chờ duyệt/);
assert.match(pending, /Kiểm tra lại/);
assert.match(pending, /Đăng xuất/);
assert.doesNotMatch(pending, /Protected dashboard content/);
const error = render({ error: 'Connection failed' });
assert.match(error, /Không thể tải tài khoản/);
assert.match(error, /Connection failed/);
assert.match(error, /Kiểm tra lại/);
assert.doesNotMatch(error, /Protected dashboard content/);
assert.doesNotMatch(render({ ready: true, account: approved, error: 'Refresh failed' }), /Protected dashboard content/);
for (const pathname of ['/dashboard/admin', '/dashboard/teacher', '/dashboard/assistant', '/dashboard/class']) {
  const denied = render({ ready: true, account: approved, pathname });
  assert.match(denied, /Bạn không có quyền truy cập trang này/);
  assert.doesNotMatch(denied, /Protected dashboard content/);
}
console.log('PASS: silent account checking, approval, error handling and protected route access.');