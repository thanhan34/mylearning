// Accounts-only boundary mocks: no credentials, network, or production SDK initialization.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const baseline = 'a4872e0a78a0fe67781e6dbc0e22d1859c9eb021';
const routePath = 'app/api/learning/accounts/route.ts';
const componentPath = 'components/AccountManagement.tsx';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const old = file => execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root, encoding: 'utf8' });
function load(source, imports) {
  const exports = {};
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, Date, Set, console, window: { confirm: () => true },
    require: name => { assert.ok(Object.hasOwn(imports, name), `Unmocked import: ${name}`); return imports[name]; } });
  return exports;
}
const access = load(read('lib/learning-access.ts'), {});
function fixture() {
  const entries = { admin: { role: 'admin', email: 'admin@example.com' } };
  for (let i = 0; i < 100; i++) entries[`random-${String(i).padStart(3, '0')}`] = {
    role: 'student', email: `learner${i}@example.com`, name: i === 99 ? 'GLOBAL Needle' : `Learner ${i}`,
    ...(i % 4 === 0 ? { approvalStatus: 'pending', classId: 'legacy-class' }
      : i % 4 === 1 ? { approvalStatus: 'approved' }
        : i % 4 === 2 ? { teacherId: 'teacher' } : {}),
  };
  entries.teacher = { role: 'teacher', email: 'teacher@example.com', assignedFeedbackTypes: [] };
  entries.assistant = { role: 'assistant', email: 'assistant@example.com' };
  entries.support = { role: 'admin_support', email: 'support@example.com' };
  entries.rejected = { role: 'student', email: 'rejected@example.com', approvalStatus: 'rejected', teacherId: 'teacher' };
  entries['a_b@example_com'] = { role: 'student', email: 'a.b@example.com', classId: 'class' };
  return entries;
}
function server(source) {
  const data = fixture();
  const metrics = { queryCalls: 0, documentResults: 0, requests: 0, fullLists: 0 };
  let actor = { id: 'admin', role: 'admin' }, retry = false, commitFail = false;
  class AccessError extends Error { constructor(message, status = 403) { super(message); this.status = status; } }
  const snap = id => ({ id, exists: !!data[id], data: () => data[id] && { ...data[id] } });
  const db = { collection: name => { assert.equal(name, 'users'); return {
    doc: id => ({ id }), where: (field, operator, value) => {
      assert.equal(field, 'role'); assert.equal(operator, '=='); assert.equal(value, 'student');
      return { get: async () => { metrics.queryCalls++;
        const docs = Object.keys(data).sort().filter(id => data[id].role === value).map(snap);
        metrics.documentResults += docs.length; return { docs }; } };
    }, get: async () => { metrics.queryCalls++; metrics.fullLists++;
      const docs = Object.keys(data).sort().map(snap); metrics.documentResults += docs.length; return { docs }; },
  }; }, runTransaction: async callback => {
    let writes;
    const run = async () => { writes = []; return callback({ get: async ref => {
      metrics.queryCalls++; metrics.documentResults++; return snap(ref.id);
    }, update: (ref, changes) => writes.push([ref.id, changes]) }); };
    let value = await run();
    if (retry) { retry = false; data['random-000'].name = 'Concurrent authoritative name'; value = await run(); }
    if (commitFail) throw Error('Commit failed');
    for (const [id, changes] of writes) Object.assign(data[id], changes);
    return value;
  } };
  const api = load(source, {
    'next/server': { NextResponse: { json: body => body } },
    '@/lib/server/firebase-admin': { adminDb: () => db },
    '@/lib/server/access': { currentAccount: async () => {
      metrics.queryCalls++; metrics.documentResults++;
      if (!actor) throw new AccessError('Login', 401); return actor;
    }, AccessError, checkOrigin: () => {}, apiError: error => ({ error: error.message, status: error.status || 500 }) },
    '@/lib/learning-access': access,
  });
  return { data, metrics, api, actor(value) { actor = value; }, retry() { retry = true; }, fail() { commitFail = true; },
    async request(_path, options) { metrics.requests++; const result = options
      ? await api.PATCH({ json: async () => JSON.parse(options.body) }) : await api.GET();
      if (result.error) throw Error(result.error); return result; } };
}
function client(source, request, props = {}) {
  const states = [], refs = [], effects = [];
  let index = 0, refIndex = 0, tree;
  const jsx = (type, props) => ({ type, props });
  const Component = load(source, {
    react: { useState: initial => { const i = index++; if (!(i in states)) states[i] = initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
      useRef: value => refs[refIndex++] ||= { current: value }, useCallback: fn => fn,
      useEffect: fn => effects.push(fn) },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/components/ui': { Button: 'Button', Card: 'Card', Input: 'Input', Tabs: 'Tabs' },
    '@/lib/learning-access': access, '@/lib/learning-api': { learningApi: request },
    'react-icons/ri': Object.fromEntries(['RiTeamLine', 'RiTimeLine', 'RiShieldUserLine', 'RiRefreshLine', 'RiSearchLine'].map(name => [name, name])),
  }).default;
  function render() { index = 0; refIndex = 0; effects.length = 0; tree = Component(props); return tree; }
  function find(predicate, node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) { const found = find(predicate, child); if (found) return found; } return; }
    if (predicate(node)) return node;
    return find(predicate, node.props?.children);
  }
  render();
  return { states, render, find: predicate => find(predicate, tree), async mount() { const cleanup = effects[0](); await flush(); render(); return cleanup; },
    approvalHandler() { render(); return find(n => n.type === 'Button' && ['Duyệt học viên', 'Đang lưu...'].includes(n.props.children), tree).props.onClick; },
    approve() { return this.approvalHandler()(); },
    refresh() { render(); return find(n => n.type === 'Button' && Array.isArray(n.props.children) && n.props.children.includes(' Tải lại danh sách'), tree).props.onClick(); } };
}
async function flush() { for (let i = 0; i < 30; i++) await Promise.resolve(); }
async function main() {
  const s = server(read(routePath));
  const initial = await s.api.GET();
  const byId = id => initial.accounts.find(a => a.id === id);
  assert.equal(initial.accounts.length, 106);
  for (const [id, status] of [['random-000', 'pending'], ['random-001', 'approved'], ['random-002', 'approved'], ['random-003', 'pending'], ['rejected', 'pending'], ['a_b@example_com', 'approved']]) assert.equal(byId(id).approvalStatus, status);
  assert.equal(byId('a_b@example_com').email, 'a.b@example.com');
  const oldList = await server(old(routePath)).api.GET();
  assert.equal(JSON.stringify(initial), JSON.stringify(oldList), 'Global ordering, roles, legacy statuses and all records preserved');
  const patch = body => s.api.PATCH({ json: async () => body });
  s.retry();
  const approved = await patch({ id: 'random-000', action: 'approve' });
  assert.equal(approved.account.name, 'Concurrent authoritative name');
  assert.equal(approved.account.approvalStatus, 'approved');
  const assigned = await patch({ id: 'teacher', action: 'assign-types', types: ['Read aloud', 'Read aloud'] });
  assert.equal(JSON.stringify(assigned.account.assignedFeedbackTypes), JSON.stringify(['Read aloud']));
  const role = await patch({ id: 'random-000', action: 'role', role: 'teacher' });
  assert.equal(role.account.role, 'teacher');
  const student = await patch({ id: 'random-000', action: 'role', role: 'student' });
  assert.equal(student.account.approvalStatus, 'pending');
  assert.equal((await patch({ id: 'teacher', action: 'assign-types', types: ['Invalid'] })).status, 400);
  assert.equal((await patch({ id: 'admin', action: 'role', role: 'student' })).status, 400);
  assert.equal((await patch({ id: 'random-000', action: 'reject' })).status, 400, 'No new rejection business action');
  assert.equal((await patch({ id: 'missing', action: 'approve' })).status, 404);
  assert.equal((await patch({ id: 'users/id', action: 'approve' })).status, 400);
  const granted = await patch({ id: 'teacher', action: 'role', role: 'admin_support' });
  assert.equal(granted.account.role, 'admin_support');
  assert.deepEqual(Array.from(granted.account.assignedFeedbackTypes), []);
  const revoked = await patch({ id: 'teacher', action: 'role', role: 'teacher' });
  assert.equal(revoked.account.role, 'teacher');
  assert.equal((await patch({ id: 'support', action: 'role', role: 'admin' })).status, 400);
  assert.equal((await patch({ id: 'admin', action: 'role', role: 'admin_support' })).status, 400);
  s.actor({ id: 'support', role: 'admin_support' });
  const supportList = await s.api.GET();
  assert.equal(supportList.accounts.length, 102);
  assert.ok(supportList.accounts.every(account => account.role === 'student'));
  const supportApproval = await patch({ id: 'random-000', action: 'approve', role: 'admin', types: ['Read aloud'] });
  assert.equal(supportApproval.account.approvalStatus, 'approved');
  assert.equal(s.data['random-000'].approvedBy, 'support');
  assert.ok(Number.isFinite(Date.parse(s.data['random-000'].approvedAt)));
  assert.equal(s.data['random-000'].role, 'student', 'Extra fields must not grant roles');
  for (const body of [
    { id: 'random-000', action: 'role', role: 'admin_support' },
    { id: 'support', action: 'role', role: 'admin' },
    { id: 'teacher', action: 'assign-types', types: ['Read aloud'] },
    { id: 'teacher', action: 'approve' },
    { id: 'admin', action: 'approve' },
    { id: 'support', action: 'approve' },
  ]) assert.equal((await patch(body)).status, 403);
  s.data.support.role = 'teacher';
  assert.equal((await patch({ id: 'random-003', action: 'approve' })).status, 403, 'Recheck support permissions inside transaction');
  s.data.support.role = 'admin_support';
  s.actor({ id: 'admin', role: 'admin' }); s.data.admin.role = 'admin_support';
  assert.equal((await patch({ id: 'teacher', action: 'role', role: 'admin_support' })).status, 403, 'Demoted admin cannot change roles');
  s.data.admin.role = 'admin';
  for (const role of ['student', 'teacher', 'assistant']) {
    s.actor({ id: 'other', role }); assert.equal((await s.api.GET()).status, 403);
    assert.equal((await patch({ id: 'random-000', action: 'approve' })).status, 403);
  }
  s.actor(null); assert.equal((await s.api.GET()).status, 401);
  s.actor({ id: 'admin', role: 'admin' }); s.data.admin.role = 'teacher';
  assert.equal((await patch({ id: 'random-000', action: 'approve' })).status, 403);
  s.data.admin.role = 'admin'; s.data['random-000'].approvalStatus = 'pending'; s.fail();
  assert.equal((await patch({ id: 'random-000', action: 'approve' })).status, 500);
  assert.equal(s.data['random-000'].approvalStatus, 'pending', 'Failure must not approve locally/server-side');

  const results = {};
  for (const [label, source, route] of [['before', old(componentPath), old(routePath)], ['after', read(componentPath), read(routePath)]]) {
    const backend = server(route), c = client(source, backend.request);
    await c.mount(); const open = { ...backend.metrics };
    await c.approve(); await flush();
    assert.equal(c.states[0].find(a => a.id === 'random-000').approvalStatus, 'approved');
    c.states[1] = 'students'; c.states[2] = 'needle'; c.render();
    assert.equal(c.states[0].filter(a => `${a.name} ${a.email}`.toLowerCase().includes('needle')).length, 1);
    assert.equal(c.states[0].filter(a => a.role === 'student').length, 102, 'Counts cover full fixture');
    results[label] = { open, approval: Object.fromEntries(Object.keys(open).map(key => [key, backend.metrics[key] - open[key]])) };
  }
  const backend = server(read(routePath)); let resolveMutation, resolveList;
  const c = client(read(componentPath), async (p, options) => options
    ? new Promise(resolve => { resolveMutation = resolve; })
    : resolveList ? new Promise(resolve => { resolveList = resolve; }) : backend.request(p));
  const cleanup = await c.mount();
  const approve = c.approvalHandler();
  resolveList = true; const refresh = c.refresh();
  const mutation = approve();
  const unchanged = c.states[0].find(a => a.id === 'random-000');
  assert.equal(unchanged.approvalStatus, 'pending', 'No optimistic approval');
  await approve(); // saving guard prevents duplicate mutation
  resolveMutation({ success: true, account: { ...unchanged, approvalStatus: 'approved' } }); await mutation;
  resolveList({ accounts: initial.accounts }); await refresh;
  assert.equal(c.states[0].find(a => a.id === 'random-000').approvalStatus, 'approved', 'Stale GET cannot overwrite mutation');
  const second = c.approve(); cleanup();
  const stateBeforeCleanup = JSON.stringify(c.states);
  resolveMutation({ success: true, account: { ...unchanged, approvalStatus: 'approved' } }); await second;
  assert.equal(JSON.stringify(c.states), stateBeforeCleanup, 'Old/unmounted account screen cannot accept late mutation');
  assert.equal(results.after.approval.fullLists, 0);
  const adminClient = client(read(componentPath), server(read(routePath)).request);
  await adminClient.mount();
  assert.ok(adminClient.find(n => n.type === 'option' && n.props.value === 'admin_support'));
  adminClient.states[1] = 'staff'; adminClient.render();
  assert.ok(adminClient.find(n => n.type === 'p' && n.props.children === 'support@example.com'), 'Support appears in staff list');
  const supportBackend = server(read(routePath)); supportBackend.actor({ id: 'support', role: 'admin_support' });
  const supportClient = client(read(componentPath), supportBackend.request, { approvalOnly: true });
  await supportClient.mount();
  assert.equal(supportClient.find(n => n.type === 'select'), undefined);
  assert.equal(supportClient.find(n => typeof n.type === 'function'), undefined, 'No staff assignment component');
  assert.ok(!supportClient.find(n => n.type === 'Tabs').props.items.some(item => item.value === 'staff'));
  await supportClient.approve(); await flush();
  assert.equal(supportClient.states[0].find(a => a.id === 'random-000').approvalStatus, 'approved');
  console.log('PASS: explicit/legacy approval, existing rejected semantics, roles/identity, authoritative transaction retry, authorization, commit failure, global search/count parity, no optimistic approval/refetch, stale GET and unmount guards.');
  console.log(JSON.stringify({ fixtureAccounts: 106, baseline, results,
    limitation: 'Pagination/search/count optimization deferred. documentResults are mock results, not billed reads; authorization modeled as one lookup.' }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });