// Boundary-only fixtures: no SDK initialization, credentials, Firebase RPC or network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const baseline = 'a4872e0a78a0fe67781e6dbc0e22d1859c9eb021';
const routeFile = 'app/api/learning/records/route.ts';
const clientFile = 'components/StudentRecords.tsx';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const old = file => execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root, encoding: 'utf8' });
const wire = value => JSON.parse(JSON.stringify(value));
const flush = async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); };
function load(source, imports) {
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  }, reportDiagnostics: true });
  assert.equal(compiled.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  new Function('require', 'exports', 'module', 'FormData', compiled.outputText)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unmocked runtime import: ${name}`); return imports[name];
  }, module.exports, module, class FormData { get() { return 'Saved feedback'; } });
  return module.exports;
}
function fixture(count = 100, distinct = false, legacy = false) {
  const records = {}, users = {};
  for (let i = 0; i < count; i++) {
    const studentId = `s${distinct ? i : i % 5}`;
    users[studentId] = { role: 'student', name: `Current ${studentId}`, email: `${studentId}@example.test` };
    records[`r${String(i).padStart(3, '0')}`] = {
      studentId, link: 'https://example.test/result', feedback: i % 3 ? '' : 'Reviewed',
      ...(legacy && i % 2 ? { date: `2026-09-${String(i % 28 + 1).padStart(2, '0')}` }
        : { submittedAt: { toDate: () => new Date('2026-10-01T18:00:00Z') } }),
      ...(legacy && i % 3 ? {} : { studentName: `Original ${studentId}` }),
      extraLegacyField: { retained: true },
    };
  }
  users.staff = { role: 'teacher', name: 'Must not resolve as student' };
  return { records, users };
}
function server(source, data = fixture()) {
  const metrics = { requests: 0, queries: 0, getCalls: 0, documentResults: 0, studentResults: 0, studentQueries: 0, fullLists: 0, writes: 0 };
  let actor = { id: 'admin', role: 'admin', name: 'Admin' }, failWrite = false, failGet = false, beforeCommit, queue = Promise.resolve();
  class AccessError extends Error { constructor(message, status = 403) { super(message); this.status = status; } }
  const snapshot = (id, source) => ({ id, exists: Object.hasOwn(source, id), data: () => source[id] && { ...source[id] } });
  const db = {
    collection(name) {
      assert.ok(['users', 'mocktests'].includes(name)); const source = name === 'users' ? data.users : data.records;
      const query = (filters = [], limit = Infinity) => ({
        where: (field, op, value) => { assert.equal(op, '=='); return query([...filters, [field, value]], limit); },
        limit: size => query(filters, size),
        async get() {
          metrics.queries++; if (failGet) throw Error('Read failed');
          if (name === 'users') metrics.studentQueries++; else metrics.fullLists++;
          const docs = Object.keys(source).filter(id => filters.every(([f, v]) => source[id][f] === v))
            .slice(0, limit).map(id => snapshot(id, source));
          metrics.documentResults += docs.length; if (name === 'users') metrics.studentResults += docs.length;
          return { docs };
        },
      });
      return { ...query(), doc: id => ({ id, async update(changes) {
        if (failWrite) throw Error('Write failed');
        if (!source[id]) throw Error('Missing record'); Object.assign(source[id], changes); metrics.writes++;
      } }), async add(record) { if (failWrite) throw Error('Write failed'); source.new = record; metrics.writes++; } };
    },
    runTransaction(callback) {
      // Serial mock commits model same-document contention without fabricating billing.
      const run = queue.then(async () => {
        let staged = [];
        const tx = { get: async ref => {
          metrics.getCalls++; if (failGet) throw Error('Read failed');
          const doc = snapshot(ref.id, data.records); if (doc.exists) metrics.documentResults++; return doc;
        }, update: (ref, changes) => staged.push([ref.id, changes]) };
        let result = await callback(tx);
        if (beforeCommit) { const change = beforeCommit; beforeCommit = undefined; change(data); staged = []; result = await callback(tx); }
        if (failWrite) throw Error('Commit failed');
        for (const [id, changes] of staged) { Object.assign(data.records[id], changes); metrics.writes++; }
        return result;
      });
      queue = run.catch(() => {}); return run;
    },
  };
  const api = load(source, {
    'node:crypto': require('node:crypto'),
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body: wire(body), status: options.status || 200 }) } },
    'firebase-admin/firestore': { Timestamp: { now: () => ({ toDate: () => new Date('2026-10-15T00:00:00Z') }) } },
    '@/lib/server/firebase-admin': { adminDb: () => db },
    '@/lib/server/access': { AccessError, checkOrigin: request => { if (request.headers.get('origin') === 'https://evil.test') throw new AccessError('Origin'); },
      currentAccount: async () => { if (!actor) throw new AccessError('Login', 401); return { ...actor }; },
      apiError: error => ({ status: error.status || 500, body: { error: error.message } }),
    },
  });
  const response = async (body, headers) => {
    metrics.requests++;
    return body ? api.POST(new Request('http://localhost/api/learning/records', { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ kind: 'mocktests', ...body }) }))
      : api.GET(new Request('http://localhost/api/learning/records?kind=mocktests'));
  };
  return { data, metrics, response, actor: value => { actor = value; }, fail: value => { failWrite = value; },
    failRead: value => { failGet = value; }, retry: fn => { beforeCommit = fn; },
    request: async (_url, options) => { const result = await response(options && JSON.parse(options.body));
      if (result.status !== 200) throw Error(result.body.error); return result.body; } };
}
function client(source, request, initialActor = { id: 'admin', role: 'admin' }) {
  let actor = initialActor, states = [], refs = [], effects = [], index, refIndex, tree, cleanup;
  const jsx = (type, props, key) => ({ type, props, key });
  const Component = load(source, {
    react: { useState: initial => { const i = index++; if (!(i in states)) states[i] = initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
      useRef: value => refs[refIndex++] ||= { current: value }, useCallback: fn => fn,
      useEffect: fn => effects.push(fn) },
    'react/jsx-runtime': { jsx, jsxs: jsx }, './ui': { Button: 'Button', Card: 'Card', Input: 'Input' },
    './LearningGate': { useLearningAccount: () => actor }, '@/lib/learning-api': { learningApi: request },
    './StudentMocktests': { default: 'StudentMocktests' }, './TeacherMocktests': { default: 'TeacherMocktests' },
    'next/navigation': { usePathname: () => actor.role === 'admin' ? '/dashboard/mocktest/admin' : '/dashboard/mocktest/teacher' },
  }).default;
  function render() {
    index = refIndex = 0; effects = []; tree = Component({ kind: 'mocktests' });
    if (typeof tree.type === 'function') { assert.equal(tree.key, `${actor.id}:${actor.role}:mocktests`); tree = tree.type(tree.props); }
    return tree;
  }
  function find(predicate, node = tree) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) { const found = find(predicate, child); if (found) return found; } return; }
    return predicate(node) ? node : node.props?.children === undefined ? undefined : find(predicate, node.props.children);
  }
  function saveHandler(id = 'r000') {
    render(); const card = find(n => n.type === 'Card' && n.key === id);
    return find(n => n.type === 'form', card).props.onSubmit;
  }
  const submit = handler => handler({ preventDefault() {}, currentTarget: null });
  return { states: () => states, render, find, saveHandler, submit,
    async mount() { render(); cleanup = effects[0](); await flush(); render(); },
    refresh() { render(); return find(n => n.type === 'Button' && n.props.children === 'Tải lại').props.onClick(); },
    unmount() { cleanup(); }, async switchAccount(next) { cleanup(); actor = next; states = []; refs = []; await this.mount(); } };
}
const withoutVersion = records => records.map(({ recordVersion, ...record }) => record);
const selection = (records, students, search) => records.filter(r => `${r.studentName || students.find(s => s.id === r.studentId)?.name || ''} ${r.studentId}`.toLowerCase().includes(search.toLowerCase()))
  .sort((a, b) => (b.date || b.submittedAt || '').localeCompare(a.date || a.submittedAt || ''));
async function main() {
  const route = read(routeFile), component = read(clientFile);
  for (const legacy of [false, true]) {
    const before = server(old(routeFile), fixture(100, false, legacy)), after = server(route, fixture(100, false, legacy));
    const a = (await before.response()).body, b = (await after.response()).body;
    assert.deepEqual(withoutVersion(b.records), a.records);
    for (const search of ['', 'original', 'current', 's1', 'missing', ' CURRENT ']) {
      assert.deepEqual(withoutVersion(selection(b.records, b.students, search)), selection(a.records, a.students, search));
    }
    assert.equal(after.metrics.studentQueries, legacy ? 1 : 0);
  }
  const data = fixture(12, false, true);
  data.records.r001.studentId = 'deleted';
  data.records.r002.studentId = 'staff'; delete data.records.r002.studentName;
  data.records.r003.studentId = { malformed: true };
  delete data.records.r004.studentId; delete data.records.r004.submittedAt; delete data.records.r004.date;
  const s = server(route, data), legacy = (await server(old(routeFile), data).response()).body;
  const initial = (await s.response()).body;
  assert.deepEqual(withoutVersion(initial.records), legacy.records, 'Missing/malformed records remain present');
  assert.deepEqual(initial.students, legacy.students, 'Legacy role-filtered fallback unchanged');
  assert.equal(initial.records.find(r => r.id === 'r001').submittedAt, null);
  assert.equal(initial.records.find(r => r.id === 'r000').submittedAt, '2026-10-01T18:00:00.000Z');
  for (const role of ['teacher', 'assistant', 'student', 'admin_support']) {
    s.actor({ id: 's1', role }); const result = await s.response();
    assert.equal(result.status, 200); assert.ok(result.body.records.every(r => r.studentId === 's1'));
    assert.deepEqual(result.body.students, []);
    assert.equal((await s.response({ id: 'r000', feedback: 'Forbidden' })).status, 403);
    if (role !== 'student') assert.equal((await s.response({ link: 'https://example.test' })).status, 403);
  }
  s.actor(null); assert.equal((await s.response()).status, 401); assert.equal((await s.response({ id: 'r000', feedback: '' })).status, 401);
  s.actor({ id: 'admin', role: 'admin', name: 'Trusted Admin' });
  assert.equal((await s.response({ id: 'r000', feedback: '' }, { origin: 'https://evil.test' })).status, 403);
  const unrelated = wire(data.records.r001), record = initial.records[0];
  const body = { id: record.id, feedback: 'Confirmed', expectedVersion: record.recordVersion, teacherId: 'forged', record: { studentName: 'forged' } };
  s.fail(true); assert.equal((await s.response(body)).status, 500); assert.equal(data.records.r000.feedback, 'Reviewed');
  s.fail(false); s.retry(d => { d.records.r000.link = 'https://example.test/concurrent'; });
  const saved = await s.response(body);
  assert.equal(saved.status, 200); assert.equal(saved.body.record.link, 'https://example.test/concurrent');
  assert.equal(saved.body.record.feedbackByName, 'Trusted Admin'); assert.equal(saved.body.record.teacherId, 'admin');
  assert.equal(saved.body.record.studentName, record.studentName); assert.ok(saved.body.record.extraLegacyField.retained);
  assert.deepEqual(wire(data.records.r001), unrelated);
  assert.equal((await s.response(body)).status, 409, 'Stale feedback must not overwrite');
  const next = { id: record.id, expectedVersion: saved.body.record.recordVersion };
  const results = await Promise.all([s.response({ ...next, feedback: 'A' }), s.response({ ...next, feedback: 'B' })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal((await s.response({ id: 'missing', feedback: '' })).status, 404);
  assert.equal((await s.response({ id: 'r000', feedback: '', expectedVersion: 'invalid' })).status, 400);
  s.failRead(true); assert.equal((await s.response()).status, 500); s.failRead(false);
  s.actor({ id: 's1', role: 'student', name: 'Student' });
  assert.equal((await s.response({ link: 'https://example.test/new' })).status, 200);
  assert.equal(data.records.new.studentId, 's1');
  for (const link of ['javascript:alert(1)', 'not a url']) assert.equal((await s.response({ link })).status, 400);

  const backend = server(route); const c = client(component, backend.request); await c.mount();
  let resolveGet, resolvePost, posts = 0;
  const initialList = (await backend.response()).body;
  const race = client(component, (url, options) => options ? (posts++, new Promise(resolve => { resolvePost = resolve; }))
    : resolveGet === undefined ? Promise.resolve(initialList) : new Promise(resolve => { resolveGet = resolve; }));
  await race.mount(); const original = race.states()[0][0], unchanged = race.states()[0][1];
  resolveGet = true; const refresh = race.refresh(); const handler = race.saveHandler(); race.submit(handler);
  race.submit(handler); assert.equal(posts, 1); assert.equal(race.states()[0][0].feedback, original.feedback);
  assert.equal(await race.refresh(), false, 'Refresh blocked during mutation');
  resolvePost({ success: true, record: { ...original, feedback: 'Saved feedback', recordVersion: 'next' } }); await flush();
  resolveGet(initialList); await refresh; await flush();
  assert.equal(race.states()[0][0].feedback, 'Saved feedback'); assert.strictEqual(race.states()[0][1], unchanged);
  race.render(); assert.equal(race.find(n => n.type === 'textarea').props.defaultValue, 'Saved feedback');
  const failed = client(component, async (_url, options) => { if (options) throw Error('Save failed'); return initialList; });
  await failed.mount(); const beforeFailure = failed.states()[0]; failed.submit(failed.saveHandler()); await flush();
  assert.strictEqual(failed.states()[0], beforeFailure); assert.equal(failed.states()[4], 'Save failed');
  let pending;
  const isolated = client(component, async (_url, options) => options ? new Promise(resolve => { pending = resolve; }) : initialList);
  await isolated.mount(); isolated.submit(isolated.saveHandler()); isolated.unmount();
  const stateAtUnmount = [...isolated.states()]; pending({ success: true, record: { ...original, feedback: 'late' } }); await flush();
  assert.deepEqual(isolated.states(), stateAtUnmount, 'Unmount ignores mutation result');
  const scoped = client(component, async () => initialList); await scoped.mount();
  await scoped.switchAccount({ id: 's1', role: 'teacher' });
  assert.equal(scoped.render().type, 'TeacherMocktests'); assert.equal(scoped.states()[4], '');
  let finishOldGet, finishOldPost, switched = false, deferGet = false;
  const switchRace = client(component, (_url, options) => {
    if (switched) return Promise.resolve({ records: [{ id: 'private', studentId: 's2' }], students: [] });
    if (options) return new Promise(resolve => { finishOldPost = resolve; });
    if (deferGet) return new Promise(resolve => { finishOldGet = resolve; });
    return Promise.resolve(initialList);
  });
  await switchRace.mount(); deferGet = true; const oldGet = switchRace.refresh();
  switchRace.submit(switchRace.saveHandler()); switched = true;
  await switchRace.switchAccount({ id: 's2', role: 'teacher' });
  finishOldPost({ success: true, record: { ...original, feedback: 'Another account' } });
  finishOldGet(initialList); await oldGet; await flush();
  assert.deepEqual(switchRace.states()[0], [{ id: 'private', studentId: 's2' }], 'Neither old GET nor mutation crosses account boundary');
  assert.equal(switchRace.states()[4], ''); switchRace.unmount();
  let rejectGet = false;
  const failedLoad = client(component, async () => { if (rejectGet) throw Error('Refresh failed'); return initialList; });
  await failedLoad.mount(); const retained = failedLoad.states()[0]; rejectGet = true;
  assert.equal(await failedLoad.refresh(), false); assert.strictEqual(failedLoad.states()[0], retained); failedLoad.unmount();
  c.unmount(); race.unmount(); failed.unmount(); scoped.unmount();

  const benchmarks = [];
  for (const count of [100, 500]) for (const distinct of [false, true]) for (const legacy of [false, true]) {
    const row = { count, distinct, legacy };
    for (const [label, routeSource, source] of [['before', old(routeFile), old(clientFile)], ['after', route, component]]) {
      const b = server(routeSource, fixture(count, distinct, legacy)); const ui = client(source, b.request);
      await ui.mount(); const open = { ...b.metrics }; ui.submit(ui.saveHandler()); await flush(); await flush();
      row[label] = { initial: open, feedback: Object.fromEntries(Object.keys(open).map(k => [k, b.metrics[k] - open[k]])) };
      assert.equal(ui.states()[0][0].feedback, 'Saved feedback'); ui.unmount();
    }
    assert.equal(row.after.feedback.requests, 1); assert.equal(row.after.feedback.fullLists, 0);
    assert.equal(row.after.feedback.documentResults, 1); assert.equal(row.before.feedback.requests, 2);
    assert.equal(row.after.initial.documentResults, legacy ? row.before.initial.documentResults : count);
    benchmarks.push(row);
  }
  console.log('PASS: Mocktest route authorization, legacy/date/name/ID parity, missing and malformed records, write failure, transaction retry, concurrent CAS, local mutation, stale GET, account-scoped remount and unmount guards.');
  console.log(JSON.stringify({ baseline, benchmarks, disclaimer: 'Module-only HTTP and mock document results; excludes LearningGate/actor/session lookups, backend retries/index reads and billing. No production access.' }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });